import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, gameId } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 }
    );
  }

  const { data: updatedGame, error } = await supabaseAdmin
    .from("games")
    .update({
      scheduled_at: null,
      location: null,
      court: null,
      status: "unscheduled",
    })
    .eq("id", gameId)
    .select("id, status, scheduled_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    game: updatedGame,
  });
}