"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  target_type: string;
  target_id: string;
  author_name: string | null;
  body: string;
  score: number;
  created_at: string;
};

export default function CommentsSection({
  targetType,
  targetId,
  title = "Comments",
  defaultOpen = false,
}: {
  targetType: "photo" | "game";
  targetId: string;
  title?: string;
  defaultOpen?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  function toggleOpen() {
    setIsOpen((current) => !current);
  }

  async function loadComments() {
    setIsLoading(true);
    setMessage("");

    const params = new URLSearchParams({
      targetType,
      targetId,
    });

    const res = await fetch(`/api/comments?${params.toString()}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not load comments.");
      setIsLoading(false);
      setHasLoadedOnce(true);
      return;
    }

    setComments(data.comments || []);
    setIsLoading(false);
    setHasLoadedOnce(true);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!commentBody.trim()) {
      setMessage("Write a comment first.");
      return;
    }

    setIsPosting(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetType,
        targetId,
        authorName,
        commentBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not post comment. Status: ${res.status}`);
      setIsPosting(false);
      return;
    }

    setComments((current) => [data.comment, ...current]);
    setCommentBody("");
    setMessage("Comment posted.");
    setIsPosting(false);
    setHasLoadedOnce(true);
  }

  async function voteComment(commentId: string, voteValue: 1 | -1) {
    setMessage("");
    setVotingCommentId(commentId);

    const res = await fetch("/api/comments/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commentId,
        voteValue,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not vote. Status: ${res.status}`);
      setVotingCommentId(null);
      return;
    }

    setComments((current) =>
      current
        .map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                score: Number(data.score || 0),
              }
            : comment
        )
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        })
    );

    setVotingCommentId(null);
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#A51C30]/25 bg-black/20">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-white/[0.04]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-white">
            💬 {title}{" "}
            <span className="text-[#F3EEE6]">
              ({hasLoadedOnce ? comments.length : "..."})
            </span>
          </p>

          <p className="mt-1 truncate text-sm text-red-100/50">
            {isLoading
              ? "Loading comments..."
              : comments.length === 0
                ? "Open to write the first comment"
                : "Open to read or write comments"}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#A51C30]/30 bg-[#A51C30]/15 px-3 py-1 text-sm font-black text-red-100">
          <span>{isOpen ? "Hide" : "Show"}</span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#A51C30]/20 p-4">
          <form onSubmit={postComment} className="grid gap-3">
            <input
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
              placeholder="Name, nickname, team name... optional"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />

            <textarea
              className="min-h-24 rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
              placeholder="Say something nice, funny, or mildly spicy..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />

            <button
              disabled={isPosting}
              className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
            >
              {isPosting ? "Posting..." : "Post Comment"}
            </button>
          </form>

          {message && (
            <p className="mt-3 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-3 text-sm text-red-100">
              {message}
            </p>
          )}

          <div className="mt-5 grid gap-3">
            {isLoading && (
              <p className="text-sm text-red-100/50">
                Loading comments...
              </p>
            )}

            {!isLoading && hasLoadedOnce && comments.length === 0 && (
              <p className="text-sm text-red-100/50">
                No comments yet. Be the first rhino.
              </p>
            )}

            {comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-[#A51C30]/20 bg-black/25 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {comment.author_name || "Anonymous Rhino"}
                    </p>

                    <p className="text-xs text-red-100/40">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => voteComment(comment.id, 1)}
                      disabled={votingCommentId === comment.id}
                      className="rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1 text-sm font-black text-green-300 transition hover:bg-green-500/20 disabled:opacity-50"
                    >
                      ▲
                    </button>

                    <span className="min-w-8 text-center font-black text-[#F3EEE6]">
                      {comment.score}
                    </span>

                    <button
                      type="button"
                      onClick={() => voteComment(comment.id, -1)}
                      disabled={votingCommentId === comment.id}
                      className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-red-100/75">
                  {comment.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}