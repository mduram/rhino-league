import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncWorldCupMatches } from "@/lib/syncWorldCup";

type WorldCupBet = {
  id: string;
  user_id: string;
  match_id: string;
  side: "home" | "draw" | "away";
  amount: number | null;
  odds: number | null;
  potential_payout: number | null;
  status: "open" | "won" | "lost" | "cancelled";
};

function getPotentialPayout(bet: WorldCupBet) {
  const storedPayout = Number(bet.potential_payout || 0);

  if (storedPayout > 0) {
    return storedPayout;
  }

  return Math.floor(Number(bet.amount || 0) * Number(bet.odds || 0));
}

async function settleWorldCupBets() {
  try {
    await syncWorldCupMatches();
  } catch (error) {
    console.error("World Cup sync failed during closeout:", error);
  }

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("world_cup_matches")
    .select("id, status, winner")
    .eq("status", "completed");

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const completedById = new Map(
    (matches || []).map((match) => [match.id, match])
  );

  const { data: bets, error: betsError } = await supabaseAdmin
    .from("world_cup_bets")
    .select(
      "id, user_id, match_id, side, amount, odds, potential_payout, status"
    )
    .eq("status", "open");

  if (betsError) {
    throw new Error(betsError.message);
  }

  let checkedBets = 0;
  let settledBets = 0;
  let paidUsers = 0;
  let totalPaid = 0;

  for (const bet of (bets || []) as WorldCupBet[]) {
    checkedBets += 1;

    const match = completedById.get(bet.match_id);

    if (!match || !match.winner) {
      continue;
    }

    const won = bet.side === match.winner;
    const nextStatus = won ? "won" : "lost";

    const { data: claimedBet, error: claimError } = await supabaseAdmin
      .from("world_cup_bets")
      .update({
        status: nextStatus,
        settled_at: new Date().toISOString(),
      })
      .eq("id", bet.id)
      .eq("status", "open")
      .select(
        "id, user_id, match_id, side, amount, odds, potential_payout, status"
      )
      .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claimedBet) {
      continue;
    }

    settledBets += 1;

    if (won) {
      const payout = getPotentialPayout(claimedBet as WorldCupBet);

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, rhino_coins")
        .eq("id", claimedBet.user_id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      if (!profile) {
        continue;
      }

      const { error: payoutError } = await supabaseAdmin
        .from("profiles")
        .update({
          rhino_coins: Number(profile.rhino_coins || 0) + payout,
        })
        .eq("id", claimedBet.user_id);

      if (payoutError) {
        throw new Error(payoutError.message);
      }

      paidUsers += 1;
      totalPaid += payout;
    }
  }

  const { error: archiveError } = await supabaseAdmin
    .from("world_cup_matches")
    .update({
      betting_archived: true,
      updated_at: new Date().toISOString(),
    })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (archiveError) {
    throw new Error(archiveError.message);
  }

  return {
    checkedBets,
    settledBets,
    paidUsers,
    totalPaid,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  try {
    const summary = await settleWorldCupBets();

    return NextResponse.json({
      success: true,
      summary,
      message: `World Cup closeout complete. ${summary.settledBets} bets settled and ${summary.totalPaid} Rhino Coins paid.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Could not close World Cup betting.",
      },
      { status: 500 }
    );
  }
}