import { supabase } from "@/lib/supabase";
import AdminForms from "./AdminForms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  const { data: games, error: gamesError } = await supabase
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
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  if (teamsError || gamesError) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black">Rhino League Admin</h1>
          <p className="mt-4 text-red-400">
            {teamsError?.message || gamesError?.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Rhino League
        </p>

        <h1 className="mb-8 text-4xl font-black text-white">
          Admin
        </h1>

        <div className="mb-8 flex flex-wrap gap-3">
          <a
            href="/admin/login"
            className="rounded-full border border-white/10 px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            Admin Login
          </a>

          <a
            href="/admin/scores"
            className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A]"
          >
            Score Control Center
          </a>

          <a
            href="/admin/import-teams"
            className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
          >
            Import Teams
          </a>

          <a
            href="/admin/auto-scheduler"
            className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
          >
            Smart Auto-Scheduler
          </a>

          <a
            href="/admin/reschedule-teams"
            className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A]"
          >
            Targeted Rescheduler
          </a>

          <a
            href="/admin/scheduler"
            className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
          >
            Open Scheduler
          </a>

          <a
            href="/admin/score-submissions"
            className="rounded-full bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20"
          >
            Review Score Submissions
          </a>

          <a
            href="/admin/photos"
            className="rounded-full bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20"
          >
            Manage Photos
          </a>

          <a
            href="/admin/betting"
            className="rounded-full border border-[#C4963E]/40 bg-[#C4963E]/15 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/25"
          >
            Manage Betting
          </a>

          <a
            href="/betting"
            className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            Public Betting Page
          </a>
        </div>

        <AdminForms teams={teams || []} games={games || []} />
      </div>
    </main>
  );
}