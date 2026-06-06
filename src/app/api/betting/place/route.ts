import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMarket } from "@/lib/betting";

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "You need to log in to place a Rhino Coin pick." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const { gameId, side, amount } = body;

  if (!gameId) {
    return NextResponse.json(
      { error: "Missing game ID." },
      { status: 400 }
    );
  }

  if (side !== "home" && side !== "away") {
    return NextResponse.json(
      { error: "Pick side must be home or away." },
      { status: 400 }
    );
  }

  const parsedAmount = Math.floor(Number(amount || 0));

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "Bet amount must be greater than 0." },
      { status: 400 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      scheduled_at,
      status,
      home_votes,
      away_votes
    `)
    .eq("id", gameId)
    .maybeSingle();

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

  if (game.status !== "scheduled") {
    return NextResponse.json(
      { error: "You can only place Rhino Coin picks on scheduled games." },
      { status: 400 }
    );
  }

  if (!game.scheduled_at) {
    return NextResponse.json(
      { error: "This game does not have a scheduled start time." },
      { status: 400 }
    );
  }

  const gameStart = new Date(game.scheduled_at).getTime();
  const now = Date.now();

  if (now >= gameStart) {
    return NextResponse.json(
      { error: "Betting for this game is closed." },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Refresh the page and try again." },
      { status: 404 }
    );
  }

  if (Number(profile.rhino_coins || 0) < parsedAmount) {
    return NextResponse.json(
      { error: "Not enough Rhino Coins." },
      { status: 400 }
    );
  }

  const { data: existingOpenBet, error: existingBetError } = await supabaseAdmin
    .from("game_bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .eq("status", "open")
    .maybeSingle();

  if (existingBetError) {
    return NextResponse.json(
      { error: existingBetError.message },
      { status: 500 }
    );
  }

  if (existingOpenBet) {
    return NextResponse.json(
      { error: "You already placed a Rhino Coin pick on this game." },
      { status: 400 }
    );
  }

  const { data: existingBets, error: betsError } = await supabaseAdmin
    .from("game_bets")
    .select("side, amount")
    .eq("game_id", gameId)
    .eq("status", "open");

  if (betsError) {
    return NextResponse.json(
      { error: betsError.message },
      { status: 500 }
    );
  }

  const market = calculateMarket({
    gameId,
    homeVotes: Number(game.home_votes || 0),
    awayVotes: Number(game.away_votes || 0),
    bets: (existingBets || []).map((bet) => ({
      side: bet.side as "home" | "away",
      amount: Number(bet.amount || 0),
    })),
  });

  const odds = side === "home" ? market.homeOdds : market.awayOdds;
  const potentialPayout = Math.floor(parsedAmount * odds);

  const { error: updateCoinsError } = await supabaseAdmin
    .from("profiles")
    .update({
      rhino_coins: Number(profile.rhino_coins || 0) - parsedAmount,
    })
    .eq("id", user.id);

  if (updateCoinsError) {
    return NextResponse.json(
      { error: updateCoinsError.message },
      { status: 500 }
    );
  }

  const { data: createdBet, error: betInsertError } = await supabaseAdmin
    .from("game_bets")
    .insert({
      user_id: user.id,
      game_id: gameId,
      side,
      amount: parsedAmount,
      odds,
      potential_payout: potentialPayout,
      status: "open",
    })
    .select("*")
    .single();

  if (betInsertError) {
    await supabaseAdmin
      .from("profiles")
      .update({
        rhino_coins: Number(profile.rhino_coins || 0),
      })
      .eq("id", user.id);

    return NextResponse.json(
      { error: betInsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    bet: createdBet,
    rhinoCoins: Number(profile.rhino_coins || 0) - parsedAmount,
  });
}