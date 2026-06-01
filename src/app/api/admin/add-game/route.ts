import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    password,
    homeTeamId,
    awayTeamId,
    scheduledAt,
    location,
  } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!homeTeamId || !awayTeamId || !scheduledAt) {
    return NextResponse.json(
      { error: "Home team, away team, and date/time are required" },
      { status: 400 }
    );
  }

  if (homeTeamId === awayTeamId) {
    return NextResponse.json(
      { error: "A team cannot play itself" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("games").insert({
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    scheduled_at: scheduledAt,
    location,
    status: "scheduled",
    home_score: 0,
    away_score: 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}