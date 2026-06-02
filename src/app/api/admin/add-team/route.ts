import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, name, captain, color, league } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!name) {
    return NextResponse.json(
      { error: "Team name is required" },
      { status: 400 }
    );
  }

  if (league !== "competitive" && league !== "recreational") {
    return NextResponse.json(
      { error: "League must be competitive or recreational" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("teams").insert({
    name,
    captain,
    color,
    league,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}