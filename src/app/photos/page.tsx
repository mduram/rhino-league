import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import PhotoGalleryClient from "@/components/PhotoGalleryClient";
import PhotoUploadForm from "@/components/PhotoUploadForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PhotosPage() {
  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
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
      subtitle="Upload league photos, expand them, comment on them, and relive the Rhino League chaos."
    >
      <PhotoUploadForm />

      <PhotoGalleryClient photos={photos || []} />
    </PageShell>
  );
}