"use client";

import { useState } from "react";

export default function PhotoUploadForm() {
  const [title, setTitle] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!file) {
      setMessage("Choose a photo first.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("uploaderName", uploaderName);

    const res = await fetch("/api/photos/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Upload failed. Status: ${res.status}`);
      setIsUploading(false);
      return;
    }

    setTitle("");
    setUploaderName("");
    setFile(null);
    setMessage("Photo uploaded! Refreshing...");

    window.location.reload();
  }

  return (
    <section className="mb-8 rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-6 shadow-2xl shadow-black/30">
      <div className="mb-5">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
          Upload
        </p>

        <h2 className="text-3xl font-black text-white">
          Add a photo
        </h2>

        <p className="mt-2 text-red-100/70">
          Share league photos, match moments, team pics, or chaotic rhino energy.
        </p>
      </div>

      <form onSubmit={uploadPhoto} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Photo title
            </span>

            <input
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
              placeholder="Optional"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Your name / team
            </span>

            <input
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
              placeholder="Optional"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-red-100/70">
            Photo
          </span>

          <input
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-[#A51C30] file:px-4 file:py-2 file:font-black file:text-white"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <span className="text-xs text-red-100/45">
            Max 10 MB. JPG, PNG, HEIC, WEBP should work depending on browser support.
          </span>
        </label>

        <button
          disabled={isUploading}
          className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      {message && (
        <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
          {message}
        </p>
      )}
    </section>
  );
}