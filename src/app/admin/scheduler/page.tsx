import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SchedulerClient from "./SchedulerClient";

export default async function SchedulerPage() {
  const { data: teams } = await supabaseAdmin
    .from("teams")
    .select("*")
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  const { data: games } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      court,
      status,
      home_score,
      away_score,
      league,
      round_label,
      pool_group,
      weight,
      submitted_score_pending,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .in("status", ["unscheduled", "scheduled"])
    .order("scheduled_at", { ascending: true, nullsFirst: true });

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-orange-400">
            Admin
          </p>

          <h1 className="text-4xl font-black text-white sm:text-5xl">
            Game Scheduler
          </h1>

          <p className="mt-3 max-w-3xl text-neutral-400">
            Generate balanced game pools, drag games into calendar slots, and
            keep an eye on team balance.
          </p>
        </div>

        <SchedulerClient teams={teams || []} games={games || []} />
      </div>
    </main>
  );
}