export type WorldCupBetSide = "home" | "draw" | "away";

export type WorldCupMarketBet = {
  side: WorldCupBetSide;
  amount: number;
};

export type WorldCupMarket = {
  matchId: string;

  homeBetCount: number;
  drawBetCount: number;
  awayBetCount: number;

  totalBetCount: number;

  homeAmount: number;
  drawAmount: number;
  awayAmount: number;

  totalMarket: number;

  homeProbability: number;
  drawProbability: number;
  awayProbability: number;

  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
};

const MARKET_PRIOR_PER_SIDE = 50;

const MIN_PROBABILITY = 0.12;
const MAX_PROBABILITY = 0.7;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundOdds(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeProbabilities(
  home: number,
  draw: number,
  away: number
) {
  const total = home + draw + away;

  if (total <= 0) {
    return {
      home: 1 / 3,
      draw: 1 / 3,
      away: 1 / 3,
    };
  }

  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };
}

export function calculateWorldCupMarket({
  matchId,
  bets,
}: {
  matchId: string;
  bets: WorldCupMarketBet[];
}): WorldCupMarket {
  const homeBets = bets.filter((bet) => bet.side === "home");
  const drawBets = bets.filter((bet) => bet.side === "draw");
  const awayBets = bets.filter((bet) => bet.side === "away");

  const homeBetCount = homeBets.length;
  const drawBetCount = drawBets.length;
  const awayBetCount = awayBets.length;

  const homeAmount = homeBets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );

  const drawAmount = drawBets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );

  const awayAmount = awayBets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );

  const totalMarket =
    homeAmount +
    drawAmount +
    awayAmount;

  const adjustedHome =
    homeAmount + MARKET_PRIOR_PER_SIDE;

  const adjustedDraw =
    drawAmount + MARKET_PRIOR_PER_SIDE;

  const adjustedAway =
    awayAmount + MARKET_PRIOR_PER_SIDE;

  const adjustedTotal =
    adjustedHome +
    adjustedDraw +
    adjustedAway;

  let homeProbability =
    adjustedHome / adjustedTotal;

  let drawProbability =
    adjustedDraw / adjustedTotal;

  let awayProbability =
    adjustedAway / adjustedTotal;

  homeProbability = clamp(
    homeProbability,
    MIN_PROBABILITY,
    MAX_PROBABILITY
  );

  drawProbability = clamp(
    drawProbability,
    MIN_PROBABILITY,
    MAX_PROBABILITY
  );

  awayProbability = clamp(
    awayProbability,
    MIN_PROBABILITY,
    MAX_PROBABILITY
  );

  const normalized = normalizeProbabilities(
    homeProbability,
    drawProbability,
    awayProbability
  );

  homeProbability = normalized.home;
  drawProbability = normalized.draw;
  awayProbability = normalized.away;

  return {
    matchId,

    homeBetCount,
    drawBetCount,
    awayBetCount,

    totalBetCount:
      homeBetCount +
      drawBetCount +
      awayBetCount,

    homeAmount,
    drawAmount,
    awayAmount,

    totalMarket,

    homeProbability,
    drawProbability,
    awayProbability,

    homeOdds: roundOdds(1 / homeProbability),
    drawOdds: roundOdds(1 / drawProbability),
    awayOdds: roundOdds(1 / awayProbability),
  };
}