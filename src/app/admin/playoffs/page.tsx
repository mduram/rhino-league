import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PlayoffAdminClient from "./PlayoffAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPlayoffsPage() {
  const { data: teams, error } = await supabaseAdmin
    .from("teams")
    .select(
      "id, name, league, logo_url, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
    )
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin" className="text-sm font-bold text-[#C4963E]">
            ← Back to Admin
          </Link>

          <h1 className="mt-4 text-4xl font-black text-white">
            Playoff Eligibility
          </h1>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-[#C4963E]">
          ← Back to Admin
        </Link>

        <p className="mt-6 mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white">
          Playoff Eligibility
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Use this page to disqualify or restore teams for playoffs. Disqualified
          teams still appear in standings, but they are clearly marked and moved
          below playoff-eligible teams.
        </p>

        <PlayoffAdminClient teams={teams || []} />
      </div>
    </main>
  );
}