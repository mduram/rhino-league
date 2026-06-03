import { supabase } from "@/lib/supabase";
import RescheduleTeamsClient from "./RescheduleTeamsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RescheduleTeamsPage() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      league,
      captain,
      not_available,
      preferred_game_time,
      preferred_day_notes
    `)
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Targeted Rescheduler
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Use this when only a few teams changed or clarified their scheduling
          preferences. It will only reschedule auto-scheduled games involving
          the selected teams and leave the rest of the schedule untouched.
        </p>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        ) : (
          <div className="mt-8">
            <RescheduleTeamsClient teams={teams || []} />
          </div>
        )}
      </div>
    </main>
  );
}