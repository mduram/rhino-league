import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WinningSide = "home" | "away" | null;

type GameBet = {
  id: string;
  user_id: string;
  game_id: string;
  side: "home" | "away";
  amount: number | null;
  odds: number | null;
  potential_payout: number | null;
  status: "open" | "won" | "lost" | "cancelled";
};

function getWinningSide(homeScore: number, awayScore: number): WinningSide {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return null;
}

function getPotentialPayout(bet: GameBet) {
  const storedPayout = Number(bet.potential_payout || 0);

  if (storedPayout > 0) {
    return storedPayout;
  }

  return Math.floor(Number(bet.amount || 0) * Number(bet.odds || 0));
}

async function resettleGameBets({
  gameId,
  winningSide,
}: {
  gameId: string;
  winningSide: WinningSide;
}) {
  const { data: bets, error: betsError } = await supabaseAdmin
    .from("game_bets")
    .select(
      "id, user_id, game_id, side, amount, odds, potential_payout, status"
    )
    .eq("game_id", gameId)
    .in("status", ["open", "won", "lost"]);

  if (betsError) {
    throw new Error(betsError.message);
  }

  let changedBets = 0;
  let paidUsers = 0;
  let chargedBackUsers = 0;
  let totalPaid = 0;
  let totalChargedBack = 0;

  for (const bet of (bets || []) as GameBet[]) {
    const previousWon = bet.status === "won";
    const shouldWin = winningSide !== null && bet.side === winningSide;

    const nextStatus = shouldWin ? "won" : "lost";
    const nextWon = nextStatus === "won";

    const potentialPayout = getPotentialPayout(bet);

    const previousPayout = previousWon ? potentialPayout : 0;
    const nextPayout = nextWon ? potentialPayout : 0;

    const balanceDelta = nextPayout - previousPayout;

    const { error: betUpdateError } = await supabaseAdmin
      .from("game_bets")
      .update({
        status: nextStatus,
        settled_at: new Date().toISOString(),
      })
      .eq("id", bet.id);

    if (betUpdateError) {
      throw new Error(betUpdateError.message);
    }

    if (bet.status !== nextStatus) {
      changedBets += 1;
    }

    if (balanceDelta !== 0) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, rhino_coins")
        .eq("id", bet.user_id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile) {
        continue;
      }

      const currentBalance = Number(profile.rhino_coins || 0);
      const nextBalance = currentBalance + balanceDelta;

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          rhino_coins: nextBalance,
        })
        .eq("id", bet.user_id);

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message);
      }

      if (balanceDelta > 0) {
        paidUsers += 1;
        totalPaid += balanceDelta;
      } else {
        chargedBackUsers += 1;
        totalChargedBack += Math.abs(balanceDelta);
      }
    }
  }

  return {
    checkedBets: bets?.length || 0,
    changedBets,
    paidUsers,
    chargedBackUsers,
    totalPaid,
    totalChargedBack,
  };
}

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
    return NextResponse.json({ error: "Missing game ID." }, { status: 400 });
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
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
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

  const updatePayload: Record<string, unknown> = {
    home_score: parsedHomeScore,
    away_score: parsedAwayScore,
    status: nextStatus,
    is_forfeit: parsedIsForfeit,
    forfeit_team_id: parsedIsForfeit ? cleanForfeitTeamId : null,
    forfeit_note: parsedIsForfeit
      ? String(forfeitNote || "").trim() || null
      : null,
  };

  if (clearPending) {
    updatePayload.submitted_score_pending = false;
  }

  const { data: updatedGame, error } = await supabaseAdmin
    .from("games")
    .update(updatePayload)
    .eq("id", gameId)
    .select(
      `
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
    `
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updatedGame) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  let resettleSummary = null;

  if (nextStatus === "completed") {
    const winningSide = getWinningSide(parsedHomeScore, parsedAwayScore);

    if (!winningSide) {
      return NextResponse.json(
        {
          error:
            "Cannot settle bets for a tied score. Volleyball games need a winner.",
        },
        { status: 400 }
      );
    }

    try {
      resettleSummary = await resettleGameBets({
        gameId,
        winningSide,
      });
    } catch (settleError: any) {
      return NextResponse.json(
        {
          error:
            settleError?.message ||
            "Score was saved, but bets could not be re-settled.",
        },
        { status: 500 }
      );
    }
  }

  const baseMessage =
    nextStatus === "completed"
      ? parsedIsForfeit
        ? "Forfeit score saved and game marked completed."
        : "Score saved and game marked completed."
      : "Score saved and game marked scheduled.";

  const betMessage = resettleSummary
    ? ` Bets re-settled: ${resettleSummary.changedBets} changed, ${resettleSummary.totalPaid} coins paid, ${resettleSummary.totalChargedBack} coins charged back.`
    : "";

  return NextResponse.json({
    success: true,
    game: updatedGame,
    resettleSummary,
    message: `${baseMessage}${betMessage}`,
  });
}