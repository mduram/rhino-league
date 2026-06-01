import { supabase } from "@/lib/supabase";

export default async function ScoresPage() {
  const { data: games, error } = await supabase
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
    .order("scheduled_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">Scores</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-black">Scores</h1>

        <div className="grid gap-4">
          {games?.map((game: any) => (
            <div
              key={game.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <p className="text-xl font-black">{game.home_team?.name}</p>
                </div>

                <div className="text-center text-4xl font-black text-orange-400">
                  {game.home_score} - {game.away_score}
                </div>

                <div className="md:text-right">
                  <p className="text-xl font-black">{game.away_team?.name}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-neutral-400">
                {new Date(game.scheduled_at).toLocaleDateString()} ·{" "}
                {game.location}
              </p>
            </div>
          ))}
        </div>

        {games?.length === 0 && (
          <p className="mt-6 text-neutral-400">
            No completed games yet.
          </p>
        )}
      </div>
    </main>
  );
}