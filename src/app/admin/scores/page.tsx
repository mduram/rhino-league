import { supabase } from "@/lib/supabase";
import AdminScoresClient from "./AdminScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminScoresPage() {
  const { data: games, error } = await supabase
    .from("games")
    .select(`
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
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Score Control Center
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Review submitted scores, manually add missing results, edit accepted
          scores, and control whether games are scheduled or completed.
        </p>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        ) : (
          <div className="mt-8">
            <AdminScoresClient games={games || []} />
          </div>
        )}
      </div>
    </main>
  );
}