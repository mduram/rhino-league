import { NextResponse } from "next/server";
import {
  makePlayoffScoreNote,
} from "@/lib/playoffScoreSubmissions";
import {
  PlayoffResultError,
  recordPlayoffResult,
} from "@/lib/recordPlayoffResult";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function scoresMatch(a: any, b: any) {
  const sameScore =
    Number(a.home_score) === Number(b.home_score) &&
    Number(a.away_score) === Number(b.away_score);

  const sameForfeit =
    Boolean(a.is_forfeit) === Boolean(b.is_forfeit) &&
    String(a.forfeit_team_id || "") === String(b.forfeit_team_id || "");

  return sameScore && sameForfeit;
}

async function submitPlayoffScore({
  gameId,
  submittingTeamId,
  homeScore,
  awayScore,
  submitterName,
  submitterEmail,
  isForfeit,
  forfeitTeamId,
  forfeitNote,
}: {
  gameId: string;
  submittingTeamId: string;
  homeScore: number;
  awayScore: number;
  submitterName: unknown;
  submitterEmail: unknown;
  isForfeit: unknown;
  forfeitTeamId: string | null | undefined;
  forfeitNote: unknown;
}) {
  if (!SEASON_PHASE.playoffSchedulePublished) {
    throw new PlayoffResultError(
      "Playoff score submissions open after the official schedule is published.",
      423
    );
  }

  if (homeScore === awayScore) {
    throw new PlayoffResultError("A playoff game cannot end in a tie.");
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("playoff_games")
    .select(
      "id, game_number, status, home_team_id, away_team_id, scheduled_at"
    )
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!game) throw new PlayoffResultError("Playoff game not found.", 404);
  if (game.status === "completed") {
    throw new PlayoffResultError(
      "This playoff game already has an accepted score."
    );
  }
  if (
    game.status !== "scheduled" ||
    !game.scheduled_at ||
    !game.home_team_id ||
    !game.away_team_id
  ) {
    throw new PlayoffResultError(
      "This playoff matchup is not ready for score submissions."
    );
  }

  const submittingIsHome = submittingTeamId === game.home_team_id;
  const submittingIsAway = submittingTeamId === game.away_team_id;
  if (!submittingIsHome && !submittingIsAway) {
    throw new PlayoffResultError(
      "Submitting team must be one of the teams in this playoff game."
    );
  }

  const parsedIsForfeit = Boolean(isForfeit);
  const cleanForfeitTeamId = parsedIsForfeit ? forfeitTeamId || null : null;
  if (
    parsedIsForfeit &&
    cleanForfeitTeamId !== game.home_team_id &&
    cleanForfeitTeamId !== game.away_team_id
  ) {
    throw new PlayoffResultError(
      "Forfeit team must be one of the teams in this playoff game."
    );
  }

  const note = makePlayoffScoreNote(gameId);
  const { data: existingSubmission, error: existingError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("id")
      .is("game_id", null)
      .eq("notes", note)
      .eq("submitting_team_id", submittingTeamId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existingSubmission) {
    throw new PlayoffResultError(
      "Your team has already submitted a score for this playoff game."
    );
  }

  const opposingTeamId = submittingIsHome
    ? game.away_team_id
    : game.home_team_id;
  const submissionPayload = {
    game_id: null,
    submitting_team_id: submittingTeamId,
    home_score: homeScore,
    away_score: awayScore,
    submitter_name: String(submitterName || "").trim() || null,
    submitter_email: String(submitterEmail || "").trim() || null,
    notes: note,
    status: "pending",
    is_forfeit: parsedIsForfeit,
    forfeit_team_id: cleanForfeitTeamId,
    forfeit_note: parsedIsForfeit
      ? String(forfeitNote || "").trim() || null
      : null,
  };

  const { data: newSubmission, error: insertError } = await supabaseAdmin
    .from("score_submissions")
    .insert(submissionPayload)
    .select("*")
    .single();

  if (insertError) throw new Error(insertError.message);

  const { data: opposingSubmission, error: opposingError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .is("game_id", null)
      .eq("notes", note)
      .eq("submitting_team_id", opposingTeamId)
      .eq("status", "pending")
      .maybeSingle();

  if (opposingError) throw new Error(opposingError.message);

  if (opposingSubmission && scoresMatch(newSubmission, opposingSubmission)) {
    const result = await recordPlayoffResult({
      gameId,
      homeScore,
      awayScore,
    });

    const { error: submissionsUpdateError } = await supabaseAdmin
      .from("score_submissions")
      .update({
        status: "approved",
        auto_approved: true,
      })
      .in("id", [newSubmission.id, opposingSubmission.id]);

    if (submissionsUpdateError) {
      throw new Error(submissionsUpdateError.message);
    }

    return {
      success: true,
      autoApproved: true,
      gameNumber: result.gameNumber,
      message:
        "Playoff score approved because both teams matched. The bracket has advanced.",
    };
  }

  return {
    success: true,
    autoApproved: false,
    gameNumber: game.game_number,
    message:
      "Playoff score submitted. It will be approved when the other team matches it or an admin reviews it.",
  };
}

export async function POST(request: Request) {
  const body = await request.json();

  const {
    gameType,
    gameId,
    submittingTeamId,
    homeScore,
    awayScore,
    submitterName,
    submitterEmail,
    isForfeit,
    forfeitTeamId,
    forfeitNote,
  } = body;

  if (!gameId) {
    return NextResponse.json({ error: "Missing game ID." }, { status: 400 });
  }

  if (!submittingTeamId) {
    return NextResponse.json(
      { error: "Please select which team you are submitting for." },
      { status: 400 }
    );
  }

  const parsedHomeScore = Number(homeScore);
  const parsedAwayScore = Number(awayScore);

  if (
    !Number.isFinite(parsedHomeScore) ||
    !Number.isFinite(parsedAwayScore) ||
    parsedHomeScore < 0 ||
    parsedAwayScore < 0
  ) {
    return NextResponse.json(
      { error: "Scores must be valid non-negative numbers." },
      { status: 400 }
    );
  }

  if (gameType === "playoff") {
    try {
      return NextResponse.json(
        await submitPlayoffScore({
          gameId,
          submittingTeamId,
          homeScore: parsedHomeScore,
          awayScore: parsedAwayScore,
          submitterName,
          submitterEmail,
          isForfeit,
          forfeitTeamId,
          forfeitNote,
        })
      );
    } catch (error: unknown) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not submit the playoff score.",
        },
        { status: error instanceof PlayoffResultError ? error.status : 500 }
      );
    }
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, status, home_team_id, away_team_id")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  if (game.status === "completed") {
    return NextResponse.json(
      { error: "This game already has an accepted score." },
      { status: 400 }
    );
  }

  const submittingIsHome = submittingTeamId === game.home_team_id;
  const submittingIsAway = submittingTeamId === game.away_team_id;

  if (!submittingIsHome && !submittingIsAway) {
    return NextResponse.json(
      { error: "Submitting team must be one of the teams in this game." },
      { status: 400 }
    );
  }

  const parsedIsForfeit = Boolean(isForfeit);
  let cleanForfeitTeamId: string | null = null;

  if (parsedIsForfeit) {
    if (!forfeitTeamId) {
      return NextResponse.json(
        { error: "Please select which team forfeited." },
        { status: 400 }
      );
    }

    const forfeitIsHome = forfeitTeamId === game.home_team_id;
    const forfeitIsAway = forfeitTeamId === game.away_team_id;

    if (!forfeitIsHome && !forfeitIsAway) {
      return NextResponse.json(
        { error: "Forfeit team must be one of the teams in this game." },
        { status: 400 }
      );
    }

    cleanForfeitTeamId = forfeitTeamId;
  }

  const { data: existingSubmission, error: existingError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .eq("game_id", gameId)
      .eq("submitting_team_id", submittingTeamId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingSubmission) {
    return NextResponse.json(
      { error: "Your team has already submitted a score for this game." },
      { status: 400 }
    );
  }

  const opposingTeamId = submittingIsHome
    ? game.away_team_id
    : game.home_team_id;

  const submissionPayload = {
    game_id: gameId,
    submitting_team_id: submittingTeamId,
    home_score: parsedHomeScore,
    away_score: parsedAwayScore,
    submitter_name: String(submitterName || "").trim() || null,
    submitter_email: String(submitterEmail || "").trim() || null,
    status: "pending",
    is_forfeit: parsedIsForfeit,
    forfeit_team_id: parsedIsForfeit ? cleanForfeitTeamId : null,
    forfeit_note: parsedIsForfeit
      ? String(forfeitNote || "").trim() || null
      : null,
  };

  const { data: newSubmission, error: insertError } = await supabaseAdmin
    .from("score_submissions")
    .insert(submissionPayload)
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: matchingOpposingSubmission, error: opposingError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .eq("game_id", gameId)
      .eq("submitting_team_id", opposingTeamId)
      .eq("status", "pending")
      .maybeSingle();

  if (opposingError) {
    return NextResponse.json({ error: opposingError.message }, { status: 500 });
  }

  if (
    matchingOpposingSubmission &&
    scoresMatch(newSubmission, matchingOpposingSubmission)
  ) {
    const { error: gameUpdateError } = await supabaseAdmin
      .from("games")
      .update({
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
        status: "completed",
        submitted_score_pending: false,
        is_forfeit: parsedIsForfeit,
        forfeit_team_id: parsedIsForfeit ? cleanForfeitTeamId : null,
        forfeit_note: parsedIsForfeit
          ? String(forfeitNote || "").trim() || null
          : null,
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
      .update({ status: "approved" })
      .in("id", [newSubmission.id, matchingOpposingSubmission.id]);

    if (submissionsUpdateError) {
      return NextResponse.json(
        { error: submissionsUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      autoApproved: true,
      message:
        "Score submitted and automatically approved because both teams matched.",
    });
  }

  const { error: pendingUpdateError } = await supabaseAdmin
    .from("games")
    .update({ submitted_score_pending: true })
    .eq("id", gameId);

  if (pendingUpdateError) {
    return NextResponse.json(
      { error: pendingUpdateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    autoApproved: false,
    message:
      "Score submitted. It will be approved once the other team submits the same result or an admin reviews it.",
  });
}
