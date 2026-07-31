"use client";

import { useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import LeagueBadge from "@/components/LeagueBadge";
import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

export default function SubmitScoresClient({ games }: { games: any[] }) {
  const [selectedGameId, setSelectedGameId] = useState("");
  const [submittingTeamId, setSubmittingTeamId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [forfeitTeamId, setForfeitTeamId] = useState("");
  const [forfeitNote, setForfeitNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGame = games.find((game) => game.id === selectedGameId);
  const selectedHomeTeam = normalizeTeam(selectedGame?.home_team);
  const selectedAwayTeam = normalizeTeam(selectedGame?.away_team);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!selectedGameId) {
      setMessage("Please select a game.");
      return;
    }

    if (!submittingTeamId) {
      setMessage("Please select which team you are submitting for.");
      return;
    }

    if (homeScore === "" || awayScore === "") {
      setMessage("Please enter both scores.");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameType: selectedGame.game_type || "regular",
        gameId: selectedGameId,
        submittingTeamId,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        submitterName,
        submitterEmail,
        isForfeit: Boolean(forfeitTeamId),
        forfeitTeamId: forfeitTeamId || null,
        forfeitNote,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not submit score. Status: ${res.status}`);
      setIsSubmitting(false);
      return;
    }

    setMessage(data.message || "Score submitted.");

    setSelectedGameId("");
    setSubmittingTeamId("");
    setHomeScore("");
    setAwayScore("");
    setSubmitterName("");
    setSubmitterEmail("");
    setForfeitTeamId("");
    setForfeitNote("");

    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black text-white">
          Submit a score
        </h2>

        <p className="mt-2 text-red-100/70">
          Pick the game, choose which team you are submitting for, enter the
          final score, and mark a forfeit if needed.
        </p>

        <form onSubmit={submitScore} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Game
            </span>

            <select
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
              value={selectedGameId}
              onChange={(e) => {
                setSelectedGameId(e.target.value);
                setSubmittingTeamId("");
                setForfeitTeamId("");
              }}
            >
              <option value="">Select a game...</option>

              {games.map((game) => {
                const homeTeam = normalizeTeam(game.home_team);
                const awayTeam = normalizeTeam(game.away_team);

                return (
                  <option key={game.id} value={game.id}>
                    {game.game_type === "playoff"
                      ? `Playoff G${game.game_number} · `
                      : ""}
                    {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"} —{" "}
                    {formatLeagueDateTime(game.scheduled_at)}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedGame && (
            <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {selectedGame.game_type === "playoff" ? (
                  <span className="rounded-full border border-[#1F8A70]/40 bg-[#1F8A70]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#BFF4E7]">
                    Playoff · G{selectedGame.game_number}
                  </span>
                ) : (
                  <LeagueBadge league={selectedGame.league} />
                )}

                {selectedGame.submitted_score_pending && (
                  <span className="rounded-full border border-[#C4963E]/30 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#F3EEE6]">
                    Pending submission exists
                  </span>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo
                    logoUrl={selectedHomeTeam?.logo_url || null}
                    teamName={selectedHomeTeam?.name || "Home"}
                    league={selectedGame.league}
                    size="sm"
                  />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                      Home
                    </p>
                    <p className="text-xl font-black text-white">
                      {selectedHomeTeam?.name || "Home"}
                    </p>
                  </div>
                </div>

                <p className="text-center text-xl font-black text-[#F3EEE6]">
                  VS
                </p>

                <div className="flex items-center gap-3 md:justify-end">
                  <div className="md:text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                      Away
                    </p>
                    <p className="text-xl font-black text-white">
                      {selectedAwayTeam?.name || "Away"}
                    </p>
                  </div>

                  <TeamLogo
                    logoUrl={selectedAwayTeam?.logo_url || null}
                    teamName={selectedAwayTeam?.name || "Away"}
                    league={selectedGame.league}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedGame && (
            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Which team are you submitting for?
              </span>

              <select
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                value={submittingTeamId}
                onChange={(e) => setSubmittingTeamId(e.target.value)}
              >
                <option value="">Select your team...</option>
                <option value={selectedGame.home_team_id}>
                  {selectedHomeTeam?.name || "Home"}
                </option>
                <option value={selectedGame.away_team_id}>
                  {selectedAwayTeam?.name || "Away"}
                </option>
              </select>
            </label>
          )}

          {selectedGame && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  {selectedHomeTeam?.name || "Home"} score
                </span>

                <input
                  className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  {selectedAwayTeam?.name || "Away"} score
                </span>

                <input
                  className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                />
              </label>
            </div>
          )}

          {selectedGame && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
              <h3 className="text-xl font-black text-white">
                Forfeit option
              </h3>

              <p className="mt-2 text-sm leading-6 text-red-100/70">
                {selectedGame.game_type === "playoff"
                  ? "Only use this if one team officially forfeited. The bracket will advance the opponent as the winner."
                  : "Only use this if one team officially forfeited. The forfeiting team will receive an extra -3 seeding-point penalty once the score is accepted."}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-red-100/70">
                    Did someone forfeit?
                  </span>

                  <select
                    className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white"
                    value={forfeitTeamId}
                    onChange={(e) => setForfeitTeamId(e.target.value)}
                  >
                    <option value="">No forfeit</option>
                    <option value={selectedGame.home_team_id}>
                      {selectedHomeTeam?.name || "Home"} forfeited
                    </option>
                    <option value={selectedGame.away_team_id}>
                      {selectedAwayTeam?.name || "Away"} forfeited
                    </option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-red-100/70">
                    Forfeit note
                  </span>

                  <input
                    className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                    placeholder="Optional, e.g. not enough players"
                    value={forfeitNote}
                    onChange={(e) => setForfeitNote(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Your name
              </span>

              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Optional"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Your email
              </span>

              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Optional"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
              />
            </label>
          </div>

          <button
            disabled={isSubmitting}
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Score"}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      {games.length === 0 && (
        <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
          No scheduled games are currently available for score submission.
        </p>
      )}
    </div>
  );
}
