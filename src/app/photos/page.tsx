import { supabase } from "@/lib/supabase";

export default async function PhotosPage() {
  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black">Photos</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-black">Photos</h1>

        {photos?.length === 0 && (
          <p className="text-neutral-400">
            No photos yet. Add some highlights soon.
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {photos?.map((photo: any) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
            >
              <img
                src={photo.image_url}
                alt={photo.title || "Rhino League photo"}
                className="h-64 w-full object-cover"
              />

              {photo.title && (
                <div className="p-4">
                  <h2 className="font-bold">{photo.title}</h2>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}