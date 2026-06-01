import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type Game = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
};

export default async function StandingsPage() {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*");

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .eq("status", "completed");

  if (teamsError || gamesError) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">Standings</h1>
          <p className="mt-4 text-red-400">
            {teamsError?.message || gamesError?.message}
          </p>
        </div>
      </main>
    );
  }

  const standings = (teams || []).map((team: Team) => {
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let gamesPlayed = 0;

    (games || []).forEach((game: Game) => {
      const isHome = game.home_team_id === team.id;
      const isAway = game.away_team_id === team.id;

      if (!isHome && !isAway) return;

      gamesPlayed += 1;

      const teamScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;

      pointsFor += teamScore;
      pointsAgainst += opponentScore;

      if (teamScore > opponentScore) wins += 1;
      if (teamScore < opponentScore) losses += 1;
    });

    return {
      name: team.name,
      gamesPlayed,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      differential: pointsFor - pointsAgainst,
    };
  });

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.differential - a.differential;
  });

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-black">Standings</h1>

        <div className="overflow-hidden rounded-2xl border border-neutral-800">
          <table className="w-full border-collapse bg-neutral-900">
            <thead className="bg-neutral-800 text-left">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Team</th>
                <th className="p-4">GP</th>
                <th className="p-4">W</th>
                <th className="p-4">L</th>
                <th className="p-4">PF</th>
                <th className="p-4">PA</th>
                <th className="p-4">Diff</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((team, index) => (
                <tr key={team.name} className="border-t border-neutral-800">
                  <td className="p-4 font-bold">{index + 1}</td>
                  <td className="p-4 font-black">{team.name}</td>
                  <td className="p-4">{team.gamesPlayed}</td>
                  <td className="p-4">{team.wins}</td>
                  <td className="p-4">{team.losses}</td>
                  <td className="p-4">{team.pointsFor}</td>
                  <td className="p-4">{team.pointsAgainst}</td>
                  <td className="p-4">{team.differential}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-neutral-500">
          Current ranking uses wins first, then score differential.
        </p>
      </div>
    </main>
  );
}