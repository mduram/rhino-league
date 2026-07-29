import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { PLAYOFF_GAME_DEFINITIONS } from "@/lib/playoffBracket";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import {
  calculateStandings,
  type StandingsGame,
  type StandingsTeam,
} from "@/lib/standings";
import PlayoffBracketClient from "./PlayoffBracketClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type BracketTeam = {
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
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
  home_team?: BracketTeam | BracketTeam[] | null;
  away_team?: BracketTeam | BracketTeam[] | null;
  provisional_home_team?: Standing | null;
  provisional_away_team?: Standing | null;
  note?: string;
};

function seedFromSource(source: string | null | undefined) {
  if (!source) return null;

  const match = source.match(/^Seed\s+(\d+)/i);

  return match ? Number(match[1]) : null;
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

  const liveStandings = calculateStandings({
    teams: (teams || []) as StandingsTeam[],
    games: (regularSeasonGames || []) as StandingsGame[],
  })
    .filter((team) => !team.playoffDisqualified)
    .map((team, index) => ({
      ...team,
      seed: index + 1,
    }));

  const playoffTeams = liveStandings.slice(0, 30);

  const hasGeneratedBracket = Boolean(
    SEASON_PHASE.playoffSchedulePublished &&
      generatedGames &&
      generatedGames.length > 0
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
        schedulePublished={SEASON_PHASE.playoffSchedulePublished}
      />
    </PageShell>
  );
}
