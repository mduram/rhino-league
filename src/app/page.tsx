import Link from "next/link";
import { supabase } from "@/lib/supabase";
import GameCard from "@/components/GameCard";
import SectionTitle from "@/components/SectionTitle";

export default async function HomePage() {
  const { data: upcomingGames } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      league,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(3);

  const { data: latestScores } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      league,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-orange-400">
              Volleyball chaos starts here
            </p>

            <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
              The Rhino League
            </h1>

            <p className="mt-5 max-w-2xl text-lg text-neutral-300 sm:text-xl">
              Schedules, scores, standings, polls, photos, and enough league
              drama to make every match feel like a championship.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/schedule"
                className="rounded-full bg-orange-500 px-6 py-3 font-black text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
              >
                View Schedule
              </Link>

              <Link
                href="/standings"
                className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 font-black text-white transition hover:bg-white/10"
              >
                League Table
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <SectionTitle>Upcoming Games</SectionTitle>

            <div className="grid gap-5">
              {upcomingGames?.map((game: any) => (
                <GameCard key={game.id} game={game} />
              ))}

              {upcomingGames?.length === 0 && (
                <p className="text-neutral-400">No upcoming games yet.</p>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Latest Scores</SectionTitle>

            <div className="grid gap-5">
              {latestScores?.map((game: any) => (
                <GameCard key={game.id} game={game} />
              ))}

              {latestScores?.length === 0 && (
                <p className="text-neutral-400">No completed games yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}