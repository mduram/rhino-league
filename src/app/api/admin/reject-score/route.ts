import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { parsePlayoffScoreGameId } from "@/lib/playoffScoreSubmissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { adminToken, submissionId } = await request.json();

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!submissionId) {
    return NextResponse.json(
      { error: "Submission ID is required" },
      { status: 400 }
    );
  }

  const { data: submission, error: lookupError } = await supabaseAdmin
    .from("score_submissions")
    .select("id, game_id, notes")
    .eq("id", submissionId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
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

  if (!parsePlayoffScoreGameId(submission.notes) && submission.game_id) {
    const { error: gameError } = await supabaseAdmin
      .from("games")
      .update({ submitted_score_pending: false })
      .eq("id", submission.game_id);

    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
