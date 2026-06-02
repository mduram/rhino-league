import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    gameId,
    homeScore,
    awayScore,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("games")
    .update({
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      status: "completed",
      submitted_score_pending: false,
    })
    .eq("id", gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}