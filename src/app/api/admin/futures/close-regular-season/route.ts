import { NextResponse } from "next/server";

import { isValidAdminToken } from "@/lib/adminAuth";
import { REGULAR_SEASON_FUTURES_SLUGS } from "@/lib/seasonPhase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { adminToken } = await request.json();

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  const closedAt = new Date().toISOString();
  const { data: markets, error } = await supabaseAdmin
    .from("futures_markets")
    .update({
      status: "closed",
      closes_at: closedAt,
    })
    .in("slug", [...REGULAR_SEASON_FUTURES_SLUGS])
    .select("id, slug, title, status, closes_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    markets: markets || [],
    message: `Closed ${markets?.length || 0} regular-season futures markets. Existing picks were preserved for settlement.`,
  });
}
