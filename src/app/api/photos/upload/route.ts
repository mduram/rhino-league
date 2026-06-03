import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PHOTO_BUCKET = "league-photos";

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file");
  const title = String(formData.get("title") || "").trim();
  const uploaderName = String(formData.get("uploaderName") || "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing photo file." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload an image file." },
      { status: 400 }
    );
  }

  const maxSizeMb = 10;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return NextResponse.json(
      { error: `Photo is too large. Max size is ${maxSizeMb} MB.` },
      { status: 400 }
    );
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : "jpg";

  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeFileName(
    file.name || `photo.${extension}`
  )}`;

  const storagePath = `uploads/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, buffer, {
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
    .from(PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;

  const { data: photo, error: insertError } = await supabaseAdmin
    .from("photos")
    .insert({
      image_url: imageUrl,
      storage_path: storagePath,
      title: title || null,
      uploader_name: uploaderName || null,
      likes: 0,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([storagePath]);

    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    photo,
  });
}