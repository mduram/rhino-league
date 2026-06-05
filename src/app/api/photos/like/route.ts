import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const { photoId } = body;

  if (!photoId) {
    return NextResponse.json(
      { error: "Missing photo ID." },
      { status: 400 }
    );
  }

  const { data: photo, error: photoError } = await supabaseAdmin
    .from("photos")
    .select("id, likes")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError) {
    return NextResponse.json(
      { error: photoError.message },
      { status: 500 }
    );
  }

  if (!photo) {
    return NextResponse.json(
      { error: "Photo not found." },
      { status: 404 }
    );
  }

  const nextLikes = Number(photo.likes || 0) + 1;

  const { data: updatedPhoto, error: updateError } = await supabaseAdmin
    .from("photos")
    .update({
      likes: nextLikes,
    })
    .eq("id", photoId)
    .select("id, likes")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    likes: updatedPhoto?.likes || nextLikes,
  });
}