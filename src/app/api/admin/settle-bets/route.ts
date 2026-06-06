import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  const { data: completedGames, error: gamesError } = await supabaseAdmin
    .from("games")
    .select("id, home_team_id, away_team_id, home_score, away_score, status")
    .eq("status", "completed");

  if (gamesError) {
    return NextResponse.json(
      { error: gamesError.message },
      { status: 500 }
    );
  }

  let settled = 0;
  let paidOut = 0;
  let skippedTies = 0;

  for (const game of completedGames || []) {
    const homeScore = Number(game.home_score || 0);
    const awayScore = Number(game.away_score || 0);

    if (homeScore === awayScore) {
      skippedTies += 1;
      continue;
    }

    const winningSide = homeScore > awayScore ? "home" : "away";

    const { data: openBets, error: betsError } = await supabaseAdmin
      .from("game_bets")
      .select("*")
      .eq("game_id", game.id)
      .eq("status", "open");

    if (betsError) {
      return NextResponse.json(
        { error: betsError.message },
        { status: 500 }
      );
    }

    for (const bet of openBets || []) {
      const won = bet.side === winningSide;

      if (won) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id, rhino_coins")
          .eq("id", bet.user_id)
          .maybeSingle();

        if (profileError) {
          return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
          );
        }

        if (profile) {
          const payout = Number(bet.potential_payout || 0);
          const nextCoins = Number(profile.rhino_coins || 0) + payout;

          const { error: coinUpdateError } = await supabaseAdmin
            .from("profiles")
            .update({
              rhino_coins: nextCoins,
            })
            .eq("id", bet.user_id);

          if (coinUpdateError) {
            return NextResponse.json(
              { error: coinUpdateError.message },
              { status: 500 }
            );
          }

          paidOut += payout;
        }
      }

      const { error: settleError } = await supabaseAdmin
        .from("game_bets")
        .update({
          status: won ? "won" : "lost",
        })
        .eq("id", bet.id);

      if (settleError) {
        return NextResponse.json(
          { error: settleError.message },
          { status: 500 }
        );
      }

      settled += 1;
    }
  }

  return NextResponse.json({
    success: true,
    settled,
    paidOut,
    skippedTies,
    message: `Settled ${settled} bets and paid out ${paidOut} Rhino Coins.`,
  });
}