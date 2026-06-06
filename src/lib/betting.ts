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

  const pollHomeProbability =
    totalVotes > 0 ? Number(homeVotes || 0) / totalVotes : 0.5;

  const marketHomeProbability =
    totalMarket > 0 ? homeAmount / totalMarket : 0.5;

  let homeProbability = 0.5;

  if (totalVotes > 0 && totalMarket > 0) {
    homeProbability = pollHomeProbability * 0.5 + marketHomeProbability * 0.5;
  } else if (totalVotes > 0) {
    homeProbability = pollHomeProbability;
  } else if (totalMarket > 0) {
    homeProbability = marketHomeProbability;
  }

  homeProbability = clamp(homeProbability, 0.1, 0.9);
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