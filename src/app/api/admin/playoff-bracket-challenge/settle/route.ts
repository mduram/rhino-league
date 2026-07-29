import { NextResponse } from "next/server";

import { scoreBracketChallenge } from "@/lib/bracketChallenge";
import { isValidAdminToken } from "@/lib/adminAuth";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { adminToken } = await request.json();

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  const [{ data: games, error: gamesError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabaseAdmin
        .from("playoff_games")
        .select("game_number, home_source, away_source, winner_team_id"),
      supabaseAdmin
        .from("playoff_bracket_entries")
        .select("id, picks, status")
        .eq("season_year", SEASON_PHASE.year)
        .eq("status", "submitted"),
    ]);

  if (gamesError || entriesError) {
    return NextResponse.json(
      { error: gamesError?.message || entriesError?.message },
      { status: 500 }
    );
  }

  const requiredGames = (games || []).filter(
    (game) => game.home_source !== "BYE" && game.away_source !== "BYE"
  );
  const unfinishedGames = requiredGames.filter((game) => !game.winner_team_id);

  if (unfinishedGames.length > 0) {
    return NextResponse.json(
      {
        error: `The challenge cannot be settled until every playoff result is final. ${unfinishedGames.length} matchup(s) remain.`,
      },
      { status: 400 }
    );
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json(
      { error: "There are no submitted brackets to settle." },
      { status: 400 }
    );
  }

  const actualWinners = new Map<number, string>(
    requiredGames.map((game) => [
      Number(game.game_number),
      String(game.winner_team_id),
    ])
  );
  const scores = Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      scoreBracketChallenge({
        picks: (entry.picks || {}) as Record<string, string>,
        actualWinners,
      }),
    ])
  );

  const { data, error } = await supabaseAdmin.rpc(
    "settle_playoff_bracket_challenge",
    {
      p_season_year: SEASON_PHASE.year,
      p_scores: scores,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    ...data,
    scores,
    message:
      Number(data?.winnerCount || 0) > 1
        ? `Bracket Challenge settled. ${data.winnerCount} tied leaders split the ${data.pot}-coin pot.`
        : `Bracket Challenge settled. The winner received the ${data?.pot || 0}-coin pot.`,
  });
}
