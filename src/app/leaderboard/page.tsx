import Link from "next/link";

import PageShell from "@/components/PageShell";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Profile = {
  id: string;
  display_name: string | null;
  rhino_coins: number | null;
  created_at: string | null;
};

type OpenBet = {
  user_id: string;
  amount: number | null;
};

function sumOpenBetsByUser(bets: OpenBet[]) {
  return bets.reduce((acc: Record<string, number>, bet) => {
    if (!bet.user_id) return acc;

    acc[bet.user_id] =
      (acc[bet.user_id] || 0) + Number(bet.amount || 0);

    return acc;
  }, {});
}

export default async function LeaderboardPage() {
  const { data: profiles, error: profilesError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, display_name, rhino_coins, created_at")
      .order("created_at", { ascending: true });

  const { data: openGameBets, error: openGameBetsError } =
    await supabaseAdmin
      .from("game_bets")
      .select("user_id, amount")
      .eq("status", "open");

  const {
    data: openFuturesBets,
    error: openFuturesBetsError,
  } = await supabaseAdmin
    .from("futures_bets")
    .select("user_id, amount")
    .eq("status", "open");

  let openPlayoffBets: OpenBet[] = [];
  let openPlayoffBetsError: { message: string } | null = null;

  if (SEASON_PHASE.playoffBettingOpen) {
    const playoffResult = await supabaseAdmin
      .from("playoff_game_bets")
      .select("user_id, amount")
      .eq("status", "open");

    openPlayoffBets = playoffResult.data || [];
    openPlayoffBetsError = playoffResult.error;
  }

  const {
    data: openWorldCupBets,
    error: openWorldCupBetsError,
  } = await supabaseAdmin
    .from("world_cup_bets")
    .select("user_id, amount")
    .eq("status", "open");

  if (
    profilesError ||
    openGameBetsError ||
    openFuturesBetsError ||
    openWorldCupBetsError ||
    openPlayoffBetsError
  ) {
    return (
      <PageShell title="Rhino Leaderboard">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {profilesError?.message ||
            openGameBetsError?.message ||
            openFuturesBetsError?.message ||
            openWorldCupBetsError?.message ||
            openPlayoffBetsError?.message}
        </div>
      </PageShell>
    );
  }

  const openGameBetsByUser =
    sumOpenBetsByUser(openGameBets || []);

  const openFuturesBetsByUser =
    sumOpenBetsByUser(openFuturesBets || []);

  const openWorldCupBetsByUser =
    sumOpenBetsByUser(openWorldCupBets || []);

  const openPlayoffBetsByUser = sumOpenBetsByUser(openPlayoffBets);

  const leaderboard = (profiles || [])
    .map((profile: Profile) => {
      const currentBalance =
        Number(profile.rhino_coins || 0);

      const openGameStake =
        openGameBetsByUser[profile.id] || 0;

      const openFuturesStake =
        openFuturesBetsByUser[profile.id] || 0;

      const openWorldCupStake =
        openWorldCupBetsByUser[profile.id] || 0;

      const openPlayoffStake = openPlayoffBetsByUser[profile.id] || 0;

      const openStake =
        openGameStake +
        openFuturesStake +
        openWorldCupStake +
        openPlayoffStake;

      const leaderboardBalance =
        currentBalance + openStake;

      return {
        ...profile,

        currentBalance,

        openGameStake,
        openFuturesStake,
        openWorldCupStake,
        openPlayoffStake,

        openStake,
        leaderboardBalance,
      };
    })
    .sort((a, b) => {
      if (
        b.leaderboardBalance !==
        a.leaderboardBalance
      ) {
        return (
          b.leaderboardBalance -
          a.leaderboardBalance
        );
      }

      if (
        b.currentBalance !==
        a.currentBalance
      ) {
        return (
          b.currentBalance -
          a.currentBalance
        );
      }

      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    });

  return (
    <PageShell
      title="Rhino Leaderboard"
      subtitle="Rankings include Rhino Coins currently available plus Rhino Coins locked in open bets."
    >
      <div className="mb-6 rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-5 text-red-100/80">
        <p className="font-black text-[#F3EEE6]">
          Leaderboard balance:
        </p>

        <p className="mt-2 text-sm leading-6 text-red-100/70">
          This ranking counts your available Rhino Coins plus
          coins currently locked in open volleyball, futures, and playoff
          bets. Any legacy World Cup picks waiting for settlement are also
          counted. You only lose those coins on the leaderboard if the bet
          resolves as lost.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/betting"
          className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A]"
        >
          Place Bets
        </Link>

        <Link
          href="/my-bets"
          className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-5 py-3 font-black text-white transition hover:bg-white/10"
        >
          My Bets
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 shadow-2xl shadow-black/30">
        <table className="w-full min-w-[950px] border-collapse">
          <thead className="bg-[#C4963E]/15 text-left">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Username</th>
              <th className="p-4">
                Leaderboard Balance
              </th>
              <th className="p-4">Available</th>
              <th className="p-4">Open Bets</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((profile, index) => (
              <tr
                key={profile.id}
                className="border-t border-[#C4963E]/15"
              >
                <td className="p-4 font-black">
                  {index + 1}
                </td>

                <td className="p-4 font-black text-white">
                  {profile.display_name ||
                    "Anonymous Rhino"}
                </td>

                <td className="p-4">
                  <span className="rounded-full bg-[#C4963E] px-4 py-2 font-black text-[#16070B]">
                    {profile.leaderboardBalance}
                  </span>
                </td>

                <td className="p-4 text-red-100/80">
                  {profile.currentBalance}
                </td>

                <td className="p-4 text-red-100/80">
                  {profile.openStake}

                  {profile.openStake > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-red-100/45">
                      <span>
                        {profile.openGameStake} game
                      </span>

                      {profile.openPlayoffStake > 0 && (
                        <>
                          <span>·</span>
                          <span>{profile.openPlayoffStake} playoff</span>
                        </>
                      )}

                      <span>·</span>

                      <span>
                        {profile.openFuturesStake} futures
                      </span>

                      {profile.openWorldCupStake > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {profile.openWorldCupStake} legacy World Cup
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </td>

                <td className="p-4 text-red-100/60">
                  {profile.created_at
                    ? new Date(
                        profile.created_at
                      ).toLocaleDateString()
                    : ""}
                </td>
              </tr>
            ))}

            {leaderboard.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-5 text-red-100/60"
                >
                  No Rhino Coin accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
