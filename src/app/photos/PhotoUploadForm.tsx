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
      setMessage(data.error || "Could not upload photo.");
      setIsUploading(false);
      return;
    }

    setMessage("Photo uploaded. Refreshing...");
    setTitle("");
    setUploaderName("");
    setFile(null);

    window.location.reload();
  }

  return (
    <form
      onSubmit={uploadPhoto}
      className="mb-8 rounded-3xl border border-white/10 bg-neutral-900/80 p-5 text-white shadow-2xl shadow-black/30"
    >
      <h2 className="mb-4 text-2xl font-black">Post a photo</h2>

      <div className="grid gap-4">
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
          placeholder="Photo title, e.g. Opening night chaos"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
          placeholder="Your name, optional"
          value={uploaderName}
          onChange={(e) => setUploaderName(e.target.value)}
        />

        <input
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          disabled={isUploading}
          className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Photo"}
        </button>

        {message && <p className="text-sm text-orange-300">{message}</p>}
      </div>
    </form>
  );
}