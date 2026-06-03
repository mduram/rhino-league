import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { gameId, side } = body;

  if (!gameId) {
    return NextResponse.json(
      { error: "Missing game ID." },
      { status: 400 }
    );
  }

  if (side !== "home" && side !== "away") {
    return NextResponse.json(
      { error: "Vote side must be home or away." },
      { status: 400 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, home_votes, away_votes")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json(
      { error: gameError.message },
      { status: 500 }
    );
  }

  if (!game) {
    return NextResponse.json(
      { error: "Game not found." },
      { status: 404 }
    );
  }

  const nextHomeVotes =
    side === "home" ? Number(game.home_votes || 0) + 1 : Number(game.home_votes || 0);

  const nextAwayVotes =
    side === "away" ? Number(game.away_votes || 0) + 1 : Number(game.away_votes || 0);

  const { data: updatedGame, error: updateError } = await supabaseAdmin
    .from("games")
    .update({
      home_votes: nextHomeVotes,
      away_votes: nextAwayVotes,
    })
    .eq("id", gameId)
    .select("id, home_votes, away_votes")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  if (!updatedGame) {
    return NextResponse.json(
      { error: "Vote update failed. Game not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    home_votes: updatedGame.home_votes || 0,
    away_votes: updatedGame.away_votes || 0,
  });
}