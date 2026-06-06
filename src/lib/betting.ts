export type BettingMarket = {
  gameId: string;
  homeBetCount: number;
  awayBetCount: number;
  totalBetCount: number;
  homeAmount: number;
  awayAmount: number;
  totalMarket: number;
  homeOdds: number;
  awayOdds: number;
  homeProbability: number;
  awayProbability: number;
};

const POLL_PRIOR_PER_SIDE = 6;
const MARKET_PRIOR_PER_SIDE = 50;

const MIN_PROBABILITY = 0.3;
const MAX_PROBABILITY = 0.7;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundOdds(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateMarket({
  gameId,
  homeVotes,
  awayVotes,
  bets,
}: {
  gameId: string;
  homeVotes: number;
  awayVotes: number;
  bets: {
    side: "home" | "away";
    amount: number;
  }[];
}): BettingMarket {
  const homeBetCount = bets.filter((bet) => bet.side === "home").length;
  const awayBetCount = bets.filter((bet) => bet.side === "away").length;

  const homeAmount = bets
    .filter((bet) => bet.side === "home")
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);

  const awayAmount = bets
    .filter((bet) => bet.side === "away")
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);

  const totalMarket = homeAmount + awayAmount;
  const totalVotes = Number(homeVotes || 0) + Number(awayVotes || 0);

  const adjustedHomeVotes = Number(homeVotes || 0) + POLL_PRIOR_PER_SIDE;
  const adjustedAwayVotes = Number(awayVotes || 0) + POLL_PRIOR_PER_SIDE;

  const adjustedHomeAmount = homeAmount + MARKET_PRIOR_PER_SIDE;
  const adjustedAwayAmount = awayAmount + MARKET_PRIOR_PER_SIDE;

  const pollHomeProbability =
    adjustedHomeVotes / (adjustedHomeVotes + adjustedAwayVotes);

  const marketHomeProbability =
    adjustedHomeAmount / (adjustedHomeAmount + adjustedAwayAmount);

  let homeProbability = 0.5;

  if (totalVotes > 0 && totalMarket > 0) {
    homeProbability = pollHomeProbability * 0.35 + marketHomeProbability * 0.65;
  } else if (totalVotes > 0) {
    homeProbability = pollHomeProbability;
  } else if (totalMarket > 0) {
    homeProbability = marketHomeProbability;
  }

  homeProbability = clamp(homeProbability, MIN_PROBABILITY, MAX_PROBABILITY);

  const awayProbability = 1 - homeProbability;

  return {
    gameId,
    homeBetCount,
    awayBetCount,
    totalBetCount: homeBetCount + awayBetCount,
    homeAmount,
    awayAmount,
    totalMarket,
    homeProbability,
    awayProbability,
    homeOdds: roundOdds(1 / homeProbability),
    awayOdds: roundOdds(1 / awayProbability),
  };
}