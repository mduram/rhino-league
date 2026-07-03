import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WorldCupBetSide =
  | "home"
  | "draw"
  | "away";

async function getUserFromRequest(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    ) || "";

  const token = authHeader.replace(
    "Bearer ",
    ""
  );

  if (!token) return null;

  const { data, error } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function POST(
  request: Request
) {
  const user =
    await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      {
        error:
          "You need to log in to place a World Cup Rhino Coin pick.",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.json();

  const {
    matchId,
    side,
    amount,
  }: {
    matchId?: string;
    side?: WorldCupBetSide;
    amount?: number;
  } = body;

  if (!matchId) {
    return NextResponse.json(
      {
        error:
          "Missing World Cup match ID.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    side !== "home" &&
    side !== "draw" &&
    side !== "away"
  ) {
    return NextResponse.json(
      {
        error:
          "Pick must be home, draw, or away.",
      },
      {
        status: 400,
      }
    );
  }

  const parsedAmount = Math.floor(
    Number(amount || 0)
  );

  if (
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Bet amount must be greater than 0.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: match,
    error: matchError,
  } = await supabaseAdmin
    .from("world_cup_matches")
    .select(
      `
      id,
      status,
      scheduled_at,
      odds_home,
      odds_draw,
      odds_away,
      odds_updated_at
      `
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json(
      {
        error: matchError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!match) {
    return NextResponse.json(
      {
        error:
          "World Cup match not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (match.status !== "scheduled") {
    return NextResponse.json(
      {
        error:
          "Betting is only open on scheduled World Cup matches.",
      },
      {
        status: 400,
      }
    );
  }

  const kickoff = new Date(
    match.scheduled_at
  ).getTime();

  if (Date.now() >= kickoff) {
    return NextResponse.json(
      {
        error:
          "Betting for this World Cup match is closed.",
      },
      {
        status: 400,
      }
    );
  }

  const selectedOdds =
    side === "home"
      ? match.odds_home
      : side === "draw"
        ? match.odds_draw
        : match.odds_away;

  if (
    selectedOdds === null ||
    selectedOdds === undefined ||
    !Number.isFinite(
      Number(selectedOdds)
    ) ||
    Number(selectedOdds) <= 1
  ) {
    return NextResponse.json(
      {
        error:
          "Real bookmaker odds are not currently available for this selection.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, rhino_coins")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      {
        error: profileError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!profile) {
    return NextResponse.json(
      {
        error: "Profile not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    Number(profile.rhino_coins || 0) <
    parsedAmount
  ) {
    return NextResponse.json(
      {
        error:
          "Not enough Rhino Coins.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: existingOpenBet,
    error: existingBetError,
  } = await supabaseAdmin
    .from("world_cup_bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .eq("status", "open")
    .maybeSingle();

  if (existingBetError) {
    return NextResponse.json(
      {
        error:
          existingBetError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (existingOpenBet) {
    return NextResponse.json(
      {
        error:
          "You already placed a Rhino Coin pick on this World Cup match.",
      },
      {
        status: 400,
      }
    );
  }

  const lockedOdds =
    Number(selectedOdds);

  const potentialPayout =
    Math.floor(
      parsedAmount * lockedOdds
    );

  const originalBalance =
    Number(profile.rhino_coins || 0);

  const newBalance =
    originalBalance - parsedAmount;

  const { error: updateCoinsError } =
    await supabaseAdmin
      .from("profiles")
      .update({
        rhino_coins: newBalance,
      })
      .eq("id", user.id);

  if (updateCoinsError) {
    return NextResponse.json(
      {
        error:
          updateCoinsError.message,
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: createdBet,
    error: insertError,
  } = await supabaseAdmin
    .from("world_cup_bets")
    .insert({
      user_id: user.id,
      match_id: matchId,
      side,
      amount: parsedAmount,

      // Freeze the real market price
      // at the instant the Rhino bet is placed.
      odds: lockedOdds,

      potential_payout:
        potentialPayout,

      status: "open",
    })
    .select("*")
    .single();

  if (insertError) {
    await supabaseAdmin
      .from("profiles")
      .update({
        rhino_coins:
          originalBalance,
      })
      .eq("id", user.id);

    return NextResponse.json(
      {
        error: insertError.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    bet: createdBet,
    rhinoCoins: newBalance,
  });
}