import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { optionId } = await request.json();

  if (!optionId) {
    return NextResponse.json(
      { error: "Option ID is required" },
      { status: 400 }
    );
  }

  const { data: option, error: fetchError } = await supabaseAdmin
    .from("poll_options")
    .select("votes")
    .eq("id", optionId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from("poll_options")
    .update({ votes: option.votes + 1 })
    .eq("id", optionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}