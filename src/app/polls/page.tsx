import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import GameCard from "@/components/GameCard";
import LeagueBadge from "@/components/LeagueBadge";
import TeamLogo from "@/components/TeamLogo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Team = {
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
};

type Game = {
  id: string;
  scheduled_at: string | null;
  location: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_votes: number | null;
  away_votes: number | null;
  league: string;
  home_team_id: string;
  away_team_id: string;
  home_team: Team | Team[] | null;
  away_team: Team | Team[] | null;
};

type NormalizedGame = Omit<Game, "home_team" | "away_team"> & {
  home_team: Team | null;
  away_team: Team | null;
};

function normalizeJoinedTeam(value: Team | Team[] | null): Team | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeGame(game: Game): NormalizedGame {
  return {
    ...game,
    home_score: Number(game.home_score || 0),
    away_score: Number(game.away_score || 0),
    home_votes: Number(game.home_votes || 0),
    away_votes: Number(game.away_votes || 0),
    home_team: normalizeJoinedTeam(game.home_team),
    away_team: normalizeJoinedTeam(game.away_team),
  };
}

function getResultPoints({
  league,
  didWin,
  didLose,
}: {
  league: string;
  didWin: boolean;
  didLose: boolean;
}) {
  if (!didWin && !didLose) return 0;

  if (league === "competitive") {
    if (didWin) return 3;
    if (didLose) return -1;
  }

  if (league === "recreational") {
    if (didWin) return 1;
    if (didLose) return -2;
  }

  return 0;
}

