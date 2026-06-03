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

export async function POST(request: Request) {
  const body = await request.json();

  const { gameId, side } = body;

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

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const ipHash = hashValue(clientIp);
  const userAgentHash = hashValue(userAgent);

  const { data: existingVote, error: existingVoteError } = await supabaseAdmin
    .from("poll_votes")
    .select("id, side")
    .eq("game_id", gameId)
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
    .from("games")
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

  const { error: voteInsertError } = await supabaseAdmin
    .from("poll_votes")
    .insert({
      game_id: gameId,
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
    .from("games")
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