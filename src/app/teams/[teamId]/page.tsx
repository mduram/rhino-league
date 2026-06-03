import Link from "next/link";
import { notFound } from "next/navigation";
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
  captain: string | null;
  color: string | null;
  league: string;
  logo_url: string | null;
};

type TeamMini = {
  id: string;
  name: string;
  logo_url: string | null;
};

type RawGame = {
  id: string;
  scheduled_at: string | null;
  location: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_votes: number | null;
  away_votes: number | null;
  league: string;
  weight: number | null;
  home_team_id: string;
  away_team_id: string;
  home_team: TeamMini | TeamMini[] | null;
  away_team: TeamMini | TeamMini[] | null;
};

type Game = {
  id: string;
  scheduled_at: string | null;
  location: string | null;
  status: string;
  home_score: number;
  away_score: number;
  home_votes: number;
  away_votes: number;
  league: string;
  weight: number | null;
  home_team_id: string;
  away_team_id: string;
  home_team: TeamMini | null;
  away_team: TeamMini | null;
};

function normalizeJoinedTeam(value: TeamMini | TeamMini[] | null): TeamMini | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeGame(game: RawGame): Game {
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

  const typedTeam = team as Team;

  const { data: games, error: gamesError } = await supabase
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
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (gamesError) {
    return (
      <PageShell title={typedTeam.name}>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {gamesError.message}
        </div>
      </PageShell>
    );
  }

  const teamGames = ((games || []) as unknown as RawGame[]).map(normalizeGame);

  const upcomingGames = teamGames.filter(
    (game) => game.status === "scheduled"
  );

  const completedGames = teamGames.filter(
    (game) => game.status === "completed"
  );

  let wins = 0;
  let losses = 0;
  let gamesPlayed = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  let standingPoints = 0;

  completedGames.forEach((game) => {
    const isHome = game.home_team_id === teamId;
    const teamScore = isHome ? game.home_score : game.away_score;
    const opponentScore = isHome ? game.away_score : game.home_score;

    gamesPlayed += 1;
    pointsFor += teamScore;
    pointsAgainst += opponentScore;

    const didWin = teamScore > opponentScore;
    const didLose = teamScore < opponentScore;

    if (didWin) wins += 1;
    if (didLose) losses += 1;

    standingPoints += getResultPoints({
      league: game.league,
      didWin,
      didLose,
    });
  });

  const differential = pointsFor - pointsAgainst;

  return (
    <PageShell
      title={typedTeam.name}
      subtitle="Team profile, schedule, recent scores, and current standing summary."
    >
      <div className="mb-8 rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <TeamLogo
            logoUrl={typedTeam.logo_url}
            teamName={typedTeam.name}
            league={typedTeam.league}
            size="lg"
          />

          <div>
            <div className="mb-3">
              <LeagueBadge league={typedTeam.league} />
            </div>

            <h2 className="text-4xl font-black text-white">
              {typedTeam.name}
            </h2>

            {typedTeam.captain && (
              <p className="mt-2 text-red-100/70">
                Captain: {typedTeam.captain}
              </p>
            )}

            {typedTeam.color && (
              <p className="mt-1 text-sm text-red-100/45">
                Color: {typedTeam.color}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
            Record
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {wins}-{losses}
          </p>
          <p className="mt-1 text-sm text-red-100/60">
            {gamesPlayed} games played
          </p>
        </div>

        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
            Seeding Points
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {standingPoints}
          </p>
          <p className="mt-1 text-sm text-red-100/60">
            Comp: +3/-1 · Rec: +1/-2
          </p>
        </div>

        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
            Point Diff
          </p>
          <p className="mt-2 text-4xl font-black text-white">
            {differential}
          </p>
          <p className="mt-1 text-sm text-red-100/60">
            PF {pointsFor} · PA {pointsAgainst}
          </p>
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#F3EEE6]">
            Upcoming Games
          </h2>

          <Link
            href="/schedule"
            className="rounded-full border border-[#A51C30]/30 bg-[#A51C30]/15 px-4 py-2 text-sm font-black text-red-100 hover:bg-[#A51C30]/25"
          >
            Full Schedule
          </Link>
        </div>

        <div className="grid gap-5">
          {upcomingGames.map((game) => (
            <GameCard key={game.id} game={game} showPoll />
          ))}

          {upcomingGames.length === 0 && (
            <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
              No upcoming games scheduled for this team yet.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#F3EEE6]">
            Recent Results
          </h2>

          <Link
            href="/standings"
            className="rounded-full border border-[#A51C30]/30 bg-[#A51C30]/15 px-4 py-2 text-sm font-black text-red-100 hover:bg-[#A51C30]/25"
          >
            Full Standings
          </Link>
        </div>

        <div className="grid gap-5">
          {completedGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}

          {completedGames.length === 0 && (
            <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
              No completed games for this team yet.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}