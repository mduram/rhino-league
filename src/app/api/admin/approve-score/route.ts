import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";
import { parsePlayoffScoreGameId } from "@/lib/playoffScoreSubmissions";
import {
  PlayoffResultError,
  recordPlayoffResult,
} from "@/lib/recordPlayoffResult";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    submissionId,
    overrideHomeScore,
    overrideAwayScore,
    overrideIsForfeit,
    overrideForfeitTeamId,
    overrideForfeitNote,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!submissionId) {
    return NextResponse.json(
      { error: "Missing submission ID." },
      { status: 400 }
    );
  }

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from("score_submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    return NextResponse.json(
      { error: submissionError.message },
      { status: 500 }
    );
  }

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found." },
      { status: 404 }
    );
  }

  const playoffGameId = parsePlayoffScoreGameId(submission.notes);

  if (playoffGameId) {
    const finalHomeScore =
      overrideHomeScore === undefined ||
      overrideHomeScore === null ||
      overrideHomeScore === ""
        ? Number(submission.home_score)
        : Number(overrideHomeScore);
    const finalAwayScore =
      overrideAwayScore === undefined ||
      overrideAwayScore === null ||
      overrideAwayScore === ""
        ? Number(submission.away_score)
        : Number(overrideAwayScore);

    try {
      const result = await recordPlayoffResult({
        gameId: playoffGameId,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
      });

      const { error: submissionUpdateError } = await supabaseAdmin
        .from("score_submissions")
        .update({
          status: "approved",
          home_score: finalHomeScore,
          away_score: finalAwayScore,
          is_forfeit:
            overrideIsForfeit === undefined || overrideIsForfeit === null
              ? Boolean(submission.is_forfeit)
              : Boolean(overrideIsForfeit),
          forfeit_team_id:
            overrideForfeitTeamId === undefined
              ? submission.forfeit_team_id
              : overrideForfeitTeamId || null,
          forfeit_note:
            overrideForfeitNote === undefined
              ? submission.forfeit_note
              : String(overrideForfeitNote || "").trim() || null,
        })
        .eq("id", submissionId);

      if (submissionUpdateError) throw new Error(submissionUpdateError.message);

      await supabaseAdmin
        .from("score_submissions")
        .update({ status: "rejected" })
        .is("game_id", null)
        .eq("notes", submission.notes)
        .neq("id", submissionId)
        .eq("status", "pending");

      return NextResponse.json({
        success: true,
        gameNumber: result.gameNumber,
        message: `Playoff G${result.gameNumber} approved and the bracket advanced.`,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not approve the playoff score.",
        },
        { status: error instanceof PlayoffResultError ? error.status : 500 }
      );
    }
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, home_team_id, away_team_id")
    .eq("id", submission.game_id)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const finalHomeScore =
    overrideHomeScore === undefined ||
    overrideHomeScore === null ||
    overrideHomeScore === ""
      ? Number(submission.home_score)
      : Number(overrideHomeScore);

  const finalAwayScore =
    overrideAwayScore === undefined ||
    overrideAwayScore === null ||
    overrideAwayScore === ""
      ? Number(submission.away_score)
      : Number(overrideAwayScore);

  if (
    !Number.isFinite(finalHomeScore) ||
    !Number.isFinite(finalAwayScore) ||
    finalHomeScore < 0 ||
    finalAwayScore < 0
  ) {
    return NextResponse.json(
      { error: "Scores must be valid non-negative numbers." },
      { status: 400 }
    );
  }

  const finalIsForfeit =
    overrideIsForfeit === undefined || overrideIsForfeit === null
      ? Boolean(submission.is_forfeit)
      : Boolean(overrideIsForfeit);

  const finalForfeitTeamId =
    overrideForfeitTeamId === undefined
      ? submission.forfeit_team_id
      : overrideForfeitTeamId || null;

  if (finalIsForfeit) {
    if (!finalForfeitTeamId) {
      return NextResponse.json(
        { error: "Select which team forfeited." },
        { status: 400 }
      );
    }

    const validForfeitTeam =
      finalForfeitTeamId === game.home_team_id ||
      finalForfeitTeamId === game.away_team_id;

    if (!validForfeitTeam) {
      return NextResponse.json(
        { error: "Forfeit team must be one of the teams in the game." },
        { status: 400 }
      );
    }
  }

  const finalForfeitNote =
    overrideForfeitNote === undefined
      ? submission.forfeit_note
      : String(overrideForfeitNote || "").trim() || null;

  const { error: gameUpdateError } = await supabaseAdmin
    .from("games")
    .update({
      home_score: finalHomeScore,
      away_score: finalAwayScore,
      status: "completed",
      submitted_score_pending: false,
      is_forfeit: finalIsForfeit,
      forfeit_team_id: finalIsForfeit ? finalForfeitTeamId : null,
      forfeit_note: finalIsForfeit ? finalForfeitNote : null,
    })
    .eq("id", submission.game_id);

  if (gameUpdateError) {
    return NextResponse.json(
      { error: gameUpdateError.message },
      { status: 500 }
    );
  }

  const { error: submissionUpdateError } = await supabaseAdmin
    .from("score_submissions")
    .update({
      status: "approved",
      home_score: finalHomeScore,
      away_score: finalAwayScore,
      is_forfeit: finalIsForfeit,
      forfeit_team_id: finalIsForfeit ? finalForfeitTeamId : null,
      forfeit_note: finalIsForfeit ? finalForfeitNote : null,
    })
    .eq("id", submissionId);

  if (submissionUpdateError) {
    return NextResponse.json(
      { error: submissionUpdateError.message },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("score_submissions")
    .update({ status: "rejected" })
    .eq("game_id", submission.game_id)
    .neq("id", submissionId)
    .eq("status", "pending");

  return NextResponse.json({
    success: true,
    message: finalIsForfeit
      ? "Submission approved as a forfeit."
      : "Submission approved.",
  });
}
