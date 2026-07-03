import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    teamId,
    playoffDisqualified,
    playoffDisqualificationReason,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      {
        error: "Unauthorized. Please log in again.",
      },
      { status: 401 }
    );
  }

  if (!teamId) {
    return NextResponse.json(
      {
        error: "Missing team ID.",
      },
      { status: 400 }
    );
  }

  const isDisqualified = Boolean(playoffDisqualified);
  const reason = String(playoffDisqualificationReason || "").trim();

  const updatePayload = {
    playoff_disqualified: isDisqualified,
    playoff_disqualification_reason: isDisqualified ? reason || null : null,
    playoff_disqualified_at: isDisqualified ? new Date().toISOString() : null,
  };

  const { data: team, error } = await supabaseAdmin
    .from("teams")
    .update(updatePayload)
    .eq("id", teamId)
    .select(
      "id, name, league, logo_url, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  if (!team) {
    return NextResponse.json(
      {
        error: "Team not found.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    team,
    message: isDisqualified
      ? `${team.name} has been disqualified from playoffs.`
      : `${team.name} has been restored to playoff eligibility.`,
  });
}