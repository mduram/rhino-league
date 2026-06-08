import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateFuturesOdds, TeamSignal } from "@/lib/futures";

export const dynamic = "force-dynamic";

function normalizeOptions(options: any) {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  return [];
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

function buildTeamSignals(games: any[]) {
  const signals: Record<string, TeamSignal> = {};

  function ensureTeam(teamId: string) {
    if (!signals[teamId]) {
      signals[teamId] = {
        teamId,
        pollVotes: 0,
        wins: 0,
        losses: 0,
        forfeits: 0,
        standingPoints: 0,
        differential: 0,
        gamesPlayed: 0,
      };
    }

    return signals[teamId];
  }

  games.forEach((game) => {
    if (game.home_team_id) {
      ensureTeam(game.home_team_id).pollVotes += Number(game.home_votes || 0);
    }

    if (game.away_team_id) {
      ensureTeam(game.away_team_id).pollVotes += Number(game.away_votes || 0);
    }

    if (game.status !== "completed") return;

    const home = ensureTeam(game.home_team_id);
    const away = ensureTeam(game.away_team_id);

    const homeScore = Number(game.home_score || 0);
    const awayScore = Number(game.away_score || 0);

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;

    home.differential += homeScore - awayScore;
    away.differential += awayScore - homeScore;

    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;
    const homeLost = homeScore < awayScore;
    const awayLost = awayScore < homeScore;

    if (homeWon) home.wins += 1;
    if (homeLost) home.losses += 1;

    if (awayWon) away.wins += 1;
    if (awayLost) away.losses += 1;

    const homeForfeited =
      Boolean(game.is_forfeit) && game.forfeit_team_id === game.home_team_id;
    const awayForfeited =
      Boolean(game.is_forfeit) && game.forfeit_team_id === game.away_team_id;

    if (homeForfeited) {
      home.forfeits += 1;
      home.standingPoints -= 3;
    } else {
      home.standingPoints += getResultPoints({
        league: game.league,
        didWin: homeWon,
        didLose: homeLost,
      });
    }

    if (awayForfeited) {
      away.forfeits += 1;
      away.standingPoints -= 3;
    } else {
      away.standingPoints += getResultPoints({
        league: game.league,
        didWin: awayWon,
        didLose: awayLost,
      });
    }
  });

  return signals;
}

export async function GET() {
  const { data: markets, error: marketsError } = await supabaseAdmin
    .from("futures_markets")
    .select(`
      id,
      slug,
      title,
      description,
      status,
      closes_at,
      winning_option_id,
      created_at,
      options:futures_options(
        id,
        team_id,
        label,
        odds,
        created_at,
        team:teams(id, name, logo_url, league)
      )
    `)
    .order("created_at", { ascending: true });

  if (marketsError) {
    return NextResponse.json(
      { error: marketsError.message },
      { status: 500 }
    );
  }

  const { data: games, error: gamesError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      status,
      league,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_votes,
      away_votes,
      is_forfeit,
      forfeit_team_id
    `);

  if (gamesError) {
    return NextResponse.json(
      { error: gamesError.message },
      { status: 500 }
    );
  }

  const teamSignalsByTeamId = buildTeamSignals(games || []);

  const marketIds = (markets || []).map((market) => market.id);

  let bets: any[] = [];

  if (marketIds.length > 0) {
    const { data: betsData, error: betsError } = await supabaseAdmin
      .from("futures_bets")
      .select("market_id, option_id, amount, status")
      .in("market_id", marketIds)
      .in("status", ["open", "won", "lost"]);

    if (betsError) {
      return NextResponse.json(
        { error: betsError.message },
        { status: 500 }
      );
    }

    bets = betsData || [];
  }

  const hydratedMarkets = (markets || []).map((market: any) => {
    const options = normalizeOptions(market.options);

    const marketBets = bets.filter((bet) => bet.market_id === market.id);

    const oddsByOptionId = calculateFuturesOdds({
      options,
      bets: marketBets,
      teamSignalsByTeamId,
      marketSlug: market.slug,
    });

    const hydratedOptions = options.map((option: any) => ({
      ...option,
      calculated: oddsByOptionId[option.id],
    }));

    const totalMarket = marketBets.reduce(
      (sum, bet) => sum + Number(bet.amount || 0),
      0
    );

    return {
      ...market,
      options: hydratedOptions,
      totalMarket,
      totalBetCount: marketBets.length,
    };
  });

  return NextResponse.json({
    success: true,
    markets: hydratedMarkets,
  });
}