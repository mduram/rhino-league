import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { PLAYOFF_GAME_DEFINITIONS } from "@/lib/playoffBracket";
import PlayoffBracketClient from "./PlayoffBracketClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Team = {
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
  playoff_disqualified?: boolean | null;
};

type RegularSeasonGame = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  league: string;
  is_forfeit?: boolean | null;
  forfeit_team_id?: string | null;
};

type Standing = {
  seed: number;
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  standingPoints: number;
  differential: number;
};

type BracketGame = {
  id?: string;
  game_number: number;
  bracket: "winners" | "losers" | "finals";
  round_label: string;
  scheduled_at?: string | null;
  location?: string | null;
  status: string;
  home_seed?: number | null;
  away_seed?: number | null;
  home_source?: string | null;
  away_source?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_team?: any;
  away_team?: any;
  provisional_home_team?: Standing | null;
  provisional_away_team?: Standing | null;
  note?: string;
};

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

function seedFromSource(source: string | null | undefined) {
  if (!source) return null;

  const match = source.match(/^Seed\s+(\d+)/i);

  return match ? Number(match[1]) : null;
}

function buildLiveStandings({
  teams,
  games,
}: {
  teams: Team[];
  games: RegularSeasonGame[];
}) {
  return teams
    .filter((team) => !team.playoff_disqualified)
    .map((team) => {
      let wins = 0;
      let losses = 0;
      let gamesPlayed = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let standingPoints = 0;

      games.forEach((game) => {
        const isHome = game.home_team_id === team.id;
        const isAway = game.away_team_id === team.id;

        if (!isHome && !isAway) return;

        gamesPlayed += 1;

        const teamScore = isHome ? game.home_score : game.away_score;
        const opponentScore = isHome ? game.away_score : game.home_score;

        pointsFor += teamScore;
        pointsAgainst += opponentScore;

        const didWin = teamScore > opponentScore;
        const didLose = teamScore < opponentScore;

        const didForfeit = Boolean(
          game.is_forfeit && game.forfeit_team_id === team.id
        );

        if (didWin) wins += 1;
        if (didLose) losses += 1;

        if (didForfeit) {
          standingPoints -= 3;
        } else {
          standingPoints += getResultPoints({
            league: game.league,
            didWin,
            didLose,
          });
        }
      });

      return {
        id: team.id,
        name: team.name,
        league: team.league,
        logo_url: team.logo_url,
        gamesPlayed,
        wins,
        losses,
        standingPoints,
        differential: pointsFor - pointsAgainst,
      };
    })
    .sort((a, b) => {
      if (b.standingPoints !== a.standingPoints) {
        return b.standingPoints - a.standingPoints;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.differential !== a.differential) {
        return b.differential - a.differential;
      }

      return a.name.localeCompare(b.name);
    })
    .map((team, index) => ({
      ...team,
      seed: index + 1,
    }));
}

function buildProvisionalGames(standings: Standing[]) {
  const seedByNumber = new Map(standings.map((team) => [team.seed, team]));

  return PLAYOFF_GAME_DEFINITIONS.map((definition) => {
    const homeSeed = seedFromSource(definition.homeSource);
    const awaySeed = seedFromSource(definition.awaySource);

    const isTopSeedBye =
      definition.bracket === "winners" &&
      definition.awaySource === "BYE" &&
      (homeSeed === 1 || homeSeed === 2);

    const homeTeam =
      homeSeed === null ? null : seedByNumber.get(homeSeed) || null;

    const awayTeam =
      awaySeed === null ? null : seedByNumber.get(awaySeed) || null;

    return {
      game_number: definition.gameNumber,
      bracket: definition.bracket,
      round_label: definition.roundLabel,
      status: isTopSeedBye ? "completed" : "provisional",

      home_seed: homeSeed,
      away_seed: awaySeed,

      home_source: definition.homeSource,
      away_source: definition.awaySource,

      home_score: isTopSeedBye ? 1 : null,
      away_score: isTopSeedBye ? 0 : null,

      provisional_home_team: homeTeam,
      provisional_away_team: awayTeam,

      note: isTopSeedBye
        ? homeSeed === 1
          ? "Seed #1 receives a first-round BYE and advances directly to G18."
          : "Seed #2 receives a first-round BYE and advances directly to G32."
        : undefined,
    } as BracketGame;
  });
}

export default async function PlayoffsPage() {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, league, logo_url, playoff_disqualified")
    .order("name", { ascending: true });

  const { data: regularSeasonGames } = await supabase
    .from("games")
    .select(
      `
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      league,
      is_forfeit,
      forfeit_team_id
      `
    )
    .eq("status", "completed");

  const { data: generatedGames } = await supabase
    .from("playoff_games")
    .select(
      `
      id,
      game_number,
      bracket,
      round_label,
      scheduled_at,
      location,
      status,
      home_seed,
      away_seed,
      home_source,
      away_source,
      home_score,
      away_score,
      home_team:teams!playoff_games_home_team_id_fkey(id, name, league, logo_url),
      away_team:teams!playoff_games_away_team_id_fkey(id, name, league, logo_url),
      winner_team:teams!playoff_games_winner_team_id_fkey(id, name, league, logo_url),
      loser_team:teams!playoff_games_loser_team_id_fkey(id, name, league, logo_url)
      `
    )
    .order("game_number", { ascending: true });

  const liveStandings = buildLiveStandings({
    teams: (teams || []) as Team[],
    games: (regularSeasonGames || []) as RegularSeasonGame[],
  });

  const playoffTeams = liveStandings.slice(0, 30);

  const hasGeneratedBracket = Boolean(
    generatedGames && generatedGames.length > 0
  );

  const bracketGames = hasGeneratedBracket
    ? ((generatedGames || []) as BracketGame[])
    : buildProvisionalGames(playoffTeams);

  return (
    <PageShell
      title="Rhino League Playoffs"
      subtitle="30 teams. Double elimination. Seeds #1 and #2 receive first-round BYEs."
    >
      <PlayoffBracketClient
        bracketGames={bracketGames}
        playoffTeams={playoffTeams}
        hasGeneratedBracket={hasGeneratedBracket}
      />
    </PageShell>
  );
}