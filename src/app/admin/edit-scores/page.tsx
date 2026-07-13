import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import EditScoresClient from "./EditScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditScoresPage() {
  const { data: games, error } = await supabaseAdmin
    .from("games")
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
    .eq("status", "completed")
    .order("scheduled_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 lg:px-8">
        <Link
          href="/admin"
          className="text-sm font-black text-[#C4963E] hover:text-[#F3EEE6]"
        >
          ← Admin
        </Link>

        <h1 className="mt-4 text-4xl font-black">Edit Final Scores</h1>

        <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-200">
          {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-black text-[#C4963E] hover:text-[#F3EEE6]"
      >
        ← Admin
      </Link>

      <div className="mt-4 rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-black">Edit Final Scores</h1>

        <p className="mt-3 max-w-3xl leading-7 text-red-100/70">
          Edit scores for games that are already marked completed. Use this if a
          submitted score was accepted incorrectly or needs to be corrected later.
        </p>
      </div>

      <div className="mt-8">
        <EditScoresClient games={games || []} />
      </div>
    </main>
  );
}