import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PlayoffSeed = {
  seed: number;
  teamId: string;
  name: string;
  league: string;
  standingPoints: number;
  wins: number;
  losses: number;
  differential: number;
  gamesPlayed: number;
};

type Team = {
  id: string;
  name: string;
  league: string;
  playoff_disqualified?: boolean | null;
};

type Game = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  league: string;
  weight: number | null;
  is_forfeit?: boolean | null;
  forfeit_team_id?: string | null;
};

type PlayoffGameDefinition = {
  gameNumber: number;
  bracket: "winners" | "losers" | "finals";
  roundLabel: string;
  homeSource: string;
  awaySource: string;
};

const PLAYABLE_GAME_NUMBERS = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,

  18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,

  32, 33, 34, 35, 36, 37, 38, 39, 40,

  41, 42, 43, 44, 45, 46, 47, 48,

  49, 50, 51, 52,

  53, 54, 55, 56,

  57, 58, 59, 60,
];

export const PLAYOFF_GAME_DEFINITIONS: PlayoffGameDefinition[] = [
  {
    gameNumber: 1,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 1",
    awaySource: "BYE",
  },
  {
    gameNumber: 2,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 16",
    awaySource: "Seed 17",
  },
  {
    gameNumber: 3,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 8",
    awaySource: "Seed 25",
  },
  {
    gameNumber: 4,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 9",
    awaySource: "Seed 24",
  },
  {
    gameNumber: 5,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 4",
    awaySource: "Seed 29",
  },
  {
    gameNumber: 6,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 13",
    awaySource: "Seed 20",
  },
  {
    gameNumber: 7,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 5",
    awaySource: "Seed 28",
  },
  {
    gameNumber: 8,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 12",
    awaySource: "Seed 21",
  },
  {
    gameNumber: 9,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 11",
    awaySource: "Seed 22",
  },
  {
    gameNumber: 10,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 6",
    awaySource: "Seed 27",
  },
  {
    gameNumber: 11,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 14",
    awaySource: "Seed 19",
  },
  {
    gameNumber: 12,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 3",
    awaySource: "Seed 30",
  },
  {
    gameNumber: 13,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 10",
    awaySource: "Seed 23",
  },
  {
    gameNumber: 14,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 7",
    awaySource: "Seed 26",
  },
  {
    gameNumber: 15,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 15",
    awaySource: "Seed 18",
  },
  {
    gameNumber: 16,
    bracket: "winners",
    roundLabel: "Winners Round 1",
    homeSource: "Seed 2",
    awaySource: "BYE",
  },

  {
    gameNumber: 17,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "BYE",
    awaySource: "L G2",
  },
  {
    gameNumber: 18,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "Seed 1",
    awaySource: "W G2",
  },
  {
    gameNumber: 19,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G3",
    awaySource: "L G4",
  },
  {
    gameNumber: 20,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G3",
    awaySource: "W G4",
  },
  {
    gameNumber: 21,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G5",
    awaySource: "L G6",
  },
  {
    gameNumber: 22,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G5",
    awaySource: "W G6",
  },
  {
    gameNumber: 23,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G7",
    awaySource: "L G8",
  },
  {
    gameNumber: 24,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G7",
    awaySource: "W G8",
  },
  {
    gameNumber: 25,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G9",
    awaySource: "L G10",
  },
  {
    gameNumber: 26,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G9",
    awaySource: "W G10",
  },
  {
    gameNumber: 27,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G11",
    awaySource: "L G12",
  },
  {
    gameNumber: 28,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G11",
    awaySource: "W G12",
  },
  {
    gameNumber: 29,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G13",
    awaySource: "L G14",
  },
  {
    gameNumber: 30,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G13",
    awaySource: "W G14",
  },
  {
    gameNumber: 31,
    bracket: "losers",
    roundLabel: "Losers Round 1",
    homeSource: "L G15",
    awaySource: "BYE",
  },
  {
    gameNumber: 32,
    bracket: "winners",
    roundLabel: "Winners Round 2",
    homeSource: "W G15",
    awaySource: "Seed 2",
  },

  {
    gameNumber: 33,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G31",
    awaySource: "L G18",
  },
  {
    gameNumber: 34,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G29",
    awaySource: "L G20",
  },
  {
    gameNumber: 35,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G27",
    awaySource: "L G22",
  },
  {
    gameNumber: 36,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G25",
    awaySource: "L G24",
  },
  {
    gameNumber: 37,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G23",
    awaySource: "L G26",
  },
  {
    gameNumber: 38,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G21",
    awaySource: "L G28",
  },
  {
    gameNumber: 39,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G19",
    awaySource: "L G30",
  },
  {
    gameNumber: 40,
    bracket: "losers",
    roundLabel: "Losers Round 2",
    homeSource: "W G17",
    awaySource: "L G32",
  },

  {
    gameNumber: 41,
    bracket: "losers",
    roundLabel: "Losers Round 3",
    homeSource: "W G40",
    awaySource: "W G39",
  },
  {
    gameNumber: 42,
    bracket: "winners",
    roundLabel: "Winners Round 3",
    homeSource: "W G18",
    awaySource: "W G20",
  },
  {
    gameNumber: 43,
    bracket: "losers",
    roundLabel: "Losers Round 3",
    homeSource: "W G38",
    awaySource: "W G37",
  },
  {
    gameNumber: 44,
    bracket: "winners",
    roundLabel: "Winners Round 3",
    homeSource: "W G22",
    awaySource: "W G24",
  },
  {
    gameNumber: 45,
    bracket: "losers",
    roundLabel: "Losers Round 3",
    homeSource: "W G36",
    awaySource: "W G35",
  },
  {
    gameNumber: 46,
    bracket: "winners",
    roundLabel: "Winners Round 3",
    homeSource: "W G26",
    awaySource: "W G28",
  },
  {
    gameNumber: 47,
    bracket: "losers",
    roundLabel: "Losers Round 3",
    homeSource: "W G34",
    awaySource: "W G33",
  },
  {
    gameNumber: 48,
    bracket: "winners",
    roundLabel: "Winners Round 3",
    homeSource: "W G30",
    awaySource: "W G32",
  },

  {
    gameNumber: 49,
    bracket: "losers",
    roundLabel: "Losers Round 4",
    homeSource: "W G41",
    awaySource: "L G42",
  },
  {
    gameNumber: 50,
    bracket: "losers",
    roundLabel: "Losers Round 4",
    homeSource: "W G43",
    awaySource: "L G44",
  },
  {
    gameNumber: 51,
    bracket: "losers",
    roundLabel: "Losers Round 4",
    homeSource: "W G45",
    awaySource: "L G46",
  },
  {
    gameNumber: 52,
    bracket: "losers",
    roundLabel: "Losers Round 4",
    homeSource: "W G47",
    awaySource: "L G48",
  },

  {
    gameNumber: 53,
    bracket: "losers",
    roundLabel: "Losers Round 5",
    homeSource: "W G49",
    awaySource: "W G50",
  },
  {
    gameNumber: 54,
    bracket: "winners",
    roundLabel: "Winners Semifinal",
    homeSource: "W G42",
    awaySource: "W G44",
  },
  {
    gameNumber: 55,
    bracket: "losers",
    roundLabel: "Losers Round 5",
    homeSource: "W G51",
    awaySource: "W G52",
  },
  {
    gameNumber: 56,
    bracket: "winners",
    roundLabel: "Winners Semifinal",
    homeSource: "W G46",
    awaySource: "W G48",
  },

  {
    gameNumber: 57,
    bracket: "losers",
    roundLabel: "Losers Semifinal",
    homeSource: "W G53",
    awaySource: "L G56",
  },
  {
    gameNumber: 58,
    bracket: "losers",
    roundLabel: "Losers Semifinal",
    homeSource: "W G55",
    awaySource: "L G54",
  },
  {
    gameNumber: 59,
    bracket: "finals",
    roundLabel: "Playoff Semifinal",
    homeSource: "W G54",
    awaySource: "W G57",
  },
  {
    gameNumber: 60,
    bracket: "finals",
    roundLabel: "Playoff Semifinal",
    homeSource: "W G56",
    awaySource: "W G58",
  },
  {
    gameNumber: 61,
    bracket: "finals",
    roundLabel: "Championship Final",
    homeSource: "W G59",
    awaySource: "W G60",
  },
  {
    gameNumber: 62,
    bracket: "finals",
    roundLabel: "Third Place Game",
    homeSource: "L G59",
    awaySource: "L G60",
  },
];

