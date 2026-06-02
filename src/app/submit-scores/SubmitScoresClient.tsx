"use client";

import { useMemo, useState } from "react";

export default function SubmitScoresClient({ games }: { games: any[] }) {
  const [gameId, setGameId] = useState("");
  const [submittingTeamId, setSubmittingTeamId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const selectedGame = useMemo(() => {
    return games.find((game) => game.id === gameId);
  }, [games, gameId]);

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
        submittingTeamId,
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

    setMessage(data.message || "Score submitted.");
    setGameId("");
    setSubmittingTeamId("");
    setHomeScore("");
    setAwayScore("");
    setSubmittedBy("");
    setNotes("");
  }

  return (
    <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
      {games.length === 0 ? (
        <p className="text-red-100/60">
          No games are currently open for score submission.
        </p>
      ) : (
        <form onSubmit={submitScore} className="grid gap-4">
          <select
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setSubmittingTeamId("");
            }}
          >
            <option value="">Select game</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.home_team?.name} vs {game.away_team?.name}
                {game.scheduled_at
                  ? ` — ${new Date(game.scheduled_at).toLocaleDateString()}`
                  : ""}
                {game.submitted_score_pending ? " — pending confirmation" : ""}
              </option>
            ))}
          </select>

          {selectedGame && (
            <select
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
              value={submittingTeamId}
              onChange={(e) => setSubmittingTeamId(e.target.value)}
            >
              <option value="">Which team are you submitting for?</option>
              <option value={selectedGame.home_team_id}>
                {selectedGame.home_team?.name}
              </option>
              <option value={selectedGame.away_team_id}>
                {selectedGame.away_team?.name}
              </option>
            </select>
          )}

          {selectedGame && (
            <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-4">
              <p className="mb-3 text-sm font-bold text-red-100/75">
                Enter the final score:
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm text-red-100/60">
                    {selectedGame.home_team?.name}
                  </span>
                  <input
                    className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
                    placeholder="Home score"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-red-100/60">
                    {selectedGame.away_team?.name}
                  </span>
                  <input
                    className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
                    placeholder="Away score"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          <input
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
            placeholder="Submitted by, optional"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
          />

          <textarea
            className="min-h-28 rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
            placeholder="Notes, optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white hover:bg-[#7F1524]">
            Submit Score
          </button>

          {message && (
            <p className="rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}