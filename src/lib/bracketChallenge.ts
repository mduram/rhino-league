export const BRACKET_CHALLENGE_ENTRY_FEE = 100;

export type BracketChallengeTeam = {
  id: string;
  seed: number;
  name: string;
  league: string;
  logo_url: string | null;
};

export type BracketChallengeGame = {
  game_number: number;
  bracket: "winners" | "losers" | "finals";
  round_label: string;
  home_source?: string | null;
  away_source?: string | null;
};

export type BracketChallengePicks = Record<number, string>;

export type BracketChallengeResult = {
  game: BracketChallengeGame;
  home: BracketChallengeTeam | null;
  away: BracketChallengeTeam | null;
  winner: BracketChallengeTeam | null;
  loser: BracketChallengeTeam | null;
  isBye: boolean;
  requiresPick: boolean;
  hasValidPick: boolean;
};

function resolveSource({
  source,
  seedByNumber,
  resultByGame,
}: {
  source?: string | null;
  seedByNumber: Map<number, BracketChallengeTeam>;
  resultByGame: Map<number, BracketChallengeResult>;
}) {
  if (!source || source === "BYE") return null;

  const seedMatch = source.match(/^Seed\s+(\d+)/i);
  if (seedMatch) {
    return seedByNumber.get(Number(seedMatch[1])) || null;
  }

  const resultMatch = source.match(/^([WL])\s+G(\d+)/i);
  if (!resultMatch) return null;

  const result = resultByGame.get(Number(resultMatch[2]));
  if (!result) return null;

  return resultMatch[1].toUpperCase() === "W" ? result.winner : result.loser;
}

export function buildBracketChallenge({
  games,
  teams,
  picks,
}: {
  games: BracketChallengeGame[];
  teams: BracketChallengeTeam[];
  picks: BracketChallengePicks;
}) {
  const seedByNumber = new Map(teams.map((team) => [team.seed, team]));
  const resultByGame = new Map<number, BracketChallengeResult>();
  const results: BracketChallengeResult[] = [];

  [...games]
    .sort((a, b) => a.game_number - b.game_number)
    .forEach((game) => {
      const home = resolveSource({
        source: game.home_source,
        seedByNumber,
        resultByGame,
      });
      const away = resolveSource({
        source: game.away_source,
        seedByNumber,
        resultByGame,
      });
      const isBye =
        game.home_source === "BYE" || game.away_source === "BYE";
      const requiresPick = !isBye;
      const pickedTeamId = picks[game.game_number];

      let winner: BracketChallengeTeam | null = null;
      let loser: BracketChallengeTeam | null = null;

      if (home && game.away_source === "BYE") {
        winner = home;
      } else if (away && game.home_source === "BYE") {
        winner = away;
      } else if (home && away && pickedTeamId) {
        if (pickedTeamId === home.id) {
          winner = home;
          loser = away;
        } else if (pickedTeamId === away.id) {
          winner = away;
          loser = home;
        }
      }

      const result: BracketChallengeResult = {
        game,
        home,
        away,
        winner,
        loser,
        isBye,
        requiresPick,
        hasValidPick: Boolean(requiresPick && winner && loser),
      };

      resultByGame.set(game.game_number, result);
      results.push(result);
    });

  const requiredGames = results.filter((result) => result.requiresPick);
  const completedGames = requiredGames.filter((result) => result.hasValidPick);
  const validPicks = Object.fromEntries(
    completedGames.map((result) => [
      result.game.game_number,
      result.winner?.id || "",
    ])
  ) as BracketChallengePicks;

  return {
    results,
    resultByGame,
    validPicks,
    completedPicks: completedGames.length,
    totalPicks: requiredGames.length,
    isComplete: completedGames.length === requiredGames.length,
    champion:
      resultByGame.get(61)?.winner ||
      results.find((result) => result.game.round_label === "Championship Final")
        ?.winner ||
      null,
  };
}

export function scoreBracketChallenge({
  picks,
  actualWinners,
}: {
  picks: Record<string, string> | BracketChallengePicks;
  actualWinners: Map<number, string>;
}) {
  let score = 0;
  const normalizedPicks = picks as Record<string, string>;

  actualWinners.forEach((winnerTeamId, gameNumber) => {
    if (normalizedPicks[String(gameNumber)] === winnerTeamId) score += 1;
  });

  return score;
}
