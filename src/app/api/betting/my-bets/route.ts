import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_PHASE } from "@/lib/seasonPhase";

export const dynamic = "force-dynamic";

type HydratedGame = {
  id: string;
  [key: string]: unknown;
};

type HydratedBet = {
  created_at: string;
  [key: string]: unknown;
};

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "You need to log in to see your bets." },
      { status: 401 }
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

  const { data: gameBets, error: gameBetsError } = await supabaseAdmin
    .from("game_bets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (gameBetsError) {
    return NextResponse.json(
      { error: gameBetsError.message },
      { status: 500 }
    );
  }

  const gameIds = [...new Set((gameBets || []).map((bet) => bet.game_id))];

  let gamesById: Record<string, HydratedGame> = {};

  if (gameIds.length > 0) {
    const { data: games, error: gamesError } = await supabaseAdmin
      .from("games")
      .select(`
        id,
        scheduled_at,
        location,
        status,
        home_score,
        away_score,
        league,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(id, name, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, logo_url)
      `)
      .in("id", gameIds);

    if (gamesError) {
      return NextResponse.json(
        { error: gamesError.message },
        { status: 500 }
      );
    }

    gamesById = Object.fromEntries((games || []).map((game) => [game.id, game]));
  }

  const hydratedGameBets = (gameBets || []).map((bet) => ({
    ...bet,
    bet_type: "game",
    game: gamesById[bet.game_id] || null,
  }));

  const { data: futuresBets, error: futuresBetsError } = await supabaseAdmin
    .from("futures_bets")
    .select(`
      id,
      user_id,
      market_id,
      option_id,
      amount,
      odds,
      potential_payout,
      status,
      created_at,
      market:futures_markets(
        id,
        slug,
        title,
        description,
        status,
        closes_at,
        winning_option_id
      ),
      option:futures_options(
        id,
        team_id,
        label,
        team:teams(id, name, logo_url, league)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (futuresBetsError) {
    return NextResponse.json(
      { error: futuresBetsError.message },
      { status: 500 }
    );
  }

  const hydratedFuturesBets = (futuresBets || []).map((bet) => ({
    ...bet,
    bet_type: "futures",
  }));

  let hydratedPlayoffBets: HydratedBet[] = [];

  if (SEASON_PHASE.playoffSchedulePublished) {
    const { data: playoffBets, error: playoffBetsError } = await supabaseAdmin
      .from("playoff_game_bets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (playoffBetsError) {
      return NextResponse.json(
        { error: playoffBetsError.message },
        { status: 500 }
      );
    }

    const playoffGameIds = [
      ...new Set(
        (playoffBets || []).map((bet) => bet.playoff_game_id as string)
      ),
    ];
    let playoffGamesById: Record<string, HydratedGame> = {};

    if (playoffGameIds.length > 0) {
      const { data: playoffGames, error: playoffGamesError } =
        await supabaseAdmin
          .from("playoff_games")
          .select(`
            id,
            game_number,
            round_label,
            scheduled_at,
            location,
            status,
            home_score,
            away_score,
            home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url, league),
            away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url, league)
          `)
          .in("id", playoffGameIds);

      if (playoffGamesError) {
        return NextResponse.json(
          { error: playoffGamesError.message },
          { status: 500 }
        );
      }

      playoffGamesById = Object.fromEntries(
        (playoffGames || []).map((game) => [game.id, game])
      );
    }

    hydratedPlayoffBets = (playoffBets || []).map(
      (bet) =>
        ({
          ...bet,
          bet_type: "playoff",
          game: playoffGamesById[bet.playoff_game_id] || null,
        }) as HydratedBet
    );
  }

  const allBets = [
    ...hydratedGameBets,
    ...hydratedFuturesBets,
    ...hydratedPlayoffBets,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    bets: allBets,
    gameBets: hydratedGameBets,
    futuresBets: hydratedFuturesBets,
    playoffBets: hydratedPlayoffBets,
  });
}
