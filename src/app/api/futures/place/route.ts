import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateFuturesOdds, TeamSignal } from "@/lib/futures";
import {
  isPlayoffFuturesSlug,
  isRegularSeasonFuturesSlug,
} from "@/lib/seasonPhase";

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

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "You need to log in to place a futures pick." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { marketId, optionId, amount } = body;

  const parsedAmount = Math.floor(Number(amount || 0));

  if (!marketId || !optionId) {
    return NextResponse.json(
      { error: "Missing market or option." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0." },
      { status: 400 }
    );
  }

  const { data: market, error: marketError } = await supabaseAdmin
    .from("futures_markets")
    .select("*")
    .eq("id", marketId)
    .maybeSingle();

  if (marketError) {
    return NextResponse.json(
      { error: marketError.message },
      { status: 500 }
    );
  }

  if (!market) {
    return NextResponse.json(
      { error: "Market not found." },
      { status: 404 }
    );
  }

  if (isRegularSeasonFuturesSlug(market.slug)) {
    return NextResponse.json(
      {
        error:
          "Regular-season futures are closed while the final standings are confirmed.",
      },
      { status: 400 }
    );
  }

  if (market.status !== "open") {
    return NextResponse.json(
      { error: "This futures market is not open." },
      { status: 400 }
    );
  }

  if (market.closes_at && Date.now() >= new Date(market.closes_at).getTime()) {
    return NextResponse.json(
      { error: "This futures market is closed." },
      { status: 400 }
    );
  }

  const { data: option, error: optionError } = await supabaseAdmin
    .from("futures_options")
    .select("*")
    .eq("id", optionId)
    .eq("market_id", marketId)
    .maybeSingle();

  if (optionError) {
    return NextResponse.json(
      { error: optionError.message },
      { status: 500 }
    );
  }

  if (!option) {
    return NextResponse.json(
      { error: "Option not found for this market." },
      { status: 404 }
    );
  }

  if (isPlayoffFuturesSlug(market.slug)) {
    const { data: playoffSeed, error: playoffSeedError } = await supabaseAdmin
      .from("playoff_seeds")
      .select("team_id")
      .eq("team_id", option.team_id)
      .maybeSingle();

    if (playoffSeedError) {
      return NextResponse.json(
        { error: playoffSeedError.message },
        { status: 500 }
      );
    }

    if (!playoffSeed) {
      return NextResponse.json(
        { error: "This team is not eligible for the 2026 playoffs." },
        { status: 400 }
      );
    }
  }

  const { data: existingOpenBet, error: existingBetError } = await supabaseAdmin
    .from("futures_bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("market_id", marketId)
    .eq("status", "open")
    .maybeSingle();

  if (existingBetError) {
    return NextResponse.json(
      { error: existingBetError.message },
      { status: 500 }
    );
  }

  if (existingOpenBet) {
    return NextResponse.json(
      { error: "You already placed a pick in this futures market." },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  if (!profile || Number(profile.rhino_coins || 0) < parsedAmount) {
    return NextResponse.json(
      { error: "Not enough Rhino Coins." },
      { status: 400 }
    );
  }

  const { data: options, error: optionsError } = await supabaseAdmin
    .from("futures_options")
    .select("id, team_id")
    .eq("market_id", marketId);

  if (optionsError) {
    return NextResponse.json(
      { error: optionsError.message },
      { status: 500 }
    );
  }

  const { data: existingBets, error: betsError } = await supabaseAdmin
    .from("futures_bets")
    .select("option_id, amount")
    .eq("market_id", marketId)
    .eq("status", "open");

  if (betsError) {
    return NextResponse.json(
      { error: betsError.message },
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

  let eligibleOptions = options || [];

  if (isPlayoffFuturesSlug(market.slug)) {
    const { data: playoffSeeds, error: playoffSeedsError } = await supabaseAdmin
      .from("playoff_seeds")
      .select("team_id");

    if (playoffSeedsError) {
      return NextResponse.json(
        { error: playoffSeedsError.message },
        { status: 500 }
      );
    }

    const playoffTeamIds = new Set(
      (playoffSeeds || []).map((seed) => seed.team_id)
    );
    eligibleOptions = eligibleOptions.filter(
      (candidate) =>
        candidate.team_id && playoffTeamIds.has(candidate.team_id)
    );
  }

  const oddsByOptionId = calculateFuturesOdds({
    options: eligibleOptions,
    bets: existingBets || [],
    teamSignalsByTeamId,
    marketSlug: market.slug,
  });

  const odds = oddsByOptionId[optionId]?.odds || Number(option.odds || 10);
  const potentialPayout = Math.floor(parsedAmount * odds);

  const { error: coinUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({
      rhino_coins: Number(profile.rhino_coins || 0) - parsedAmount,
    })
    .eq("id", user.id);

  if (coinUpdateError) {
    return NextResponse.json(
      { error: coinUpdateError.message },
      { status: 500 }
    );
  }

  const { data: createdBet, error: insertError } = await supabaseAdmin
    .from("futures_bets")
    .insert({
      user_id: user.id,
      market_id: marketId,
      option_id: optionId,
      amount: parsedAmount,
      odds,
      potential_payout: potentialPayout,
      status: "open",
    })
    .select("*")
    .single();

  if (insertError) {
    await supabaseAdmin
      .from("profiles")
      .update({
        rhino_coins: Number(profile.rhino_coins || 0),
      })
      .eq("id", user.id);

    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    bet: createdBet,
    rhinoCoins: Number(profile.rhino_coins || 0) - parsedAmount,
  });
}
