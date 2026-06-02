"use client";

import { useState } from "react";

export default function SubmitScoresClient({ games }: { games: any[] }) {
  const [gameId, setGameId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        homeScore,
        awayScore,
        submittedBy,
        notes,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not submit score.");
      return;
    }

    setMessage("Score submitted. It will appear after admin approval.");
    setGameId("");
    setHomeScore("");
    setAwayScore("");
    setSubmittedBy("");
    setNotes("");
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
      {games.length === 0 ? (
        <p className="text-neutral-400">
          No games are currently open for score submission.
        </p>
      ) : (
        <form onSubmit={submitScore} className="grid gap-4">
          <select
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            <option value="">Select game</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.home_team?.name} vs {game.away_team?.name}
                {game.scheduled_at
                  ? ` — ${new Date(game.scheduled_at).toLocaleDateString()}`
                  : ""}
              </option>
            ))}
          </select>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
              placeholder="Home score"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
            />

            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
              placeholder="Away score"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
            />
          </div>

          <input
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
            placeholder="Submitted by, optional"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
          />

          <textarea
            className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-neutral-500"
            placeholder="Notes, optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600">
            Submit Score
          </button>

          {message && <p className="text-orange-300">{message}</p>}
        </form>
      )}
    </div>
  );
}