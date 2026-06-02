import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_FILE_SIZE = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const uploaderName = formData.get("uploaderName") as string | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image is too large. Please upload an image under 6 MB." },
      { status: 400 }
    );
  }

  const fileExtension = file.name.split(".").pop() || "jpg";
  const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
  const storagePath = `public/${safeFileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("league-photos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("league-photos")
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;

  const { error: insertError } = await supabaseAdmin.from("photos").insert({
    title: title || null,
    uploader_name: uploaderName || null,
    image_url: imageUrl,
    storage_path: storagePath,
    approved: true,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    imageUrl,
  });
}