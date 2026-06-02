import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

function shuffle<T>(array: T[]) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    league,
    gamesPerTeam,
    poolGroup,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (league !== "competitive" && league !== "recreational") {
    return NextResponse.json(
      { error: "League must be competitive or recreational" },
      { status: 400 }
    );
  }

  const targetGamesPerTeam = Number(gamesPerTeam || 1);

  if (targetGamesPerTeam < 1 || targetGamesPerTeam > 30) {
    return NextResponse.json(
      { error: "Games per team must be between 1 and 30" },
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

  if (targetGamesPerTeam > teams.length - 1) {
    return NextResponse.json(
      {
        error: `With ${teams.length} teams, each team can play at most ${
          teams.length - 1
        } unique opponents.`,
      },
      { status: 400 }
    );
  }

  const batchId = crypto.randomUUID();
  const teamGameCounts = new Map<string, number>();
  const usedPairKeys = new Set<string>();
  const selectedGames: any[] = [];

  teams.forEach((team) => {
    teamGameCounts.set(team.id, 0);
  });

  const allPairs: any[] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      allPairs.push({
        teamA: teams[i],
        teamB: teams[j],
        key: [teams[i].id, teams[j].id].sort().join("__"),
      });
    }
  }

  let safetyCounter = 0;
  const maxSafety = 10000;

  while (
    Array.from(teamGameCounts.values()).some(
      (count) => count < targetGamesPerTeam
    ) &&
    safetyCounter < maxSafety
  ) {
    safetyCounter += 1;

    const shuffledPairs = shuffle(allPairs);

    shuffledPairs.sort((a, b) => {
      const aNeed =
        targetGamesPerTeam -
        (teamGameCounts.get(a.teamA.id) || 0) +
        targetGamesPerTeam -
        (teamGameCounts.get(a.teamB.id) || 0);

      const bNeed =
        targetGamesPerTeam -
        (teamGameCounts.get(b.teamA.id) || 0) +
        targetGamesPerTeam -
        (teamGameCounts.get(b.teamB.id) || 0);

      return bNeed - aNeed;
    });

    const pair = shuffledPairs.find((candidate) => {
      if (usedPairKeys.has(candidate.key)) return false;

      const aCount = teamGameCounts.get(candidate.teamA.id) || 0;
      const bCount = teamGameCounts.get(candidate.teamB.id) || 0;

      return aCount < targetGamesPerTeam && bCount < targetGamesPerTeam;
    });

    if (!pair) break;

    usedPairKeys.add(pair.key);

    const currentRoundNumber =
      Math.max(
        teamGameCounts.get(pair.teamA.id) || 0,
        teamGameCounts.get(pair.teamB.id) || 0
      ) + 1;

    const flipHomeAway = selectedGames.length % 2 === 1;

    const homeTeam = flipHomeAway ? pair.teamB : pair.teamA;
    const awayTeam = flipHomeAway ? pair.teamA : pair.teamB;

    selectedGames.push({
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      scheduled_at: null,
      location: null,
      court: null,
      status: "unscheduled",
      home_score: 0,
      away_score: 0,
      home_votes: 0,
      away_votes: 0,
      league,
      round_label: `Generated ${currentRoundNumber}`,
      weight: league === "competitive" ? 1.25 : 1,
      pool_group: poolGroup || `${league}-${targetGamesPerTeam}-games`,
      generated_batch_id: batchId,
      submitted_score_pending: false,
    });

    teamGameCounts.set(
      pair.teamA.id,
      (teamGameCounts.get(pair.teamA.id) || 0) + 1
    );

    teamGameCounts.set(
      pair.teamB.id,
      (teamGameCounts.get(pair.teamB.id) || 0) + 1
    );
  }

  if (selectedGames.length === 0) {
    return NextResponse.json(
      { error: "Could not generate any games." },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("games")
    .insert(selectedGames);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    created: selectedGames.length,
    teamCounts: Object.fromEntries(teamGameCounts),
  });
}