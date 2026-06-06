import Link from "next/link";
import PageShell from "@/components/PageShell";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, rhino_coins, created_at")
    .order("rhino_coins", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <PageShell title="Rhino Coin Leaderboard">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Rhino Coin Leaderboard"
      subtitle="The richest rhinos in the league. Fake coins, real glory."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/betting"
          className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
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

      <div className="overflow-hidden rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 shadow-2xl shadow-black/30">
        <table className="w-full min-w-[650px] border-collapse">
          <thead className="bg-[#A51C30]/20 text-left">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Username</th>
              <th className="p-4">Rhino Coins</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>

          <tbody>
            {(profiles || []).map((profile, index) => (
              <tr key={profile.id} className="border-t border-[#A51C30]/20">
                <td className="p-4">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                      index === 0
                        ? "bg-[#C4963E] text-[#16070B]"
                        : index === 1
                          ? "bg-white/20 text-white"
                          : index === 2
                            ? "bg-[#A51C30] text-white"
                            : "bg-black/25 text-red-100"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>

                <td className="p-4 font-black text-white">
                  {profile.display_name || "Anonymous Rhino"}
                </td>

                <td className="p-4">
                  <span className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-4 py-2 font-black text-[#F3EEE6]">
                    {profile.rhino_coins} 🦏
                  </span>
                </td>

                <td className="p-4 text-red-100/60">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(profiles || []).length === 0 && (
          <p className="p-6 text-red-100/60">
            No Rhino Coin accounts yet.
          </p>
        )}
      </div>
    </PageShell>
  );
}