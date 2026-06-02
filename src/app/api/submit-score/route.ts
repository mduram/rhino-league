import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    gameId,
    submittingTeamId,
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

  if (!submittingTeamId) {
    return NextResponse.json(
      { error: "Select which team you are submitting for." },
      { status: 400 }
    );
  }

  if (homeScore === "" || awayScore === "") {
    return NextResponse.json(
      { error: "Both scores are required" },
      { status: 400 }
    );
  }

  const parsedHomeScore = Number(homeScore);
  const parsedAwayScore = Number(awayScore);

  if (
    Number.isNaN(parsedHomeScore) ||
    Number.isNaN(parsedAwayScore) ||
    parsedHomeScore < 0 ||
    parsedAwayScore < 0
  ) {
    return NextResponse.json(
      { error: "Scores must be valid non-negative numbers." },
      { status: 400 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      status,
      submitted_score_pending,
      home_team_id,
      away_team_id
    `)
    .eq("id", gameId)
    .single();

  if (gameError) {
    return NextResponse.json(
      { error: gameError.message },
      { status: 500 }
    );
  }

  if (!game) {
    return NextResponse.json(
      { error: "Game not found." },
      { status: 404 }
    );
  }

  if (game.status === "completed") {
    return NextResponse.json(
      { error: "This game already has a final score." },
      { status: 400 }
    );
  }

  const isHomeTeam = submittingTeamId === game.home_team_id;
  const isAwayTeam = submittingTeamId === game.away_team_id;

  if (!isHomeTeam && !isAwayTeam) {
    return NextResponse.json(
      { error: "Selected team is not part of this game." },
      { status: 400 }
    );
  }

  const { data: existingPendingSubmissions, error: existingError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .eq("game_id", gameId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  const sameTeamSubmission = existingPendingSubmissions?.find(
    (submission) => submission.submitting_team_id === submittingTeamId
  );

  if (sameTeamSubmission) {
    return NextResponse.json(
      {
        error:
          "Your team has already submitted a score for this game. Ask an admin to review it if something is wrong.",
      },
      { status: 400 }
    );
  }

  const otherTeamSubmission = existingPendingSubmissions?.find(
    (submission) => submission.submitting_team_id !== submittingTeamId
  );

  const scoresMatch =
    otherTeamSubmission &&
    Number(otherTeamSubmission.home_score) === parsedHomeScore &&
    Number(otherTeamSubmission.away_score) === parsedAwayScore;

  const scoresConflict = Boolean(otherTeamSubmission && !scoresMatch);

  const { data: newSubmission, error: insertError } = await supabaseAdmin
    .from("score_submissions")
    .insert({
      game_id: gameId,
      submitting_team_id: submittingTeamId,
      home_score: parsedHomeScore,
      away_score: parsedAwayScore,
      submitted_by: submittedBy || null,
      notes: notes || null,
      status: "pending",
      conflict: scoresConflict,
      auto_approved: false,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  if (!otherTeamSubmission) {
    const { error: updateGameError } = await supabaseAdmin
      .from("games")
      .update({
        submitted_score_pending: true,
      })
      .eq("id", gameId);

    if (updateGameError) {
      return NextResponse.json(
        { error: updateGameError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outcome: "pending_first_submission",
      message:
        "Score submitted. It will become official when the other team submits the same score, or when an admin approves it.",
    });
  }

  if (scoresMatch) {
    const { error: gameUpdateError } = await supabaseAdmin
      .from("games")
      .update({
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
        status: "completed",
        submitted_score_pending: false,
      })
      .eq("id", gameId);

    if (gameUpdateError) {
      return NextResponse.json(
        { error: gameUpdateError.message },
        { status: 500 }
      );
    }

    const { error: submissionsUpdateError } = await supabaseAdmin
      .from("score_submissions")
      .update({
        status: "approved",
        auto_approved: true,
        conflict: false,
        matched_submission_id: newSubmission.id,
      })
      .in("id", [otherTeamSubmission.id, newSubmission.id]);

    if (submissionsUpdateError) {
      return NextResponse.json(
        { error: submissionsUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outcome: "auto_approved",
      message:
        "Score confirmed by both teams and automatically approved.",
    });
  }

  const { error: conflictUpdateError } = await supabaseAdmin
    .from("score_submissions")
    .update({
      conflict: true,
    })
    .in("id", [otherTeamSubmission.id, newSubmission.id]);

  if (conflictUpdateError) {
    return NextResponse.json(
      { error: conflictUpdateError.message },
      { status: 500 }
    );
  }

  const { error: gamePendingError } = await supabaseAdmin
    .from("games")
    .update({
      submitted_score_pending: true,
    })
    .eq("id", gameId);

  if (gamePendingError) {
    return NextResponse.json(
      { error: gamePendingError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    outcome: "conflict_pending_admin_review",
    message:
      "Score submitted, but it does not match the other team's submission. An admin will review it.",
  });
}