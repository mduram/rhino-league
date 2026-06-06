import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not logged in." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  if (!profile) {
    const fallbackName =
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Rhino Player";

    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        display_name: fallbackName,
        rhino_coins: 100,
      })
      .select("*")
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: createdProfile,
    });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
}