function getResultPoints({
  league,
  didWin,
  didLose,
}: {
  league: string;
  didWin: boolean;
  didLose: boolean;
}) {
  if (!didWin && !didLose) return 0;

  if (league === "competitive") {
    if (didWin) return 3;
    if (didLose) return -1;
  }

  if (league === "recreational") {
    if (didWin) return 1;
    if (didLose) return -2;
  }

  return 0;
}

function getSeedNumber(source: string) {
  const match = source.match(/^Seed\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function getWeekdaysBetween(startDate: string, endDate: string) {
  const days: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (current <= end) {
    const day = current.getUTCDay();

    if (day >= 1 && day <= 5) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, "0");
      const date = String(current.getUTCDate()).padStart(2, "0");

      days.push(`${year}-${month}-${date}`);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function makeEasternTimestamp(dateKey: string, hour: number, minute = 0) {
  return `${dateKey}T${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}:00-04:00`;
}

function getPlayoffScheduleMap() {
  const scheduledAtByGameNumber: Record<number, string> = {};

  const weekdays = getWeekdaysBetween("2026-08-03", "2026-08-27");
  const slots: string[] = [];

  weekdays.forEach((dateKey, index) => {
    if (index < 3) {
      slots.push(makeEasternTimestamp(dateKey, 9));
    }

    slots.push(makeEasternTimestamp(dateKey, 12));
    slots.push(makeEasternTimestamp(dateKey, 15));
    slots.push(makeEasternTimestamp(dateKey, 16));
  });

  PLAYABLE_GAME_NUMBERS.forEach((gameNumber, index) => {
    scheduledAtByGameNumber[gameNumber] = slots[index] || "";
  });

  scheduledAtByGameNumber[62] = "2026-08-28T14:00:00-04:00";
  scheduledAtByGameNumber[61] = "2026-08-28T16:00:00-04:00";

  return scheduledAtByGameNumber;
}

export async function getPlayoffSeedsFromStandings() {
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id, name, league, playoff_disqualified");

  const { data: games, error: gamesError } = await supabaseAdmin
    .from("games")
    .select(
      `
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      league,
      weight,
      is_forfeit,
      forfeit_team_id
      `
    )
    .eq("status", "completed");

  if (teamsError || gamesError) {
    throw new Error(teamsError?.message || gamesError?.message);
  }

  const standings = (teams || [])
    .filter((team: Team) => !team.playoff_disqualified)
    .map((team: Team) => {
      let wins = 0;
      let losses = 0;
      let gamesPlayed = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let standingPoints = 0;

      (games || []).forEach((game: Game) => {
        const isHome = game.home_team_id === team.id;
        const isAway = game.away_team_id === team.id;

        if (!isHome && !isAway) return;

        gamesPlayed += 1;

        const teamScore = isHome ? game.home_score : game.away_score;
        const opponentScore = isHome ? game.away_score : game.home_score;

        pointsFor += teamScore;
        pointsAgainst += opponentScore;

        const didWin = teamScore > opponentScore;
        const didLose = teamScore < opponentScore;

        const didForfeit = Boolean(
          game.is_forfeit && game.forfeit_team_id === team.id
        );

        if (didWin) wins += 1;
        if (didLose) losses += 1;

        if (didForfeit) {
          standingPoints -= 3;
        } else {
          standingPoints += getResultPoints({
            league: game.league,
            didWin,
            didLose,
          });
        }
      });

      return {
        id: team.id,
        name: team.name,
        league: team.league,
        gamesPlayed,
        wins,
        losses,
        differential: pointsFor - pointsAgainst,
        standingPoints,
      };
    })
    .sort((a, b) => {
      if (b.standingPoints !== a.standingPoints) {
        return b.standingPoints - a.standingPoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.differential !== a.differential) {
        return b.differential - a.differential;
      }

      return a.name.localeCompare(b.name);
    });

  if (standings.length < 30) {
    throw new Error(
      `Not enough playoff-eligible teams. Need 30, found ${standings.length}.`
    );
  }

  return standings.slice(0, 30).map((team, index) => ({
    seed: index + 1,
    teamId: team.id,
    name: team.name,
    league: team.league,
    standingPoints: team.standingPoints,
    wins: team.wins,
    losses: team.losses,
    differential: team.differential,
    gamesPlayed: team.gamesPlayed,
  }));
}

export function buildPlayoffGameRows(seeds: PlayoffSeed[]) {
  const seedByNumber = new Map(seeds.map((seed) => [seed.seed, seed]));
  const scheduledAtByGameNumber = getPlayoffScheduleMap();

  return PLAYOFF_GAME_DEFINITIONS.map((definition) => {
    const homeSeedNumber = getSeedNumber(definition.homeSource);
    const awaySeedNumber = getSeedNumber(definition.awaySource);

    const homeSeed =
      homeSeedNumber === null ? null : seedByNumber.get(homeSeedNumber) || null;

    const awaySeed =
      awaySeedNumber === null ? null : seedByNumber.get(awaySeedNumber) || null;

    const isAutomaticByeWin =
      definition.bracket === "winners" &&
      definition.awaySource === "BYE" &&
      homeSeed !== null &&
      (homeSeed.seed === 1 || homeSeed.seed === 2);

    const scheduledAt =
      isAutomaticByeWin || definition.homeSource === "BYE" || definition.awaySource === "BYE"
        ? null
        : scheduledAtByGameNumber[definition.gameNumber] || null;

    return {
      game_number: definition.gameNumber,
      bracket: definition.bracket,
      round_label: definition.roundLabel,

      scheduled_at: scheduledAt,
      location: scheduledAt ? "Sand Court" : null,

      status: isAutomaticByeWin
        ? "completed"
        : scheduledAt
          ? "scheduled"
          : "pending",

      home_seed: homeSeedNumber,
      away_seed: awaySeedNumber,

      home_team_id: homeSeed?.teamId || null,
      away_team_id: awaySeed?.teamId || null,

      home_source: definition.homeSource,
      away_source: definition.awaySource,

      home_score: isAutomaticByeWin ? 1 : null,
      away_score: isAutomaticByeWin ? 0 : null,

      winner_team_id: isAutomaticByeWin ? homeSeed?.teamId || null : null,
      loser_team_id: null,

      updated_at: new Date().toISOString(),
    };
  });
}