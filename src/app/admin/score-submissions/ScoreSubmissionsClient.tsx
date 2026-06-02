"use client";

import { useEffect, useState } from "react";

export default function ScoreSubmissionsClient({
  submissions,
}: {
  submissions: any[];
}) {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function approve(submissionId: string) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const res = await fetch("/api/admin/approve-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminToken, submissionId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not approve score. Status: ${res.status}`);
      return;
    }

    setMessage("Score approved. Refreshing...");
    window.location.reload();
  }

  async function reject(submissionId: string, gameId: string) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const res = await fetch("/api/admin/reject-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminToken, submissionId, gameId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not reject score. Status: ${res.status}`);
      return;
    }

    setMessage("Score rejected. Refreshing...");
    window.location.reload();
  }

  return (
    <div className="grid gap-5">
      {!adminToken && (
        <p className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-orange-300">
          You are not logged in as admin. Go to /admin/login first.
        </p>
      )}

      {message && (
        <p className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-orange-300">
          {message}
        </p>
      )}

      {submissions.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 text-neutral-400">
          No pending score submissions.
        </p>
      )}

      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30"
        >
          <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">
            Pending score
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {submission.game?.home_team?.name || "Home"} vs{" "}
            {submission.game?.away_team?.name || "Away"}
          </h2>

          <p className="mt-3 text-4xl font-black text-orange-300">
            {submission.home_score} - {submission.away_score}
          </p>

          <p className="mt-3 text-sm text-neutral-400">
            Submitted by: {submission.submitted_by || "Anonymous"}
          </p>

          {submission.notes && (
            <p className="mt-2 text-sm text-neutral-400">
              Notes: {submission.notes}
            </p>
          )}

          <p className="mt-2 text-xs text-neutral-500">
            Submitted: {new Date(submission.created_at).toLocaleString()}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => approve(submission.id)}
              className="rounded-xl bg-green-600 px-5 py-3 font-black text-white hover:bg-green-700"
            >
              Approve
            </button>

            <button
              onClick={() => reject(submission.id, submission.game_id)}
              className="rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}