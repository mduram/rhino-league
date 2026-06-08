import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  const body = await request.json();

  const {
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