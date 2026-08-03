import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function hashValue(value: string) {
  const secret = process.env.VOTE_HASH_SECRET || "dev-rhino-vote-secret";

  return createHash("sha256")
    .update(`${secret}:${value}`)
    .digest("hex");
}

type GameType = "regular" | "playoff";

function normalizeGameType(value: unknown): GameType | null {
  if (value === undefined || value === null || value === "regular") {
    return "regular";
  }

  return value === "playoff" ? "playoff" : null;
}

function gameTable(gameType: GameType) {
  return gameType === "playoff" ? "playoff_games" : "games";
}

function voteGameIdColumn(gameType: GameType) {
  return gameType === "playoff" ? "playoff_game_id" : "game_id";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const gameType = normalizeGameType(searchParams.get("gameType"));

  if (!gameId || !gameType) {
    return NextResponse.json(
      { error: "A valid game ID and game type are required." },
      { status: 400 }
    );
  }

  const { data: game, error } = await supabaseAdmin
    .from(gameTable(gameType))
    .select("id, home_votes, away_votes")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    home_votes: Number(game.home_votes || 0),
    away_votes: Number(game.away_votes || 0),
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { gameId, side } = body;
  const gameType = normalizeGameType(body.gameType);

  if (!gameId) {
    return NextResponse.json(
      { error: "Missing game ID." },
      { status: 400 }
    );
  }

  if (side !== "home" && side !== "away") {
    return NextResponse.json(
      { error: "Vote side must be home or away." },
      { status: 400 }
    );
  }

  if (!gameType) {
    return NextResponse.json(
      { error: "Game type must be regular or playoff." },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const ipHash = hashValue(clientIp);
  const userAgentHash = hashValue(userAgent);

  const { data: existingVote, error: existingVoteError } = await supabaseAdmin
    .from("poll_votes")
    .select("id, side")
    .eq(voteGameIdColumn(gameType), gameId)
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (existingVoteError) {
    return NextResponse.json(
      { error: existingVoteError.message },
      { status: 500 }
    );
  }

  if (existingVote) {
    return NextResponse.json(
      {
        error: "You already voted on this game.",
        alreadyVoted: true,
        side: existingVote.side,
      },
      { status: 409 }
    );
  }

  const { data: game, error: gameError } = await supabaseAdmin
    .from(gameTable(gameType))
    .select("id, home_votes, away_votes")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    return NextResponse.json(
      { error: gameError.message },
      { status: 500 }
    );
  }

  if (!game) {
    return NextResponse.json(
      { error: "Game not found." },
      { status: 404 }
    );
  }

  const voteTarget =
    gameType === "playoff"
      ? { playoff_game_id: gameId }
      : { game_id: gameId };
  const { error: voteInsertError } = await supabaseAdmin
    .from("poll_votes")
    .insert({
      ...voteTarget,
      side,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
    });

  if (voteInsertError) {
    if (
      voteInsertError.code === "23505" ||
      voteInsertError.message.toLowerCase().includes("duplicate")
    ) {
      return NextResponse.json(
        {
          error: "You already voted on this game.",
          alreadyVoted: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: voteInsertError.message },
      { status: 500 }
    );
  }

  const nextHomeVotes =
    side === "home"
      ? Number(game.home_votes || 0) + 1
      : Number(game.home_votes || 0);

  const nextAwayVotes =
    side === "away"
      ? Number(game.away_votes || 0) + 1
      : Number(game.away_votes || 0);

  const { data: updatedGame, error: updateError } = await supabaseAdmin
    .from(gameTable(gameType))
    .update({
      home_votes: nextHomeVotes,
      away_votes: nextAwayVotes,
    })
    .eq("id", gameId)
    .select("id, home_votes, away_votes")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  if (!updatedGame) {
    return NextResponse.json(
      { error: "Vote update failed. Game not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    home_votes: updatedGame.home_votes || 0,
    away_votes: updatedGame.away_votes || 0,
  });
}
