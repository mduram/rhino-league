import { NextResponse } from "next/server";

import { calculateMarket } from "@/lib/betting";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromRequest(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(
    "Bearer ",
    ""
  );
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  if (
    !SEASON_PHASE.playoffSchedulePublished ||
    !SEASON_PHASE.playoffBettingOpen
  ) {
    return NextResponse.json(
      {
        error:
          "Playoff betting is locked until the official Friday bracket reveal.",
      },
      { status: 423 }
    );
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "You need to log in to place a playoff pick." },
      { status: 401 }
    );
  }

  const { gameId, side, amount } = await request.json();
  const parsedAmount = Math.floor(Number(amount || 0));

  if (!gameId || (side !== "home" && side !== "away")) {
    return NextResponse.json(
      { error: "Choose a valid playoff game and team." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "Bet amount must be greater than 0." },
      { status: 400 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("playoff_games")
    .select("id, scheduled_at, status, home_team_id, away_team_id")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  if (!game || game.status !== "scheduled" || !game.scheduled_at) {
    return NextResponse.json(
      { error: "This playoff game is not open for betting." },
      { status: 400 }
    );
  }

  if (!game.home_team_id || !game.away_team_id) {
    return NextResponse.json(
      { error: "Both teams must be confirmed before betting opens." },
      { status: 400 }
    );
  }

  if (Date.now() >= new Date(game.scheduled_at).getTime()) {
    return NextResponse.json(
      { error: "Betting for this playoff game is closed." },
      { status: 400 }
    );
  }

  const { data: existingBets, error: betsError } = await supabaseAdmin
    .from("playoff_game_bets")
    .select("side, amount")
    .eq("playoff_game_id", gameId)
    .eq("status", "open");

  if (betsError) {
    return NextResponse.json({ error: betsError.message }, { status: 500 });
  }

  const market = calculateMarket({
    gameId,
    homeVotes: 0,
    awayVotes: 0,
    bets: (existingBets || []).map((bet) => ({
      side: bet.side as "home" | "away",
      amount: Number(bet.amount || 0),
    })),
  });

  const odds = side === "home" ? market.homeOdds : market.awayOdds;
  const potentialPayout = Math.floor(parsedAmount * odds);
  const { data, error: placementError } = await supabaseAdmin.rpc(
    "place_playoff_game_bet",
    {
      p_user_id: user.id,
      p_playoff_game_id: gameId,
      p_side: side,
      p_amount: parsedAmount,
      p_odds: odds,
      p_potential_payout: potentialPayout,
    }
  );

  if (placementError) {
    return NextResponse.json(
      { error: placementError.message },
      { status: 400 }
    );
  }

  const placement = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    success: true,
    bet: {
      id: placement?.bet_id,
      playoff_game_id: gameId,
      side,
      amount: parsedAmount,
      odds,
      potential_payout: potentialPayout,
      status: "open",
    },
    rhinoCoins: placement?.remaining_coins,
  });
}
