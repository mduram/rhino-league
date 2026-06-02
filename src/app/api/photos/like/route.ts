import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { photoId } = body;

  if (!photoId) {
    return NextResponse.json(
      { error: "Photo ID is required." },
      { status: 400 }
    );
  }

  const { data: photo, error: fetchError } = await supabaseAdmin
    .from("photos")
    .select("likes")
    .eq("id", photoId)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: 500 }
    );
  }

  const newLikes = Number(photo.likes || 0) + 1;

  const { data: updatedPhoto, error: updateError } = await supabaseAdmin
    .from("photos")
    .update({ likes: newLikes })
    .eq("id", photoId)
    .select("likes")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    likes: updatedPhoto.likes,
  });
}