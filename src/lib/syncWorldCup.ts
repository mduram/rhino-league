import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FOOTBALL_DATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";

function normalizeStatus(status: string) {
  switch (status) {
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";

    case "IN_PLAY":
    case "PAUSED":
      return "live";

    case "FINISHED":
      return "completed";

    case "POSTPONED":
      return "postponed";

    case "CANCELLED":
      return "cancelled";

    case "SUSPENDED":
      return "suspended";

    default:
      return "scheduled";
  }
}

function normalizeWinner(winner: string | null | undefined) {
  if (winner === "HOME_TEAM") return "home";
  if (winner === "AWAY_TEAM") return "away";
  if (winner === "DRAW") return "draw";
  return null;
}

function getScore(match: any) {
  const home =
    match.score?.fullTime?.home ??
    match.score?.regularTime?.home ??
    null;

  const away =
    match.score?.fullTime?.away ??
    match.score?.regularTime?.away ??
    null;

  return {
    homeScore:
      home === null || home === undefined
        ? null
        : Number(home),

    awayScore:
      away === null || away === undefined
        ? null
        : Number(away),
  };
}

async function settleCompletedMatch(match: any) {
  if (
    match.status !== "completed" ||
    !match.winner
  ) {
    return;
  }

  const { data: openBets, error: betsError } =
    await supabaseAdmin
      .from("world_cup_bets")
      .select("*")
      .eq("match_id", match.id)
      .eq("status", "open");

  if (betsError) {
    throw new Error(betsError.message);
  }

  for (const bet of openBets || []) {
    const won = bet.side === match.winner;
    const nextStatus = won ? "won" : "lost";

    // Claim this bet only if it is still open.
    // This protects against two concurrent sync requests
    // paying the same bet twice.
    const { data: claimedBet, error: claimError } =
      await supabaseAdmin
        .from("world_cup_bets")
        .update({
          status: nextStatus,
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id)
        .eq("status", "open")
        .select("*")
        .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claimedBet) {
      continue;
    }

    if (won) {
      const { data: profile, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, rhino_coins")
          .eq("id", bet.user_id)
          .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile) {
        continue;
      }

      const payout =
        Number(claimedBet.potential_payout || 0);

      const { error: payoutError } =
        await supabaseAdmin
          .from("profiles")
          .update({
            rhino_coins:
              Number(profile.rhino_coins || 0) +
              payout,
          })
          .eq("id", bet.user_id);

      if (payoutError) {
        throw new Error(payoutError.message);
      }
    }
  }
}

async function refundCancelledMatch(match: any) {
  if (match.status !== "cancelled") {
    return;
  }

  const { data: openBets, error: betsError } =
    await supabaseAdmin
      .from("world_cup_bets")
      .select("*")
      .eq("match_id", match.id)
      .eq("status", "open");

  if (betsError) {
    throw new Error(betsError.message);
  }

  for (const bet of openBets || []) {
    const { data: claimedBet, error: claimError } =
      await supabaseAdmin
        .from("world_cup_bets")
        .update({
          status: "cancelled",
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id)
        .eq("status", "open")
        .select("*")
        .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claimedBet) {
      continue;
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, rhino_coins")
        .eq("id", bet.user_id)
        .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile) {
      continue;
    }

    const { error: refundError } =
      await supabaseAdmin
        .from("profiles")
        .update({
          rhino_coins:
            Number(profile.rhino_coins || 0) +
            Number(claimedBet.amount || 0),
        })
        .eq("id", bet.user_id);

    if (refundError) {
      throw new Error(refundError.message);
    }
  }
}

export async function syncWorldCupMatches() {
  const token =
    process.env.FOOTBALL_DATA_API_TOKEN;

  if (!token) {
    throw new Error(
      "FOOTBALL_DATA_API_TOKEN is not configured."
    );
  }

  const response = await fetch(
    FOOTBALL_DATA_URL,
    {
      headers: {
        "X-Auth-Token": token,
      },

      // Avoid hammering the external API.
      // Next.js may reuse the response for five minutes.
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `World Cup API failed with status ${response.status}: ${text.slice(
        0,
        300
      )}`
    );
  }

  const payload = await response.json();
  const externalMatches = payload.matches || [];

  for (const match of externalMatches) {
    const scores = getScore(match);

    const row = {
      external_id: Number(match.id),

      competition_code:
        match.competition?.code || "WC",

      home_team_name:
        match.homeTeam?.name || "TBD",

      away_team_name:
        match.awayTeam?.name || "TBD",

      home_team_external_id:
        match.homeTeam?.id ?? null,

      away_team_external_id:
        match.awayTeam?.id ?? null,

      home_team_crest:
        match.homeTeam?.crest || null,

      away_team_crest:
        match.awayTeam?.crest || null,

      scheduled_at: match.utcDate,

      stage: match.stage || null,

      group_name: match.group || null,

      matchday:
        match.matchday === null ||
        match.matchday === undefined
          ? null
          : Number(match.matchday),

      status: normalizeStatus(match.status),

      home_score: scores.homeScore,
      away_score: scores.awayScore,

      winner: normalizeWinner(
        match.score?.winner
      ),

      raw_status: match.status || null,

      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("world_cup_matches")
      .upsert(row, {
        onConflict: "external_id",
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  const { data: storedMatches, error: storedError } =
    await supabaseAdmin
      .from("world_cup_matches")
      .select("*");

  if (storedError) {
    throw new Error(storedError.message);
  }

  for (const match of storedMatches || []) {
    await settleCompletedMatch(match);
    await refundCancelledMatch(match);
  }

  return {
    syncedCount: externalMatches.length,
  };
}