import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

const PHOTO_BUCKET = "league-photos";

function getStoragePathFromPublicUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = imageUrl.slice(markerIndex + marker.length);

  if (!path) return null;

  return decodeURIComponent(path);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { adminToken, photoId } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!photoId) {
    return NextResponse.json(
      { error: "Missing photo ID." },
      { status: 400 }
    );
  }

  const { data: photo, error: photoError } = await supabaseAdmin
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError) {
    return NextResponse.json(
      { error: photoError.message },
      { status: 500 }
    );
  }

  if (!photo) {
    return NextResponse.json(
      { error: "Photo not found." },
      { status: 404 }
    );
  }

  const imageUrl = photo.image_url || null;

  const storagePath =
    photo.storage_path ||
    photo.image_storage_path ||
    photo.path ||
    getStoragePathFromPublicUrl(imageUrl);

  let storageDeleteMessage = "";

  if (storagePath) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      storageDeleteMessage = `Photo row deleted, but storage file could not be deleted: ${storageError.message}`;
    } else {
      storageDeleteMessage = "Storage file deleted.";
    }
  } else {
    storageDeleteMessage =
      "Photo row deleted. No storage path was found, so no storage file was deleted.";
  }

  const { error: deleteError } = await supabaseAdmin
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedPhotoId: photoId,
    storagePath,
    message: storageDeleteMessage,
  });
}