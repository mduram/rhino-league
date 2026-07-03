import Link from "next/link";
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
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `
    )
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  if (teamsError || gamesError) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black text-white">
            Rhino League Admin
          </h1>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {teamsError?.message || gamesError?.message}
          </div>
        </div>
      </main>
    );
  }

  const adminLinks = [
    { href: "/admin/login", label: "Admin Login" },
    { href: "/admin/scores", label: "Score Control Center" },
    { href: "/admin/playoffs", label: "Playoff Eligibility" },
    { href: "/admin/import-teams", label: "Import Teams" },
    { href: "/admin/scheduler-smart", label: "Smart Auto-Scheduler" },
    { href: "/admin/rescheduler", label: "Targeted Rescheduler" },
    { href: "/admin/scheduler", label: "Open Scheduler" },
    { href: "/admin/score-submissions", label: "Review Score Submissions" },
    { href: "/admin/photos", label: "Manage Photos" },
    { href: "/admin/betting", label: "Manage Betting" },
    { href: "/betting", label: "Public Betting Page" },
  ];

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Rhino League
        </p>

        <h1 className="text-4xl font-black text-white">
          Admin
        </h1>

        <div className="mt-6 flex flex-wrap gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <AdminForms teams={teams || []} games={games || []} />
        </div>
      </div>
    </main>
  );
}