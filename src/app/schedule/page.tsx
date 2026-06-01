import { supabase } from "@/lib/supabase";

export default async function SchedulePage() {
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
    .order("scheduled_at", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">Schedule</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-black">Schedule</h1>

        <div className="overflow-hidden rounded-2xl border border-neutral-800">
          <table className="w-full border-collapse bg-neutral-900">
            <thead className="bg-neutral-800 text-left">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Match</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {games?.map((game: any) => (
                <tr key={game.id} className="border-t border-neutral-800">
                  <td className="p-4">
                    {new Date(game.scheduled_at).toLocaleString()}
                  </td>

                  <td className="p-4 font-bold">
                    {game.home_team?.name} vs {game.away_team?.name}
                  </td>

                  <td className="p-4">{game.location}</td>

                  <td className="p-4">
                    {game.status === "completed"
                      ? `${game.home_score} - ${game.away_score}`
                      : "Scheduled"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {games?.length === 0 && (
          <p className="mt-6 text-neutral-400">
            No games have been scheduled yet.
          </p>
        )}
      </div>
    </main>
  );
}