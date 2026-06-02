import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken, submissionId, gameId } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!submissionId || !gameId) {
    return NextResponse.json(
      { error: "Submission ID and game ID are required" },
      { status: 400 }
    );
  }

  const { error: submissionError } = await supabaseAdmin
    .from("score_submissions")
    .update({ status: "rejected" })
    .eq("id", submissionId);

  if (submissionError) {
    return NextResponse.json(
      { error: submissionError.message },
      { status: 500 }
    );
  }

  const { error: gameError } = await supabaseAdmin
    .from("games")
    .update({ submitted_score_pending: false })
    .eq("id", gameId);

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}