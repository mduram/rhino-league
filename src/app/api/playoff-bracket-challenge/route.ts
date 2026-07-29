import { NextResponse } from "next/server";

import {
  BRACKET_CHALLENGE_ENTRY_FEE,
  buildBracketChallenge,
  scoreBracketChallenge,
  type BracketChallengeGame,
  type BracketChallengePicks,
  type BracketChallengeTeam,
} from "@/lib/bracketChallenge";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChallengeSeedRow = {
  seed: number;
  team:
    | {
        id: string;
        name: string;
        league: string;
        logo_url: string | null;
      }
    | {
        id: string;
        name: string;
        league: string;
        logo_url: string | null;
      }[]
    | null;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getUserFromRequest(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(
    "Bearer ",
    ""
  );
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function getChallengeBracket() {
  const [
    { data: games, error: gamesError },
    { data: seeds, error: seedsError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabaseAdmin
      .from("playoff_games")
      .select(
        "game_number, bracket, round_label, home_source, away_source, winner_team_id, status, scheduled_at"
      )
      .order("game_number", { ascending: true }),
    supabaseAdmin
      .from("playoff_seeds")
      .select(
        "seed, team:teams!playoff_seeds_team_id_fkey(id, name, league, logo_url)"
      )
      .order("seed", { ascending: true }),
    supabaseAdmin
      .from("playoff_settings")
      .select("is_generated, updated_at")
      .eq("id", "main")
      .maybeSingle(),
  ]);

  if (gamesError || seedsError || settingsError) {
    throw new Error(
      gamesError?.message || seedsError?.message || settingsError?.message
    );
  }

  const teams = ((seeds || []) as ChallengeSeedRow[])
    .map((seed) => {
      const team = Array.isArray(seed.team) ? seed.team[0] : seed.team;
      if (!team) return null;
      return {
        id: team.id,
        seed: Number(seed.seed),
        name: team.name,
        league: team.league,
        logo_url: team.logo_url || null,
      } as BracketChallengeTeam;
    })
    .filter(Boolean) as BracketChallengeTeam[];

  const firstStart = (games || [])
    .map((game) => game.scheduled_at)
    .filter(Boolean)
    .map((value: string) => new Date(value).getTime())
    .sort((a: number, b: number) => a - b)[0];

  return {
    games: (games || []) as (BracketChallengeGame & {
      winner_team_id?: string | null;
      status?: string;
      scheduled_at?: string | null;
    })[],
    teams,
    firstStart: Number.isFinite(firstStart) ? firstStart : null,
    officialGenerated: Boolean(settings?.is_generated),
    bracketVersion: `${SEASON_PHASE.year}:${settings?.updated_at || "official"}`,
  };
}

function isSubmissionOpen(
  firstStart: number | null,
  officialGenerated: boolean
) {
  return Boolean(
    SEASON_PHASE.regularSeasonComplete &&
      SEASON_PHASE.playoffSchedulePublished &&
      SEASON_PHASE.playoffBracketChallengeOpen &&
      officialGenerated &&
      firstStart &&
      Date.now() < firstStart
  );
}

export async function GET(request: Request) {
  if (
    !SEASON_PHASE.regularSeasonComplete ||
    !SEASON_PHASE.playoffSchedulePublished
  ) {
    return NextResponse.json({
      success: true,
      entryFee: BRACKET_CHALLENGE_ENTRY_FEE,
      submissionOpen: false,
      schedulePublished: false,
      standingsFinal: false,
      entryCount: 0,
      pot: 0,
      leaders: [],
      myEntry: null,
      message:
        "Submissions open only after the final standings and official playoff schedule are published.",
    });
  }

  try {
    const user = await getUserFromRequest(request);
    const { games, firstStart, officialGenerated } =
      await getChallengeBracket();
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from("playoff_bracket_entries")
      .select(
        "id, user_id, picks, entry_fee, score, payout, status, submitted_at"
      )
      .eq("season_year", SEASON_PHASE.year)
      .neq("status", "refunded")
      .order("submitted_at", { ascending: true });

    if (entriesError) throw new Error(entriesError.message);

    const actualWinners = new Map<number, string>();
    games.forEach((game) => {
      if (game.winner_team_id) {
        actualWinners.set(game.game_number, game.winner_team_id);
      }
    });

    const profileIds = [...new Set((entries || []).map((entry) => entry.user_id))];
    let profilesById: Record<string, string> = {};

    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", profileIds);
      if (profilesError) throw new Error(profilesError.message);
      profilesById = Object.fromEntries(
        (profiles || []).map((profile) => [
          profile.id,
          profile.display_name || "Anonymous Rhino",
        ])
      );
    }

    const scoredEntries = (entries || [])
      .map((entry) => ({
        ...entry,
        liveScore: scoreBracketChallenge({
          picks: (entry.picks || {}) as Record<string, string>,
          actualWinners,
        }),
        displayName: profilesById[entry.user_id] || "Anonymous Rhino",
      }))
      .sort((a, b) => {
        if (b.liveScore !== a.liveScore) return b.liveScore - a.liveScore;
        return (
          new Date(a.submitted_at).getTime() -
          new Date(b.submitted_at).getTime()
        );
      });

    return NextResponse.json({
      success: true,
      entryFee: BRACKET_CHALLENGE_ENTRY_FEE,
      submissionOpen: isSubmissionOpen(firstStart, officialGenerated),
      schedulePublished: true,
      standingsFinal: true,
      locksAt: firstStart ? new Date(firstStart).toISOString() : null,
      entryCount: scoredEntries.length,
      pot: scoredEntries.reduce(
        (total, entry) => total + Number(entry.entry_fee || 0),
        0
      ),
      completedGames: actualWinners.size,
      leaders: scoredEntries.slice(0, 10).map((entry, index) => ({
        rank: index + 1,
        displayName: entry.displayName,
        score: entry.liveScore,
        status: entry.status,
        payout: Number(entry.payout || 0),
      })),
      myEntry: user
        ? scoredEntries.find((entry) => entry.user_id === user.id) || null
        : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: errorMessage(error, "Could not load the Bracket Challenge.") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (
    !SEASON_PHASE.regularSeasonComplete ||
    !SEASON_PHASE.playoffSchedulePublished ||
    !SEASON_PHASE.playoffBracketChallengeOpen
  ) {
    return NextResponse.json(
      {
        error:
          "Bracket Challenge submissions open only after the final standings and official playoff schedule are published.",
      },
      { status: 423 }
    );
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Log in with your Rhino betting account before submitting." },
      { status: 401 }
    );
  }

  try {
    const { picks } = (await request.json()) as {
      picks?: BracketChallengePicks;
    };
    const { games, teams, firstStart, officialGenerated, bracketVersion } =
      await getChallengeBracket();

    if (!isSubmissionOpen(firstStart, officialGenerated)) {
      return NextResponse.json(
        {
          error:
            "Bracket submissions are closed or the final bracket has not been published yet.",
        },
        { status: 423 }
      );
    }

    const challenge = buildBracketChallenge({
      games,
      teams,
      picks: picks || {},
    });

    if (!challenge.isComplete) {
      return NextResponse.json(
        {
          error: `Complete every matchup before submitting (${challenge.completedPicks}/${challenge.totalPicks}).`,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "submit_playoff_bracket_entry",
      {
        p_user_id: user.id,
        p_season_year: SEASON_PHASE.year,
        p_bracket_version: bracketVersion,
        p_picks: challenge.validPicks,
        p_entry_fee: BRACKET_CHALLENGE_ENTRY_FEE,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const submission = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      entryId: submission?.entry_id,
      rhinoCoins: submission?.remaining_coins,
      entryFee: BRACKET_CHALLENGE_ENTRY_FEE,
      message: "Bracket submitted. Your 100 Rhino Coins are in the prize pot.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: errorMessage(error, "Could not submit the bracket.") },
      { status: 500 }
    );
  }
}
