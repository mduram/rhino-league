import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();

  const { password, league, rounds } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (league !== "competitive" && league !== "recreational") {
    return NextResponse.json(
      { error: "League must be competitive or recreational" },
      { status: 400 }
    );
  }

  const numberOfRounds = Number(rounds || 1);

  if (numberOfRounds < 1 || numberOfRounds > 10) {
    return NextResponse.json(
      { error: "Rounds must be between 1 and 10" },
      { status: 400 }
    );
  }

  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id, name, league")
    .eq("league", league)
    .order("name", { ascending: true });

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  if (!teams || teams.length < 2) {
    return NextResponse.json(
      { error: "Need at least two teams in this league" },
      { status: 400 }
    );
  }

  const gamesToInsert = [];

  for (let round = 1; round <= numberOfRounds; round++) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = round % 2 === 1 ? teams[i] : teams[j];
        const awayTeam = round % 2 === 1 ? teams[j] : teams[i];

        gamesToInsert.push({
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          scheduled_at: null,
          location: null,
          status: "unscheduled",
          home_score: 0,
          away_score: 0,
          home_votes: 0,
          away_votes: 0,
          league,
          round_label: `Round ${round}`,
          weight: league === "competitive" ? 1.25 : 1,
        });
      }
    }
  }

  const { error: insertError } = await supabaseAdmin
    .from("games")
    .insert(gamesToInsert);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    created: gamesToInsert.length,
  });
}