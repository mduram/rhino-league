import { NextResponse } from "next/server";

import { calculateMarket } from "@/lib/betting";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!SEASON_PHASE.playoffSchedulePublished) {
    return NextResponse.json({
      success: true,
      schedulePublished: false,
      bettingOpen: false,
      message:
        "Playoff markets unlock after the official bracket and schedule are published.",
      games: [],
      marketsByGameId: {},
    });
  }

  const { data: games, error: gamesError } = await supabaseAdmin
    .from("playoff_games")
    .select(`
      id,
      game_number,
      bracket,
      round_label,
      scheduled_at,
      location,
      status,
      home_team_id,
      away_team_id,
      home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url, league),
      away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url, league)
    `)
    .eq("status", "scheduled")
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("scheduled_at", { ascending: true });

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 });
  }

  let bets: { playoff_game_id: string; side: string; amount: number }[] = [];

  if (SEASON_PHASE.playoffBettingOpen) {
    const { data: betRows, error: betsError } = await supabaseAdmin
      .from("playoff_game_bets")
      .select("playoff_game_id, side, amount")
      .eq("status", "open");

    if (betsError) {
      return NextResponse.json({ error: betsError.message }, { status: 500 });
    }

    bets = betRows || [];
  }

  const marketsByGameId: Record<string, ReturnType<typeof calculateMarket>> =
    {};

  for (const game of games || []) {
    marketsByGameId[game.id] = calculateMarket({
      gameId: game.id,
      homeVotes: 0,
      awayVotes: 0,
      bets: bets
        .filter((bet) => bet.playoff_game_id === game.id)
        .map((bet) => ({
          side: bet.side as "home" | "away",
          amount: Number(bet.amount || 0),
        })),
    });
  }

  return NextResponse.json({
    success: true,
    schedulePublished: true,
    bettingOpen: SEASON_PHASE.playoffBettingOpen,
    games: games || [],
    marketsByGameId,
  });
}
