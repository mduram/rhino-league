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
  const secret =
    process.env.COMMENT_VOTE_HASH_SECRET ||
    process.env.VOTE_HASH_SECRET ||
    "dev-rhino-comment-vote-secret";

  return createHash("sha256")
    .update(`${secret}:${value}`)
    .digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json();

  const { commentId, voteValue } = body;

  if (!commentId) {
    return NextResponse.json(
      { error: "Missing comment ID." },
      { status: 400 }
    );
  }

  const parsedVoteValue = Number(voteValue);

  if (parsedVoteValue !== 1 && parsedVoteValue !== -1) {
    return NextResponse.json(
      { error: "Vote value must be 1 or -1." },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const ipHash = hashValue(`${clientIp}:${userAgent}`);

  const { data: existingVote, error: existingVoteError } = await supabaseAdmin
    .from("comment_votes")
    .select("id, vote_value")
    .eq("comment_id", commentId)
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (existingVoteError) {
    return NextResponse.json(
      { error: existingVoteError.message },
      { status: 500 }
    );
  }

  let delta = 0;
  let action: "created" | "updated" | "removed" = "created";

  if (!existingVote) {
    const { error: insertError } = await supabaseAdmin
      .from("comment_votes")
      .insert({
        comment_id: commentId,
        ip_hash: ipHash,
        vote_value: parsedVoteValue,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    delta = parsedVoteValue;
    action = "created";
  } else if (existingVote.vote_value === parsedVoteValue) {
    const { error: deleteError } = await supabaseAdmin
      .from("comment_votes")
      .delete()
      .eq("id", existingVote.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    delta = -parsedVoteValue;
    action = "removed";
  } else {
    const { error: updateError } = await supabaseAdmin
      .from("comment_votes")
      .update({
        vote_value: parsedVoteValue,
      })
      .eq("id", existingVote.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    delta = parsedVoteValue - existingVote.vote_value;
    action = "updated";
  }

  const { error: incrementError } = await supabaseAdmin.rpc(
    "increment_comment_score",
    {
      input_comment_id: commentId,
      input_delta: delta,
    }
  );

  if (incrementError) {
    return NextResponse.json(
      { error: incrementError.message },
      { status: 500 }
    );
  }

  const { data: updatedComment, error: commentError } = await supabaseAdmin
    .from("comments")
    .select("id, score")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    return NextResponse.json(
      { error: commentError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    action,
    score: updatedComment?.score || 0,
  });
}