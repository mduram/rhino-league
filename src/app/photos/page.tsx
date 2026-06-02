import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import PhotoUploadForm from "./PhotoUploadForm";
import PhotoLikeButton from "./PhotoLikeButton";

export default async function PhotosPage() {
  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <PageShell title="Photos">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Photos"
      subtitle="Upload highlights, questionable celebrations, and proof that you totally touched the ball."
    >
      <PhotoUploadForm />

      {photos?.length === 0 && (
        <p className="text-neutral-400">
          No photos yet. Be the first to post one.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {photos?.map((photo: any) => (
          <div
            key={photo.id}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-black/30"
          >
            <img
              src={photo.image_url}
              alt={photo.title || "Rhino League photo"}
              className="h-72 w-full object-cover transition duration-300 group-hover:scale-105"
            />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {photo.title && (
                    <h2 className="text-lg font-black text-white">
                      {photo.title}
                    </h2>
                  )}

                  {photo.uploader_name && (
                    <p className="mt-1 text-sm text-neutral-400">
                      Posted by {photo.uploader_name}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-neutral-500">
                    {new Date(photo.created_at).toLocaleString()}
                  </p>
                </div>

                <PhotoLikeButton
                  photoId={photo.id}
                  initialLikes={photo.likes || 0}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}