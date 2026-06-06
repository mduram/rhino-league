import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMarket } from "@/lib/betting";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: games, error: gamesError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at", { ascending: true });

  if (gamesError) {
    return NextResponse.json(
      { error: gamesError.message },
      { status: 500 }
    );
  }

  const { data: bets, error: betsError } = await supabaseAdmin
    .from("game_bets")
    .select("game_id, side, amount, status")
    .in("status", ["open", "won", "lost"]);

  if (betsError) {
    return NextResponse.json(
      { error: betsError.message },
      { status: 500 }
    );
  }

  const marketsByGameId: Record<string, any> = {};

  for (const game of games || []) {
    const gameBets = (bets || [])
      .filter((bet) => bet.game_id === game.id)
      .map((bet) => ({
        side: bet.side as "home" | "away",
        amount: Number(bet.amount || 0),
      }));

    marketsByGameId[game.id] = calculateMarket({
      gameId: game.id,
      homeVotes: Number(game.home_votes || 0),
      awayVotes: Number(game.away_votes || 0),
      bets: gameBets,
    });
  }

  return NextResponse.json({
    success: true,
    games: games || [],
    marketsByGameId,
  });
}