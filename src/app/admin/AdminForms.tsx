"use client";

import { useState } from "react";

export default function AdminForms({
  teams,
  games,
}: {
  teams: any[];
  games: any[];
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState("");
  const [color, setColor] = useState("");

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");

  const [scoreGameId, setScoreGameId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/add-team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        name: teamName,
        captain,
        color,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not add team");
      return;
    }

    setMessage("Team added. Refresh the page to see it.");
    setTeamName("");
    setCaptain("");
    setColor("");
  }

  async function addGame(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/add-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        homeTeamId,
        awayTeamId,
        scheduledAt,
        location,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not add game");
      return;
    }

    setMessage("Game added. Refresh the page to see it.");
    setHomeTeamId("");
    setAwayTeamId("");
    setScheduledAt("");
    setLocation("");
  }

  async function updateScore(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/update-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        gameId: scoreGameId,
        homeScore,
        awayScore,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not update score");
      return;
    }

    setMessage("Score updated. Refresh the page to see it.");
    setScoreGameId("");
    setHomeScore("");
    setAwayScore("");
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-2xl font-black">Admin Password</h2>

        <input
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-white"
          placeholder="Admin password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {message && <p className="mt-4 text-orange-400">{message}</p>}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-2xl font-black">Add Team</h2>

        <form onSubmit={addTeam} className="grid gap-3">
          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Captain"
            value={captain}
            onChange={(e) => setCaptain(e.target.value)}
          />

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold">
            Add Team
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-2xl font-black">Add Game</h2>

        <form onSubmit={addGame} className="grid gap-3">
          <select
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
          >
            <option value="">Home team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
          >
            <option value="">Away team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Location, e.g. Court 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold">
            Add Game
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-2xl font-black">Enter Score</h2>

        <form onSubmit={updateScore} className="grid gap-3">
          <select
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            value={scoreGameId}
            onChange={(e) => setScoreGameId(e.target.value)}
          >
            <option value="">Select game</option>

            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.home_team?.name} vs {game.away_team?.name} —{" "}
                {new Date(game.scheduled_at).toLocaleDateString()}
              </option>
            ))}
          </select>

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Home score"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
          />

          <input
            className="rounded-lg bg-neutral-800 px-3 py-2 text-white"
            placeholder="Away score"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
          />

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold">
            Save Score
          </button>
        </form>
      </section>
    </div>
  );
}