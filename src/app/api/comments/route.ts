import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_TARGET_TYPES = ["photo", "game"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");

  if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    return NextResponse.json(
      { error: "Invalid target type." },
      { status: 400 }
    );
  }

  if (!targetId) {
    return NextResponse.json(
      { error: "Missing target ID." },
      { status: 400 }
    );
  }

  const { data: comments, error } = await supabaseAdmin
    .from("comments")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "approved")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    comments: comments || [],
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { targetType, targetId, authorName, commentBody } = body;

  if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    return NextResponse.json(
      { error: "Invalid target type." },
      { status: 400 }
    );
  }

  if (!targetId) {
    return NextResponse.json(
      { error: "Missing target ID." },
      { status: 400 }
    );
  }

  const cleanedBody = String(commentBody || "").trim();
  const cleanedAuthor = String(authorName || "").trim();

  if (!cleanedBody) {
    return NextResponse.json(
      { error: "Comment cannot be empty." },
      { status: 400 }
    );
  }

  if (cleanedBody.length > 1000) {
    return NextResponse.json(
      { error: "Comment is too long. Max 1000 characters." },
      { status: 400 }
    );
  }

  if (cleanedAuthor.length > 80) {
    return NextResponse.json(
      { error: "Name is too long. Max 80 characters." },
      { status: 400 }
    );
  }

  const { data: comment, error } = await supabaseAdmin
    .from("comments")
    .insert({
      target_type: targetType,
      target_id: targetId,
      author_name: cleanedAuthor || "Anonymous Rhino",
      body: cleanedBody,
      score: 0,
      status: "approved",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    comment,
  });
}