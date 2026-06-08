import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken, gameId } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!gameId) {
    return NextResponse.json(
      { error: "Missing game ID." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("score_submissions")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({
      success: true,
      submissions: [],
      warning:
        "Could not load score_submissions table. This usually means your submissions table has a different name.",
      rawError: error.message,
    });
  }

  return NextResponse.json({
    success: true,
    submissions: data || [],
  });
}