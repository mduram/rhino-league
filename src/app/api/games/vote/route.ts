import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { gameId, side } = body;

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 }
    );
  }

  if (side !== "home" && side !== "away") {
    return NextResponse.json(
      { error: "Vote side must be home or away" },
      { status: 400 }
    );
  }

  const { data: game, error: fetchError } = await supabaseAdmin
    .from("games")
    .select("home_votes, away_votes")
    .eq("id", gameId)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  const update =
    side === "home"
      ? { home_votes: Number(game.home_votes || 0) + 1 }
      : { away_votes: Number(game.away_votes || 0) + 1 };

  const { data: updatedGame, error: updateError } = await supabaseAdmin
    .from("games")
    .update(update)
    .eq("id", gameId)
    .select("home_votes, away_votes")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    home_votes: updatedGame.home_votes,
    away_votes: updatedGame.away_votes,
  });
}