export type TeamSignal = {
  teamId: string;
  pollVotes: number;
  wins: number;
  losses: number;
  forfeits: number;
  standingPoints: number;
  differential: number;
  gamesPlayed: number;
};

export type FuturesMarketCalculation = {
  optionId: string;
  amount: number;
  betCount: number;
  probability: number;
  odds: number;
  pollSignal: number;
  historicalSignal: number;
  betSignal: number;
};

const MARKET_PRIOR_PER_OPTION = 25;
const POLL_PRIOR_PER_OPTION = 6;
const HISTORY_PRIOR_PER_OPTION = 20;

const MIN_PROBABILITY = 0.02;
const MAX_PROBABILITY = 0.55;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundOdds(value: number) {
  return Math.round(value * 100) / 100;
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return numerator / denominator;
}

function getHistoricalSignal({
  signal,
  marketSlug,
}: {
  signal?: TeamSignal;
  marketSlug?: string;
}) {
  if (!signal) return HISTORY_PRIOR_PER_OPTION;

  const standingPoints = Number(signal.standingPoints || 0);
  const wins = Number(signal.wins || 0);
  const losses = Number(signal.losses || 0);
  const forfeits = Number(signal.forfeits || 0);
  const differential = Number(signal.differential || 0);
  const gamesPlayed = Number(signal.gamesPlayed || 0);

  if (marketSlug === "regular-season-bottom") {
    return Math.max(
      2,
      HISTORY_PRIOR_PER_OPTION +
        losses * 8 +
        forfeits * 14 -
        wins * 5 -
        standingPoints * 3 -
        differential * 0.12 +
        Math.max(0, 3 - gamesPlayed) * 2
    );
  }

  if (marketSlug === "regular-season-top") {
    return Math.max(
      2,
      HISTORY_PRIOR_PER_OPTION +
        standingPoints * 4 +
        wins * 8 +
        differential * 0.12 -
        losses * 4 -
        forfeits * 10
    );
  }

  return Math.max(
    2,
    HISTORY_PRIOR_PER_OPTION +
      standingPoints * 3 +
      wins * 7 +
      differential * 0.1 -
      losses * 3 -
      forfeits * 8
  );
}

function getPollSignal({
  signal,
  marketSlug,
  maxPollVotes,
}: {
  signal?: TeamSignal;
  marketSlug?: string;
  maxPollVotes: number;
}) {
  const pollVotes = Number(signal?.pollVotes || 0);

  if (marketSlug === "regular-season-bottom") {
    return POLL_PRIOR_PER_OPTION + Math.max(0, maxPollVotes - pollVotes);
  }

  return POLL_PRIOR_PER_OPTION + pollVotes;
}

export function calculateFuturesOdds({
  options,
  bets,
  teamSignalsByTeamId = {},
  marketSlug,
}: {
  options: { id: string; team_id?: string | null }[];
  bets: { option_id: string; amount: number }[];
  teamSignalsByTeamId?: Record<string, TeamSignal>;
  marketSlug?: string;
}) {
  const safeOptions = options || [];
  const safeBets = bets || [];

  if (safeOptions.length === 0) {
    return {};
  }

  const maxPollVotes = safeOptions.reduce((maxValue, option) => {
    const teamId = option.team_id || "";
    const signal = teamSignalsByTeamId[teamId];
    return Math.max(maxValue, Number(signal?.pollVotes || 0));
  }, 0);

  const rawSignals = safeOptions.map((option) => {
    const optionBets = safeBets.filter((bet) => bet.option_id === option.id);
    const amount = optionBets.reduce(
      (sum, bet) => sum + Number(bet.amount || 0),
      0
    );

    const teamId = option.team_id || "";
    const signal = teamSignalsByTeamId[teamId];

    const betSignal = amount + MARKET_PRIOR_PER_OPTION;

    const pollSignal = getPollSignal({
      signal,
      marketSlug,
      maxPollVotes,
    });

    const historicalSignal = getHistoricalSignal({
      signal,
      marketSlug,
    });

    return {
      option,
      amount,
      betCount: optionBets.length,
      betSignal,
      pollSignal,
      historicalSignal,
    };
  });

  const totalBetSignal = rawSignals.reduce(
    (sum, item) => sum + item.betSignal,
    0
  );

  const totalPollSignal = rawSignals.reduce(
    (sum, item) => sum + item.pollSignal,
    0
  );

  const totalHistoricalSignal = rawSignals.reduce(
    (sum, item) => sum + item.historicalSignal,
    0
  );

  const results: Record<string, FuturesMarketCalculation> = {};

  rawSignals.forEach((item) => {
    const betShare = safeDivide(item.betSignal, totalBetSignal);
    const pollShare = safeDivide(item.pollSignal, totalPollSignal);
    const historicalShare = safeDivide(
      item.historicalSignal,
      totalHistoricalSignal
    );

    let probability =
      betShare * 0.45 + pollShare * 0.2 + historicalShare * 0.35;

    probability = clamp(probability, MIN_PROBABILITY, MAX_PROBABILITY);

    results[item.option.id] = {
      optionId: item.option.id,
      amount: item.amount,
      betCount: item.betCount,
      probability,
      odds: roundOdds(1 / probability),
      pollSignal: Math.round(item.pollSignal * 100) / 100,
      historicalSignal: Math.round(item.historicalSignal * 100) / 100,
      betSignal: Math.round(item.betSignal * 100) / 100,
    };
  });

  return results;
}