import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, gameId, scheduledAt, location, court } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 }
    );
  }

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Date/time is required" },
      { status: 400 }
    );
  }

  const { data: existingGame, error: existingGameError } = await supabaseAdmin
    .from("games")
    .select("id, status")
    .eq("id", gameId)
    .single();

  if (existingGameError) {
    return NextResponse.json(
      { error: existingGameError.message },
      { status: 500 }
    );
  }

  if (!existingGame) {
    return NextResponse.json(
      { error: "Game not found" },
      { status: 404 }
    );
  }

  const { data: updatedGame, error } = await supabaseAdmin
    .from("games")
    .update({
      scheduled_at: scheduledAt,
      location: location || null,
      court: court || null,
      status: "scheduled",
    })
    .eq("id", gameId)
    .select(`
      id,
      scheduled_at,
      location,
      court,
      status,
      home_team_id,
      away_team_id
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    game: updatedGame,
  });
}