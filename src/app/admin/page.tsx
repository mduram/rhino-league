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
      <main className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black">Rhino League Admin</h1>

        <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-red-200">
          {teamsError?.message || gamesError?.message}
        </div>
      </main>
    );
  }

  const adminLinks = [
    { href: "/admin/login", label: "Admin Login" },
    { href: "/admin/scores", label: "Score Control Center" },
    { href: "/admin/edit-scores", label: "Edit Final Scores" },
    { href: "/admin/playoff-bracket", label: "Generate Playoff Bracket" },
    { href: "/admin/playoffs", label: "Playoff Eligibility" },
    { href: "/admin/import-teams", label: "Import Teams" },
    { href: "/admin/scheduler-smart", label: "Smart Auto-Scheduler" },
    { href: "/admin/rescheduler", label: "Targeted Rescheduler" },
    { href: "/admin/scheduler", label: "Open Scheduler" },
    { href: "/admin/score-submissions", label: "Review Score Submissions" },
    { href: "/admin/photos", label: "Manage Photos" },
    { href: "/admin/betting", label: "Manage Betting" },
    { href: "/betting", label: "Public Betting Page" },
    { href: "/playoffs", label: "Public Playoff Page" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-black text-[#C4963E] hover:text-[#F3EEE6]"
      >
        ← Rhino League
      </Link>

      <section className="mt-4 rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-black">Rhino League Admin</h1>

        <p className="mt-3 max-w-3xl leading-7 text-red-100/70">
          Manage teams, games, scores, betting, photos, playoff eligibility, and
          the official playoff bracket.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                link.href === "/admin/playoff-bracket"
                  ? "bg-[#C4963E] text-[#16070B] hover:bg-[#D7AA4A]"
                  : "border border-[#A51C30]/35 bg-[#A51C30]/10 text-red-100 hover:bg-[#A51C30]/25 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <AdminForms teams={teams || []} games={games || []} />
      </section>
    </main>
  );
}