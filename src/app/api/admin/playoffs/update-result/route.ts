import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PlayoffGameRow = {
  id: string;
  game_number: number;
  home_source: string | null;
  away_source: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  loser_team_id: string | null;
  status: string;
  scheduled_at: string | null;
};

function sourceUsesResult(
  source: string | null,
  result: "winner" | "loser",
  gameNumber: number
) {
  const prefix = result === "winner" ? "W" : "L";
  return source?.toUpperCase() === `${prefix} G${gameNumber}`;
}

function getReadyStatus(game: PlayoffGameRow) {
  return game.home_team_id && game.away_team_id
    ? game.scheduled_at
      ? "scheduled"
      : "pending"
    : "pending";
}

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken, gameId, homeScore, awayScore } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  const parsedHomeScore = Number(homeScore);
  const parsedAwayScore = Number(awayScore);

  if (
    !gameId ||
    !Number.isInteger(parsedHomeScore) ||
    !Number.isInteger(parsedAwayScore) ||
    parsedHomeScore < 0 ||
    parsedAwayScore < 0
  ) {
    return NextResponse.json(
      { error: "Enter valid non-negative whole-number scores." },
      { status: 400 }
    );
  }

  if (parsedHomeScore === parsedAwayScore) {
    return NextResponse.json(
      { error: "A playoff game cannot end in a tie." },
      { status: 400 }
    );
  }

  const { data, error: gamesError } = await supabaseAdmin
    .from("playoff_games")
    .select(
      "id, game_number, home_source, away_source, home_team_id, away_team_id, home_score, away_score, winner_team_id, loser_team_id, status, scheduled_at"
    )
    .order("game_number", { ascending: true });

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 });
  }

  const games = (data || []) as PlayoffGameRow[];
  const game = games.find((candidate) => candidate.id === gameId);

  if (!game) {
    return NextResponse.json({ error: "Playoff game not found." }, { status: 404 });
  }

  if (!game.home_team_id || !game.away_team_id) {
    return NextResponse.json(
      { error: "Both teams must be known before recording this result." },
      { status: 400 }
    );
  }

  const winnerTeamId =
    parsedHomeScore > parsedAwayScore ? game.home_team_id : game.away_team_id;
  const loserTeamId =
    parsedHomeScore > parsedAwayScore ? game.away_team_id : game.home_team_id;
  const previousWinnerTeamId = game.winner_team_id;

  if (previousWinnerTeamId && previousWinnerTeamId !== winnerTeamId) {
    const completedDependent = games.find(
      (candidate) =>
        candidate.status === "completed" &&
        (sourceUsesResult(candidate.home_source, "winner", game.game_number) ||
          sourceUsesResult(candidate.away_source, "winner", game.game_number) ||
          sourceUsesResult(candidate.home_source, "loser", game.game_number) ||
          sourceUsesResult(candidate.away_source, "loser", game.game_number))
    );

    if (completedDependent) {
      return NextResponse.json(
        {
          error: `G${completedDependent.game_number} is already complete. Correct that downstream result before changing G${game.game_number}.`,
        },
        { status: 409 }
      );
    }
  }

  const now = new Date().toISOString();
  const { error: resultError } = await supabaseAdmin
    .from("playoff_games")
    .update({
      home_score: parsedHomeScore,
      away_score: parsedAwayScore,
      winner_team_id: winnerTeamId,
      loser_team_id: loserTeamId,
      status: "completed",
      updated_at: now,
    })
    .eq("id", game.id);

  if (resultError) {
    return NextResponse.json({ error: resultError.message }, { status: 500 });
  }

  game.home_score = parsedHomeScore;
  game.away_score = parsedAwayScore;
  game.winner_team_id = winnerTeamId;
  game.loser_team_id = loserTeamId;
  game.status = "completed";

  const advancedGames: number[] = [];

  async function advanceResult(
    sourceGameNumber: number,
    advancedWinnerId: string,
    advancedLoserId: string | null
  ): Promise<void> {
    for (const nextGame of games) {
      if (nextGame.game_number <= sourceGameNumber) continue;

      let changed = false;
      const update: Record<string, unknown> = { updated_at: now };

      if (sourceUsesResult(nextGame.home_source, "winner", sourceGameNumber)) {
        nextGame.home_team_id = advancedWinnerId;
        update.home_team_id = advancedWinnerId;
        changed = true;
      } else if (
        advancedLoserId &&
        sourceUsesResult(nextGame.home_source, "loser", sourceGameNumber)
      ) {
        nextGame.home_team_id = advancedLoserId;
        update.home_team_id = advancedLoserId;
        changed = true;
      }

      if (sourceUsesResult(nextGame.away_source, "winner", sourceGameNumber)) {
        nextGame.away_team_id = advancedWinnerId;
        update.away_team_id = advancedWinnerId;
        changed = true;
      } else if (
        advancedLoserId &&
        sourceUsesResult(nextGame.away_source, "loser", sourceGameNumber)
      ) {
        nextGame.away_team_id = advancedLoserId;
        update.away_team_id = advancedLoserId;
        changed = true;
      }

      if (!changed) continue;

      const isBye =
        nextGame.home_source === "BYE" || nextGame.away_source === "BYE";

      if (isBye) {
        const automaticWinner =
          nextGame.home_source === "BYE"
            ? nextGame.away_team_id
            : nextGame.home_team_id;

        if (automaticWinner) {
          const byeOnHome = nextGame.home_source === "BYE";
          nextGame.home_score = byeOnHome ? 0 : 1;
          nextGame.away_score = byeOnHome ? 1 : 0;
          nextGame.winner_team_id = automaticWinner;
          nextGame.loser_team_id = null;
          nextGame.status = "completed";
          Object.assign(update, {
            home_score: nextGame.home_score,
            away_score: nextGame.away_score,
            winner_team_id: automaticWinner,
            loser_team_id: null,
            status: "completed",
          });
        }
      } else if (nextGame.status !== "completed") {
        nextGame.status = getReadyStatus(nextGame);
        Object.assign(update, {
          status: nextGame.status,
          home_score: null,
          away_score: null,
          winner_team_id: null,
          loser_team_id: null,
        });
      }

      const { error: advanceError } = await supabaseAdmin
        .from("playoff_games")
        .update(update)
        .eq("id", nextGame.id);

      if (advanceError) throw new Error(advanceError.message);
      advancedGames.push(nextGame.game_number);

      if (isBye && nextGame.winner_team_id) {
        await advanceResult(
          nextGame.game_number,
          nextGame.winner_team_id,
          null
        );
      }
    }
  }

  try {
    await advanceResult(game.game_number, winnerTeamId, loserTeamId);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Result saved, but bracket advancement failed: ${error.message}`
            : "Result saved, but bracket advancement failed.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    gameNumber: game.game_number,
    winnerTeamId,
    loserTeamId,
    advancedGames: [...new Set(advancedGames)],
    message: `G${game.game_number} recorded and the bracket was advanced.`,
  });
}
