"use client";

import { useEffect, useState } from "react";

export default function AdminPhotosClient({ photos }: { photos: any[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [photoList, setPhotoList] = useState(photos);
  const [message, setMessage] = useState("");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function deletePhoto(photo: any) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const label = photo.title || photo.uploader_name || "this photo";

    const confirmed = window.confirm(
      `Delete ${label}? This will remove it from the website.`
    );

    if (!confirmed) return;

    setDeletingPhotoId(photo.id);

    const res = await fetch("/api/admin/delete-photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        photoId: photo.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not delete photo. Status: ${res.status}`);
      setDeletingPhotoId(null);
      return;
    }

    setPhotoList((current) =>
      current.filter((existingPhoto) => existingPhoto.id !== photo.id)
    );

    setMessage(data.message || "Photo deleted.");
    setDeletingPhotoId(null);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              Uploaded Photos
            </h2>

            <p className="mt-2 text-red-100/60">
              {photoList.length} photo{photoList.length === 1 ? "" : "s"} found.
            </p>
          </div>

          <a
            href="/photos"
            className="w-fit rounded-full border border-[#F3EEE6]/25 bg-white/[0.06] px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            View Public Photos
          </a>
        </div>

        {adminToken ? (
          <p className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-green-300">
            Admin mode active.
          </p>
        ) : (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      {photoList.length === 0 ? (
        <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 text-red-100/60 shadow-2xl shadow-black/30">
          No photos found.
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {photoList.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 shadow-2xl shadow-black/30"
            >
              <div className="relative">
                <img
                  src={photo.image_url}
                  alt={photo.title || "Rhino League photo"}
                  className="h-64 w-full object-cover"
                />

                <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-black text-white">
                  ♥ {photo.likes || 0}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-black text-white">
                  {photo.title || "Untitled photo"}
                </h3>

                <div className="mt-2 grid gap-1 text-sm text-red-100/60">
                  {photo.uploader_name && (
                    <p>
                      Posted by{" "}
                      <span className="font-bold text-red-100">
                        {photo.uploader_name}
                      </span>
                    </p>
                  )}

                  {photo.created_at && (
                    <p>{new Date(photo.created_at).toLocaleString()}</p>
                  )}

                  {typeof photo.approved === "boolean" && (
                    <p>
                      Status:{" "}
                      <span
                        className={
                          photo.approved ? "text-green-300" : "text-red-300"
                        }
                      >
                        {photo.approved ? "Approved" : "Not approved"}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <a
                    href={photo.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#F3EEE6]/20 bg-white/[0.06] px-4 py-3 text-center font-black text-white transition hover:bg-white/10"
                  >
                    Open Image
                  </a>

                  <button
                    onClick={() => deletePhoto(photo)}
                    disabled={deletingPhotoId === photo.id}
                    className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingPhotoId === photo.id
                      ? "Deleting..."
                      : "Delete Photo"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}