import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import {
  buildPlayoffGameRows,
  getPlayoffSeedsFromStandings,
} from "@/lib/playoffBracket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, force } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!SEASON_PHASE.playoffSchedulePublished) {
    return NextResponse.json(
      {
        error:
          "The playoff schedule release switch is still off. Publish the schedule only after every regular-season result is complete.",
      },
      { status: 423 }
    );
  }

  const { count: unfinishedRegularSeasonGames, error: unfinishedError } =
    await supabaseAdmin
      .from("games")
      .select("id", {
        count: "exact",
        head: true,
      })
      .neq("status", "completed");

  if (unfinishedError) {
    return NextResponse.json(
      { error: unfinishedError.message },
      { status: 500 }
    );
  }

  if ((unfinishedRegularSeasonGames || 0) > 0 && !force) {
    return NextResponse.json(
      {
        error:
          "Regular season is not fully completed yet. Use force=true only if you intentionally want to generate the bracket before all games are completed.",
      },
      { status: 400 }
    );
  }

  const { count: existingGameCount, error: countError } = await supabaseAdmin
    .from("playoff_games")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((existingGameCount || 0) > 0 && !force) {
    return NextResponse.json(
      {
        error:
          "A playoff bracket already exists. Turn on force regenerate only if you want to delete and rebuild it.",
      },
      { status: 400 }
    );
  }

  try {
    const seeds = await getPlayoffSeedsFromStandings();
    const gameRows = buildPlayoffGameRows(seeds);

    const { error: deleteGamesError } = await supabaseAdmin
      .from("playoff_games")
      .delete()
      .neq("game_number", -1);

    if (deleteGamesError) {
      throw new Error(deleteGamesError.message);
    }

    const { error: deleteSeedsError } = await supabaseAdmin
      .from("playoff_seeds")
      .delete()
      .neq("seed", -1);

    if (deleteSeedsError) {
      throw new Error(deleteSeedsError.message);
    }

    const { error: insertSeedsError } = await supabaseAdmin
      .from("playoff_seeds")
      .insert(
        seeds.map((seed) => ({
          seed: seed.seed,
          team_id: seed.teamId,
          standing_points: seed.standingPoints,
          wins: seed.wins,
          losses: seed.losses,
          differential: seed.differential,
          games_played: seed.gamesPlayed,
        }))
      );

    if (insertSeedsError) {
      throw new Error(insertSeedsError.message);
    }

    const { error: insertGamesError } = await supabaseAdmin
      .from("playoff_games")
      .insert(gameRows);

    if (insertGamesError) {
      throw new Error(insertGamesError.message);
    }

    const { error: settingsError } = await supabaseAdmin
      .from("playoff_settings")
      .upsert({
        id: "main",
        season_year: 2026,
        bracket_size: 30,
        starts_on: "2026-08-03",
        ends_on: "2026-08-28",
        third_place_at: "2026-08-28T14:00:00-04:00",
        final_at: "2026-08-28T16:00:00-04:00",
        is_generated: true,
        updated_at: new Date().toISOString(),
      });

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    return NextResponse.json({
      success: true,
      message:
        "Official 30-team playoff bracket generated. Seeds #1 and #2 received first-round BYEs.",
      seedCount: seeds.length,
      gameCount: gameRows.length,
      seeds,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Could not generate playoff bracket.",
      },
      { status: 500 }
    );
  }
}
