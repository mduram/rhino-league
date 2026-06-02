import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

const MAX_LOGO_SIZE = 3 * 1024 * 1024;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const adminToken = formData.get("adminToken") as string | null;
    const name = formData.get("name") as string | null;
    const captain = formData.get("captain") as string | null;
    const color = formData.get("color") as string | null;
    const league = formData.get("league") as string | null;
    const logoFile = formData.get("logo") as File | null;

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

    let logoUrl: string | null = null;
    let logoStoragePath: string | null = null;

    if (logoFile && logoFile.size > 0) {
      if (!logoFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Logo must be an image file." },
          { status: 400 }
        );
      }

      if (logoFile.size > MAX_LOGO_SIZE) {
        return NextResponse.json(
          { error: "Logo is too large. Please upload an image under 3 MB." },
          { status: 400 }
        );
      }

      const fileExtension = logoFile.name.split(".").pop() || "jpg";
      const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      logoStoragePath = `logos/${safeName}-${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("team-logos")
        .upload(logoStoragePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("team-logos")
        .getPublicUrl(logoStoragePath);

      logoUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabaseAdmin.from("teams").insert({
      name,
      captain: captain || null,
      color: color || null,
      league,
      logo_url: logoUrl,
      logo_storage_path: logoStoragePath,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

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