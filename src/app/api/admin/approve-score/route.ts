import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken, submissionId } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!submissionId) {
    return NextResponse.json(
      { error: "Submission ID is required" },
      { status: 400 }
    );
  }

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from("score_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (submissionError) {
    return NextResponse.json(
      { error: submissionError.message },
      { status: 500 }
    );
  }

  const { error: gameError } = await supabaseAdmin
    .from("games")
    .update({
      home_score: submission.home_score,
      away_score: submission.away_score,
      status: "completed",
      submitted_score_pending: false,
    })
    .eq("id", submission.game_id);

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  const { error: updateSubmissionError } = await supabaseAdmin
    .from("score_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId);

  if (updateSubmissionError) {
    return NextResponse.json(
      { error: updateSubmissionError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}