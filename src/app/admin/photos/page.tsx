import { supabase } from "@/lib/supabase";
import AdminPhotosClient from "./AdminPhotosClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPhotosPage() {
  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white sm:text-5xl">
          Manage Photos
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Review uploaded photos and delete anything that should not be on the
          public photo wall.
        </p>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        ) : (
          <div className="mt-8">
            <AdminPhotosClient photos={photos || []} />
          </div>
        )}
      </div>
    </main>
  );
}