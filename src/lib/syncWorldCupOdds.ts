import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ODDS_API_URL =
  "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds";

type OddsOutcome = {
  name: string;
  price: number;
};

type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

type OddsBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
};

type OddsEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
};

type ConsensusOdds = {
  home: number | null;
  draw: number | null;
  away: number | null;
  bookmakerCount: number;
};

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b/g, "")
    .replace(/\bnational team\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string) {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);

  if (left === right) return true;

  return (
    left.includes(right) ||
    right.includes(left)
  );
}

function median(values: number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const middle = Math.floor(
    sorted.length / 2
  );

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (
    (sorted[middle - 1] + sorted[middle]) /
    2
  );
}

function roundOdds(
  value: number | null
): number | null {
  if (value === null) return null;

  return Math.round(value * 100) / 100;
}

function extractConsensusOdds(
  event: OddsEvent
): ConsensusOdds {
  const homePrices: number[] = [];
  const drawPrices: number[] = [];
  const awayPrices: number[] = [];

  for (const bookmaker of event.bookmakers || []) {
    const h2h = bookmaker.markets?.find(
      (market) => market.key === "h2h"
    );

    if (!h2h) continue;

    const homeOutcome = h2h.outcomes.find(
      (outcome) =>
        teamsMatch(
          outcome.name,
          event.home_team
        )
    );

    const awayOutcome = h2h.outcomes.find(
      (outcome) =>
        teamsMatch(
          outcome.name,
          event.away_team
        )
    );

    const drawOutcome = h2h.outcomes.find(
      (outcome) =>
        normalizeTeamName(outcome.name) ===
        "draw"
    );

    if (
      homeOutcome &&
      Number.isFinite(homeOutcome.price)
    ) {
      homePrices.push(
        Number(homeOutcome.price)
      );
    }

    if (
      drawOutcome &&
      Number.isFinite(drawOutcome.price)
    ) {
      drawPrices.push(
        Number(drawOutcome.price)
      );
    }

    if (
      awayOutcome &&
      Number.isFinite(awayOutcome.price)
    ) {
      awayPrices.push(
        Number(awayOutcome.price)
      );
    }
  }

  return {
    home: roundOdds(median(homePrices)),
    draw: roundOdds(median(drawPrices)),
    away: roundOdds(median(awayPrices)),
    bookmakerCount: Math.max(
      homePrices.length,
      drawPrices.length,
      awayPrices.length
    ),
  };
}

function findMatchingStoredMatch(
  event: OddsEvent,
  storedMatches: any[]
) {
  const eventKickoff = new Date(
    event.commence_time
  ).getTime();

  const candidates = storedMatches
    .map((match) => {
      const kickoffDifference =
        Math.abs(
          new Date(
            match.scheduled_at
          ).getTime() - eventKickoff
        );

      const directTeams =
        teamsMatch(
          match.home_team_name,
          event.home_team
        ) &&
        teamsMatch(
          match.away_team_name,
          event.away_team
        );

      const reversedTeams =
        teamsMatch(
          match.home_team_name,
          event.away_team
        ) &&
        teamsMatch(
          match.away_team_name,
          event.home_team
        );

      return {
        match,
        kickoffDifference,
        directTeams,
        reversedTeams,
      };
    })
    .filter(
      (candidate) =>
        (candidate.directTeams ||
          candidate.reversedTeams) &&
        candidate.kickoffDifference <=
          12 * 60 * 60 * 1000
    )
    .sort(
      (a, b) =>
        a.kickoffDifference -
        b.kickoffDifference
    );

  return candidates[0] || null;
}

export async function syncWorldCupOdds() {
  const apiKey =
    process.env.THE_ODDS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "THE_ODDS_API_KEY is not configured."
    );
  }

  const url = new URL(ODDS_API_URL);

  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set(
    "oddsFormat",
    "decimal"
  );
  url.searchParams.set(
    "dateFormat",
    "iso"
  );

  const response = await fetch(
    url.toString(),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Odds API failed with status ${response.status}: ${text.slice(
        0,
        500
      )}`
    );
  }

  const events: OddsEvent[] =
    await response.json();

  const {
    data: storedMatches,
    error: storedMatchesError,
  } = await supabaseAdmin
    .from("world_cup_matches")
    .select(
      "id, home_team_name, away_team_name, scheduled_at"
    )
    .in("status", [
      "scheduled",
      "live",
    ]);

  if (storedMatchesError) {
    throw new Error(
      storedMatchesError.message
    );
  }

  let updatedCount = 0;

  for (const event of events) {
    const matched =
      findMatchingStoredMatch(
        event,
        storedMatches || []
      );

    if (!matched) {
      console.warn(
        `Could not match odds event: ${event.home_team} vs ${event.away_team}`
      );

      continue;
    }

    const consensus =
      extractConsensusOdds(event);

    if (
      consensus.home === null ||
      consensus.draw === null ||
      consensus.away === null
    ) {
      console.warn(
        `Incomplete 1X2 odds for: ${event.home_team} vs ${event.away_team}`
      );

      continue;
    }

    let homeOdds = consensus.home;
    let drawOdds = consensus.draw;
    let awayOdds = consensus.away;

    // Extremely defensive:
    // if the API event happens to be reversed
    // relative to our fixture table, swap home/away.
    if (matched.reversedTeams) {
      homeOdds = consensus.away;
      awayOdds = consensus.home;
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("world_cup_matches")
        .update({
          odds_home: homeOdds,
          odds_draw: drawOdds,
          odds_away: awayOdds,

          odds_updated_at:
            new Date().toISOString(),

          odds_source:
            `The Odds API median (${consensus.bookmakerCount} bookmakers)`,

          odds_external_event_id:
            event.id,
        })
        .eq("id", matched.match.id);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    updatedCount += 1;
  }

  return {
    fetchedEvents: events.length,
    updatedCount,
  };
}