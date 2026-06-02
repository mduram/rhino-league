import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScoreSubmissionsClient from "./ScoreSubmissionsClient";

export default async function ScoreSubmissionsPage() {
  const { data: submissions, error } = await supabaseAdmin
    .from("score_submissions")
    .select(`
      id,
      game_id,
      home_score,
      away_score,
      submitted_by,
      notes,
      status,
      created_at,
      game:games (
        id,
        scheduled_at,
        location,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-orange-400">
          Admin
        </p>

        <h1 className="mb-8 text-4xl font-black">Score Submissions</h1>

        <div className="mb-8 flex flex-wrap gap-3">
          <a
            href="/admin"
            className="rounded-full border border-white/10 px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            Back to Admin
          </a>

          <a
            href="/admin/login"
            className="rounded-full bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20"
          >
            Admin Login
          </a>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        ) : (
          <ScoreSubmissionsClient submissions={submissions || []} />
        )}
      </div>
    </main>
  );
}