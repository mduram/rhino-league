import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminScoresClient from "./AdminScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminScoresPage() {
  const { data: games, error: gamesError } = await supabaseAdmin
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
      is_forfeit,
      forfeit_team_id,
      forfeit_note,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .neq("status", "completed")
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const { data: pendingSubmissions, error: submissionsError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

  if (gamesError || submissionsError) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
            Admin
          </p>

          <h1 className="text-4xl font-black text-white">
            Score Control Center
          </h1>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {gamesError?.message || submissionsError?.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white">
          Score Control Center
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Review open score submissions, see whether one or both teams have
          submitted, accept matching results, reject bad submissions, or manually
          add a score when needed.
        </p>

        <AdminScoresClient
          games={games || []}
          pendingSubmissions={pendingSubmissions || []}
        />
      </div>
    </main>
  );
}