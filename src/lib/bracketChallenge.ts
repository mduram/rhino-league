export const BRACKET_CHALLENGE_ENTRY_FEE = 100;
export const BRACKET_CHALLENGE_ELIGIBLE_GAMES_KEY =
  "__eligibleGameNumbers";

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
  winner_team_id?: string | null;
  status?: string;
  scheduled_at?: string | null;
};

export type BracketChallengePicks = Record<number, string>;
export type StoredBracketChallengePicks = Record<string, unknown>;

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
  picks: StoredBracketChallengePicks | BracketChallengePicks;
  actualWinners: Map<number, string>;
}) {
  let score = 0;
  const normalizedPicks = picks as StoredBracketChallengePicks;
  const eligibleGameNumbers = getBracketChallengeEligibleGameNumbers(picks);

  actualWinners.forEach((winnerTeamId, gameNumber) => {
    if (
      eligibleGameNumbers.has(gameNumber) &&
      normalizedPicks[String(gameNumber)] === winnerTeamId
    ) {
      score += 1;
    }
  });

  return score;
}

export function makeStoredBracketChallengePicks({
  picks,
  eligibleGameNumbers,
}: {
  picks: BracketChallengePicks;
  eligibleGameNumbers: number[];
}) {
  return {
    ...picks,
    [BRACKET_CHALLENGE_ELIGIBLE_GAMES_KEY]: [
      ...new Set(eligibleGameNumbers),
    ].sort((a, b) => a - b),
  } satisfies StoredBracketChallengePicks;
}

export function getBracketChallengeNumericPicks(
  picks: StoredBracketChallengePicks | BracketChallengePicks
) {
  return Object.fromEntries(
    Object.entries(picks || {})
      .filter(
        ([gameNumber, teamId]) =>
          /^\d+$/.test(gameNumber) && typeof teamId === "string"
      )
      .map(([gameNumber, teamId]) => [Number(gameNumber), String(teamId)])
  ) as BracketChallengePicks;
}

export function getBracketChallengeEligibleGameNumbers(
  picks: StoredBracketChallengePicks | BracketChallengePicks
) {
  const normalizedPicks = picks as StoredBracketChallengePicks;
  const storedEligible =
    normalizedPicks[BRACKET_CHALLENGE_ELIGIBLE_GAMES_KEY];

  if (Array.isArray(storedEligible)) {
    return new Set(
      storedEligible
        .map(Number)
        .filter((gameNumber) => Number.isInteger(gameNumber) && gameNumber > 0)
    );
  }

  // Entries submitted before rolling locks were introduced earned points for
  // every numeric pick, preserving their original maximum score.
  return new Set(Object.keys(getBracketChallengeNumericPicks(picks)).map(Number));
}

export function getBracketChallengeMaxPoints(
  picks: StoredBracketChallengePicks | BracketChallengePicks
) {
  return getBracketChallengeEligibleGameNumbers(picks).size;
}
