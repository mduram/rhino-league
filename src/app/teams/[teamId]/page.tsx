import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import LeagueBadge from "@/components/LeagueBadge";
import TeamLogo from "@/components/TeamLogo";
import GameCard from "@/components/GameCard";

function calculateTeamStats(teamId: string, games: any[]) {
  let wins = 0;
  let losses = 0;
  let gamesPlayed = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let standingPoints = 0;

  games.forEach((game) => {
    if (game.status !== "completed") return;

    const isHome = game.home_team_id === teamId;
    const isAway = game.away_team_id === teamId;

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
    gamesPlayed,
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    differential: pointsFor - pointsAgainst,
    standingPoints,
  };
}

function calculateAllStandings(teams: any[], completedGames: any[]) {
  return teams
    .map((team) => {
      const stats = calculateTeamStats(team.id, completedGames);

      return {
        id: team.id,
        name: team.name,
        league: team.league,
        ...stats,
      };
    })
    .sort((a, b) => {
      if (b.standingPoints !== a.standingPoints) {
        return b.standingPoints - a.standingPoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return b.differential - a.differential;
    });
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    notFound();
  }

  const { data: allTeams } = await supabase.from("teams").select("*");

  const { data: completedGames } = await supabase
    .from("games")
    .select("*")
    .eq("status", "completed");

  const { data: teamGames, error: gamesError } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      weight,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("scheduled_at", { ascending: true });

  if (gamesError) {
    return (
      <PageShell title={team.name}>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {gamesError.message}
        </div>
      </PageShell>
    );
  }

  const games = teamGames || [];
  const upcomingGames = games.filter((game) => game.status === "scheduled");
  const pastGames = games
    .filter((game) => game.status === "completed")
    .sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return bTime - aTime;
    });

  const standings = calculateAllStandings(allTeams || [], completedGames || []);
  const rankIndex = standings.findIndex((standing) => standing.id === team.id);
  const teamStanding = standings[rankIndex];

  return (
    <PageShell
      title={team.name}
      subtitle="Team page with logo, record, schedule, and recent results."
    >
      <section className="mb-8 rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <TeamLogo
              logoUrl={team.logo_url}
              teamName={team.name}
              league={team.league}
              size="lg"
            />

            <div>
              <LeagueBadge league={team.league} className="mb-3" />

              <h2 className="text-4xl font-black text-white">{team.name}</h2>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-red-100/70">
                {team.captain && <span>Captain: {team.captain}</span>}
                {team.color && <span>Color: {team.color}</span>}
              </div>
            </div>
          </div>

          <Link
            href="/teams"
            className="w-fit rounded-full border border-[#F3EEE6]/25 bg-white/[0.06] px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            Back to Teams
          </Link>
        </div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100/45">
            Rank
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {rankIndex >= 0 ? rankIndex + 1 : "-"}
          </p>
        </div>

        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100/45">
            Record
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {teamStanding?.wins || 0}-{teamStanding?.losses || 0}
          </p>
        </div>

        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100/45">
            Standing Pts
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {(teamStanding?.standingPoints || 0).toFixed(2)}
          </p>
        </div>

        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100/45">
            Diff
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {teamStanding?.differential || 0}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-[#F3EEE6]">
            Upcoming Games
          </h2>
          <Link
            href="/schedule"
            className="text-sm font-bold text-red-100/70 hover:text-white hover:underline"
          >
            Full schedule
          </Link>
        </div>

        <div className="grid gap-5">
          {upcomingGames.map((game: any) => (
            <GameCard key={game.id} game={game} showPoll />
          ))}

          {upcomingGames.length === 0 && (
            <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 text-red-100/60">
              No upcoming games for this team yet.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-[#F3EEE6]">
            Recent Results
          </h2>
          <Link
            href="/standings"
            className="text-sm font-bold text-red-100/70 hover:text-white hover:underline"
          >
            View standings
          </Link>
        </div>

        <div className="grid gap-5">
          {pastGames.map((game: any) => (
            <GameCard key={game.id} game={game} />
          ))}

          {pastGames.length === 0 && (
            <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 text-red-100/60">
              No completed games for this team yet.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}