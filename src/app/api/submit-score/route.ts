import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    gameId,
    homeScore,
    awayScore,
    submittedBy,
    notes,
  } = body;

  if (!gameId) {
    return NextResponse.json(
      { error: "Game is required" },
      { status: 400 }
    );
  }

  if (homeScore === "" || awayScore === "") {
    return NextResponse.json(
      { error: "Both scores are required" },
      { status: 400 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, status, submitted_score_pending")
    .eq("id", gameId)
    .single();

  if (gameError) {
    return NextResponse.json(
      { error: gameError.message },
      { status: 500 }
    );
  }

  if (game.status === "completed") {
    return NextResponse.json(
      { error: "This game already has a final score." },
      { status: 400 }
    );
  }

  if (game.submitted_score_pending) {
    return NextResponse.json(
      {
        error:
          "A score has already been submitted for this game and is waiting for approval.",
      },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("score_submissions")
    .insert({
      game_id: gameId,
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      submitted_by: submittedBy || null,
      notes: notes || null,
      status: "pending",
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("games")
    .update({
      submitted_score_pending: true,
    })
    .eq("id", gameId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}