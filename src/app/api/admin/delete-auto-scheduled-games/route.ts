import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  const { data: autoGames, error: findError } = await supabaseAdmin
    .from("games")
    .select("id, status, pool_group")
    .in("status", ["scheduled", "unscheduled"])
    .or("pool_group.ilike.Auto Scheduled%,pool_group.ilike.Auto Scheduler%");

  if (findError) {
    return NextResponse.json(
      { error: findError.message },
      { status: 500 }
    );
  }

  const gameIds = (autoGames || []).map((game) => game.id);

  if (gameIds.length === 0) {
    return NextResponse.json({
      success: true,
      deleted: 0,
      message: "No auto-scheduled games found.",
    });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("games")
    .delete()
    .in("id", gameIds);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deleted: gameIds.length,
    message: `Deleted ${gameIds.length} auto-scheduled games.`,
  });
}