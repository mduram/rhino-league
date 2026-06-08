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
    status,
    clearPending,
    isForfeit,
    forfeitTeamId,
    forfeitNote,
  } = body;

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

  const { data: existingGame, error: existingGameError } = await supabaseAdmin
    .from("games")
    .select("id, home_team_id, away_team_id")
    .eq("id", gameId)
    .maybeSingle();

  if (existingGameError) {
    return NextResponse.json(
      { error: existingGameError.message },
      { status: 500 }
    );
  }

  if (!existingGame) {
    return NextResponse.json(
      { error: "Game not found." },
      { status: 404 }
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

  const nextStatus =
    status === "scheduled" || status === "completed" ? status : "completed";

  const parsedIsForfeit = Boolean(isForfeit);

  let cleanForfeitTeamId: string | null = null;

  if (parsedIsForfeit) {
    if (!forfeitTeamId) {
      return NextResponse.json(
        { error: "Select which team forfeited." },
        { status: 400 }
      );
    }

    const isHomeForfeit = forfeitTeamId === existingGame.home_team_id;
    const isAwayForfeit = forfeitTeamId === existingGame.away_team_id;

    if (!isHomeForfeit && !isAwayForfeit) {
      return NextResponse.json(
        { error: "Forfeit team must be one of the teams in this game." },
        { status: 400 }
      );
    }

    cleanForfeitTeamId = forfeitTeamId;
  }

  const updatePayload: Record<string, any> = {
    home_score: parsedHomeScore,
    away_score: parsedAwayScore,
    status: nextStatus,
    is_forfeit: parsedIsForfeit,
    forfeit_team_id: parsedIsForfeit ? cleanForfeitTeamId : null,
    forfeit_note: parsedIsForfeit ? String(forfeitNote || "").trim() || null : null,
  };

  if (clearPending) {
    updatePayload.submitted_score_pending = false;
  }

  const { data: updatedGame, error } = await supabaseAdmin
    .from("games")
    .update(updatePayload)
    .eq("id", gameId)
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      league,
      submitted_score_pending,
      home_team_id,
      away_team_id,
      is_forfeit,
      forfeit_team_id,
      forfeit_note,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!updatedGame) {
    return NextResponse.json(
      { error: "Game not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    game: updatedGame,
    message:
      nextStatus === "completed"
        ? parsedIsForfeit
          ? "Forfeit score saved and game marked completed."
          : "Score saved and game marked completed."
        : "Score saved and game marked scheduled.",
  });
}