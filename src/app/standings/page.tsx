import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import LeagueBadge from "@/components/LeagueBadge";
import TeamNameLink from "@/components/TeamNameLink";
export const dynamic = "force-dynamic";
export const revalidate = 0;
type Team = {
  id: string;
  name: string;
  league: string;
};

type Game = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  league: string;
  weight: number | null;
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
      <PageShell title="Standings">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {teamsError?.message || gamesError?.message}
        </div>
      </PageShell>
    );
  }

  const standings = (teams || []).map((team: Team) => {
    let wins = 0;
    let losses = 0;
    let gamesPlayed = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let standingPoints = 0;

    (games || []).forEach((game: Game) => {
      const isHome = game.home_team_id === team.id;
      const isAway = game.away_team_id === team.id;

      if (!isHome && !isAway) return;

      gamesPlayed += 1;

      const teamScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;
      const gameWeight = Number(game.weight || 1);

      pointsFor += teamScore;
      pointsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins += 1;
        standingPoints += gameWeight;
      }

      if (teamScore < opponentScore) {
        losses += 1;
      }
    });

    return {
      id: team.id,
      name: team.name,
      league: team.league,
      gamesPlayed,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      differential: pointsFor - pointsAgainst,
      standingPoints,
    };
  });

  standings.sort((a, b) => {
    if (b.standingPoints !== a.standingPoints) {
      return b.standingPoints - a.standingPoints;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    return b.differential - a.differential;
  });

  return (
    <PageShell
      title="Standings"
      subtitle="One mixed table across competitive and recreational leagues. Competitive wins currently carry a slightly higher weight."
    >
      <div className="overflow-x-auto rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 shadow-2xl shadow-black/30">
        <table className="w-full min-w-[850px] border-collapse">
          <thead className="bg-[#A51C30]/20 text-left">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Team</th>
              <th className="p-4">League</th>
              <th className="p-4">GP</th>
              <th className="p-4">W</th>
              <th className="p-4">L</th>
              <th className="p-4">Standing Pts</th>
              <th className="p-4">PF</th>
              <th className="p-4">PA</th>
              <th className="p-4">Diff</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((team, index) => (
              <tr key={team.id} className="border-t border-[#A51C30]/20">
                <td className="p-4 font-black">{index + 1}</td>

                <td className="p-4 font-black">
                  <TeamNameLink team={team} />
                </td>

                <td className="p-4">
                  <LeagueBadge league={team.league} />
                </td>

                <td className="p-4">{team.gamesPlayed}</td>
                <td className="p-4">{team.wins}</td>
                <td className="p-4">{team.losses}</td>

                <td className="p-4 font-black text-[#F3EEE6]">
                  {team.standingPoints.toFixed(2)}
                </td>

                <td className="p-4">{team.pointsFor}</td>
                <td className="p-4">{team.pointsAgainst}</td>
                <td className="p-4">{team.differential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-red-100/50">
        Current ranking: standing points, then wins, then score differential.
        Competitive game weight defaults to 1.25, recreational to 1.00.
      </p>
    </PageShell>
  );
}