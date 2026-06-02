"use client";

import { useEffect, useState } from "react";

export default function PhotoLikeButton({
  photoId,
  initialLikes,
}: {
  photoId: string;
  initialLikes: number;
}) {
  const [likes, setLikes] = useState(initialLikes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setHasLiked(localStorage.getItem(`rhino_photo_like_${photoId}`) === "yes");
  }, [photoId]);

  async function likePhoto() {
    if (hasLiked || isLiking) return;

    setIsLiking(true);

    const res = await fetch("/api/photos/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoId }),
    });

    const data = await res.json();

    if (res.ok) {
      setLikes(data.likes);
      setHasLiked(true);
      localStorage.setItem(`rhino_photo_like_${photoId}`, "yes");
    }

    setIsLiking(false);
  }

  return (
    <button
      onClick={likePhoto}
      disabled={hasLiked || isLiking}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        hasLiked
          ? "bg-[#A51C30]/40 text-red-100"
          : "bg-white/10 text-white hover:bg-[#A51C30]/40 hover:text-red-100"
      } disabled:cursor-not-allowed`}
    >
      {hasLiked ? "♥" : "♡"} {likes}
    </button>
  );
}