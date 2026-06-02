import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { password, gameId } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!gameId) {
    return NextResponse.json(
      { error: "Game ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("games")
    .update({
      scheduled_at: null,
      location: null,
      status: "unscheduled",
    })
    .eq("id", gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}