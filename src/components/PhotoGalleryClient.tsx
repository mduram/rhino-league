"use client";

import { useState } from "react";
import CommentsSection from "@/components/CommentsSection";

type Photo = {
  id: string;
  image_url: string;
  title?: string | null;
  uploader_name?: string | null;
  likes?: number | null;
  created_at?: string | null;
};

export default function PhotoGalleryClient({ photos }: { photos: Photo[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoList, setPhotoList] = useState<Photo[]>(photos);
  const [likingPhotoId, setLikingPhotoId] = useState<string | null>(null);

  async function likePhoto(photoId: string) {
    setLikingPhotoId(photoId);

    const res = await fetch("/api/photos/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoId }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || `Could not like photo. Status: ${res.status}`);
      setLikingPhotoId(null);
      return;
    }

    setPhotoList((current) =>
      current.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              likes: Number(data.likes || 0),
            }
          : photo
      )
    );

    setSelectedPhoto((current) =>
      current?.id === photoId
        ? {
            ...current,
            likes: Number(data.likes || 0),
          }
        : current
    );

    setLikingPhotoId(null);
  }

  return (
    <>
      {photoList.length === 0 ? (
        <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 text-red-100/60 shadow-2xl shadow-black/30">
          No photos yet.
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {photoList.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 shadow-2xl shadow-black/30"
            >
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="block w-full text-left"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || "Rhino League photo"}
                    className="h-72 w-full object-cover transition group-hover:scale-[1.03]"
                  />

                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />

                  <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-sm font-black text-white">
                    Expand
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    likePhoto(photo.id);
                  }}
                  disabled={likingPhotoId === photo.id}
                  className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-1 text-sm font-black text-white transition hover:bg-[#A51C30] disabled:opacity-50"
                >
                  ♥ {photo.likes || 0}
                </button>
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
                </div>

                <CommentsSection
                  targetType="photo"
                  targetId={photo.id}
                  title="Photo comments"
                />
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
                  Photo view
                </p>

                <h2 className="text-2xl font-black text-white">
                  {selectedPhoto.title || "Untitled photo"}
                </h2>

                <button
                  type="button"
                  onClick={() => likePhoto(selectedPhoto.id)}
                  disabled={likingPhotoId === selectedPhoto.id}
                  className="mt-3 rounded-full bg-[#A51C30] px-4 py-2 text-sm font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
                >
                  ♥ Like ({selectedPhoto.likes || 0})
                </button>
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded-full bg-white px-5 py-3 font-black text-black transition hover:bg-red-100"
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#F3EEE6]/20 bg-black shadow-2xl shadow-black">
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.title || "Rhino League photo"}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>

            <div className="mt-5 rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/95 p-5">
              <div className="mb-4">
                <h3 className="text-xl font-black text-white">
                  {selectedPhoto.title || "Untitled photo"}
                </h3>

                {selectedPhoto.uploader_name && (
                  <p className="mt-1 text-sm text-red-100/60">
                    Posted by {selectedPhoto.uploader_name}
                  </p>
                )}
              </div>

              <CommentsSection
                targetType="photo"
                targetId={selectedPhoto.id}
                title="Photo comments"
                defaultOpen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}