import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

  const { data: bets, error: betsError } = await supabaseAdmin
    .from("game_bets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (betsError) {
    return NextResponse.json(
      { error: betsError.message },
      { status: 500 }
    );
  }

  const gameIds = [...new Set((bets || []).map((bet) => bet.game_id))];

  let gamesById: Record<string, any> = {};

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

  const hydratedBets = (bets || []).map((bet) => ({
    ...bet,
    game: gamesById[bet.game_id] || null,
  }));

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    bets: hydratedBets,
  });
}