function formatGameTime(value: string | null) {
  if (!value) return "Time TBD";

  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PollsPage() {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, league, logo_url")
    .order("name", { ascending: true });

  const { data: allGames, error: gamesError } = await supabase
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
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, league, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, league, logo_url)
    `)
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (teamsError || gamesError) {
    return (
      <PageShell title="Polls">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {teamsError?.message || gamesError?.message}
        </div>
      </PageShell>
    );
  }

  const normalizedGames = ((allGames || []) as unknown as Game[]).map(
    normalizeGame
  );

  const scheduledGames = normalizedGames.filter(
    (game) => game.status === "scheduled"
  );

  const completedGames = normalizedGames.filter(
    (game) => game.status === "completed"
  );

  const teamStats = new Map<
    string,
    {
      id: string;
      name: string;
      league: string;
      logo_url: string | null;
      wins: number;
      losses: number;
      gamesPlayed: number;
      standingPoints: number;
      pointsFor: number;
      pointsAgainst: number;
      pollVotes: number;
      powerScore: number;
    }
  >();

  (teams || []).forEach((team: Team) => {
    teamStats.set(team.id, {
      id: team.id,
      name: team.name,
      league: team.league,
      logo_url: team.logo_url,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      standingPoints: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pollVotes: 0,
      powerScore: 0,
    });
  });

  normalizedGames.forEach((game) => {
    const homeStats = teamStats.get(game.home_team_id);
    const awayStats = teamStats.get(game.away_team_id);

    if (homeStats) {
      homeStats.pollVotes += Number(game.home_votes || 0);
    }

    if (awayStats) {
      awayStats.pollVotes += Number(game.away_votes || 0);
    }

    if (game.status !== "completed") return;

    const homeScore = Number(game.home_score || 0);
    const awayScore = Number(game.away_score || 0);

    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;

    if (homeStats) {
      homeStats.gamesPlayed += 1;
      homeStats.pointsFor += homeScore;
      homeStats.pointsAgainst += awayScore;

      if (homeWon) homeStats.wins += 1;
      if (awayWon) homeStats.losses += 1;

      homeStats.standingPoints += getResultPoints({
        league: game.league,
        didWin: homeWon,
        didLose: awayWon,
      });
    }

    if (awayStats) {
      awayStats.gamesPlayed += 1;
      awayStats.pointsFor += awayScore;
      awayStats.pointsAgainst += homeScore;

      if (awayWon) awayStats.wins += 1;
      if (homeWon) awayStats.losses += 1;

      awayStats.standingPoints += getResultPoints({
        league: game.league,
        didWin: awayWon,
        didLose: homeWon,
      });
    }
  });

  const statsArray = Array.from(teamStats.values()).map((team) => {
    const winRate =
      team.gamesPlayed > 0 ? team.wins / team.gamesPlayed : 0;

    const differential = team.pointsFor - team.pointsAgainst;

    const powerScore =
      team.standingPoints * 10 +
      winRate * 20 +
      differential * 0.25 +
      team.pollVotes * 0.5;

    return {
      ...team,
      differential,
      winRate,
      powerScore,
    };
  });

  const hottestTeams = [...statsArray]
    .sort((a, b) => {
      if (b.pollVotes !== a.pollVotes) return b.pollVotes - a.pollVotes;
      return b.powerScore - a.powerScore;
    })
    .slice(0, 6);

  const powerScoreByTeamId = new Map(
    statsArray.map((team) => [team.id, team.powerScore])
  );

  const gamesWithPredictions = scheduledGames.map((game) => {
    const homePower = powerScoreByTeamId.get(game.home_team_id) || 0;
    const awayPower = powerScoreByTeamId.get(game.away_team_id) || 0;

    const homeVotes = Number(game.home_votes || 0);
    const awayVotes = Number(game.away_votes || 0);
    const totalVotes = homeVotes + awayVotes;

    const homePollShare = totalVotes > 0 ? homeVotes / totalVotes : 0.5;
    const awayPollShare = totalVotes > 0 ? awayVotes / totalVotes : 0.5;

    const homeCombinedScore = homePower + homePollShare * 20;
    const awayCombinedScore = awayPower + awayPollShare * 20;

    const favorite =
      homeCombinedScore >= awayCombinedScore ? game.home_team : game.away_team;

    const underdog =
      homeCombinedScore >= awayCombinedScore ? game.away_team : game.home_team;

    return {
      game,
      favorite,
      underdog,
      homeCombinedScore,
      awayCombinedScore,
      totalVotes,
    };
  });

  return (
    <PageShell
      title="Polls"
      subtitle="Vote on upcoming games, track the hottest teams, and see the current favorite vs underdog for each matchup."
    >
      <div className="grid gap-8">
        <section className="rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-6 shadow-2xl shadow-black/30">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
            Poll Dashboard
          </p>

          <h2 className="text-3xl font-black text-white">
            Hottest teams right now
          </h2>

          <p className="mt-2 text-red-100/70">
            Ranked by total poll votes, with power score used as a tiebreaker.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hottestTeams.map((team, index) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 transition hover:border-[#C4963E]/50 hover:bg-[#230B12]"
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-black text-[#F3EEE6]">
                    #{index + 1}
                  </div>

                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.name}
                    league={team.league}
                    size="sm"
                  />

                  <div>
                    <p className="font-black text-white">
                      {team.name}
                    </p>

                    <p className="text-sm text-red-100/60">
                      ♥ {team.pollVotes} poll votes
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <LeagueBadge league={team.league} />

                  <span className="rounded-full border border-[#A51C30]/25 bg-black/20 px-3 py-1 text-xs font-black text-red-100/70">
                    {team.wins}-{team.losses}
                  </span>

                  <span className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-3 py-1 text-xs font-black text-[#F3EEE6]">
                    {team.standingPoints} pts
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-3xl font-black text-[#F3EEE6]">
            Active Game Polls
          </h2>

          <div className="grid gap-5">
            {gamesWithPredictions.map(
              ({ game, favorite, underdog, totalVotes }) => (
                <div
                  key={game.id}
                  className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30"
                >
                  <div className="mb-4 grid gap-3 md:grid-cols-3 md:items-center">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
                        Matchup
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        {game.home_team?.name} vs {game.away_team?.name}
                      </p>

                      <p className="mt-1 text-sm text-red-100/60">
                        {formatGameTime(game.scheduled_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-green-300">
                        Favorite
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        {favorite?.name || "TBD"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                        Underdog
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        {underdog?.name || "TBD"}
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 text-sm text-red-100/55">
                    Favorite/underdog is calculated from current standings,
                    score differential, historical results, and poll votes.
                    Total votes: {totalVotes}.
                  </p>

                  <GameCard game={game} showPoll />
                </div>
              )
            )}

            {gamesWithPredictions.length === 0 && (
              <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
                No active polls right now because no games are scheduled.
              </p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}