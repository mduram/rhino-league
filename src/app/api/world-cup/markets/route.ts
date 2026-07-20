import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncWorldCupMatches } from "@/lib/syncWorldCup";
import { syncWorldCupOdds } from "@/lib/syncWorldCupOdds";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await syncWorldCupMatches();
  } catch (error: any) {
    console.error(
      "World Cup fixture sync warning:",
      error?.message || error
    );
  }

  try {
    await syncWorldCupOdds();
  } catch (error: any) {
    console.error(
      "World Cup odds sync warning:",
      error?.message || error
    );
  }

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("world_cup_matches")
    .select("*")
    .in("status", ["scheduled", "live", "completed"])
    .eq("betting_archived", false)
    .order("scheduled_at", {
      ascending: true,
    });

  if (matchesError) {
    return NextResponse.json(
      {
        error: matchesError.message,
      },
      {
        status: 500,
      }
    );
  }

  const { data: bets, error: betsError } = await supabaseAdmin
    .from("world_cup_bets")
    .select("match_id, side, amount, status")
    .in("status", ["open", "won", "lost"]);

  if (betsError) {
    return NextResponse.json(
      {
        error: betsError.message,
      },
      {
        status: 500,
      }
    );
  }

  const marketsByMatchId: Record<string, any> = {};

  for (const match of matches || []) {
    const matchBets = (bets || []).filter(
      (bet) => bet.match_id === match.id
    );

    const homeBets = matchBets.filter((bet) => bet.side === "home");
    const drawBets = matchBets.filter((bet) => bet.side === "draw");
    const awayBets = matchBets.filter((bet) => bet.side === "away");

    const homeAmount = homeBets.reduce(
      (sum, bet) => sum + Number(bet.amount || 0),
      0
    );

    const drawAmount = drawBets.reduce(
      (sum, bet) => sum + Number(bet.amount || 0),
      0
    );

    const awayAmount = awayBets.reduce(
      (sum, bet) => sum + Number(bet.amount || 0),
      0
    );

    marketsByMatchId[match.id] = {
      matchId: match.id,

      homeBetCount: homeBets.length,
      drawBetCount: drawBets.length,
      awayBetCount: awayBets.length,

      totalBetCount: matchBets.length,

      homeAmount,
      drawAmount,
      awayAmount,

      totalMarket: homeAmount + drawAmount + awayAmount,

      homeOdds:
        match.odds_home !== null && match.odds_home !== undefined
          ? Number(match.odds_home)
          : null,

      drawOdds:
        match.odds_draw !== null && match.odds_draw !== undefined
          ? Number(match.odds_draw)
          : null,

      awayOdds:
        match.odds_away !== null && match.odds_away !== undefined
          ? Number(match.odds_away)
          : null,

      oddsSource: match.odds_source || null,
      oddsUpdatedAt: match.odds_updated_at || null,
    };
  }

  return NextResponse.json({
    success: true,
    matches: matches || [],
    marketsByMatchId,
  });
}