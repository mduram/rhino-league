import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function HomePage() {
  const { data: upcomingGames, error: upcomingError } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(3);

  const { data: latestScores, error: scoresError } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(3);

  if (upcomingError || scoresError) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">The Rhino League</h1>
          <p className="mt-4 text-red-400">
            Could not load Supabase data. Check your .env.local keys and RLS policies.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-700 to-neutral-950 p-10 shadow-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-orange-100">
            Welcome to
          </p>

          <h1 className="text-6xl font-black tracking-tight">
            The Rhino League
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-orange-50">
            Volleyball schedules, scores, standings, photos, polls, and league
            drama, all in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/schedule"
              className="rounded-full bg-white px-5 py-3 font-bold text-neutral-950"
            >
              View Schedule
            </Link>

            <Link
              href="/standings"
              className="rounded-full border border-white px-5 py-3 font-bold text-white"
            >
              Standings
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <section>
            <h2 className="mb-4 text-2xl font-black">Upcoming Games</h2>

            <div className="grid gap-4">
              {upcomingGames?.map((game: any) => (
                <div
                  key={game.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <p className="text-lg font-bold">
                    {game.home_team?.name} vs {game.away_team?.name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-400">
                    {new Date(game.scheduled_at).toLocaleString()} ·{" "}
                    {game.location}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-black">Latest Scores</h2>

            <div className="grid gap-4">
              {latestScores?.map((game: any) => (
                <div
                  key={game.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <p className="text-lg font-bold">
                    {game.home_team?.name} vs {game.away_team?.name}
                  </p>

                  <p className="mt-1 text-3xl font-black text-orange-400">
                    {game.home_score} - {game.away_score}
                  </p>

                  <p className="mt-1 text-sm text-neutral-400">
                    {new Date(game.scheduled_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}