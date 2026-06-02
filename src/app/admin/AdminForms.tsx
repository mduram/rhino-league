"use client";

import { useEffect, useState } from "react";

export default function AdminForms({
  teams,
  games,
}: {
  teams: any[];
  games: any[];
}) {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");

  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState("");
  const [color, setColor] = useState("");
  const [teamLeague, setTeamLeague] = useState("recreational");
  const [teamLogo, setTeamLogo] = useState<File | null>(null);

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");

  const [scoreGameId, setScoreGameId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("name", teamName);
    formData.append("captain", captain);
    formData.append("color", color);
    formData.append("league", teamLeague);

    if (teamLogo) {
      formData.append("logo", teamLogo);
    }

    const res = await fetch("/api/admin/add-team", {
      method: "POST",
      body: formData,
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
    setTeamLeague("recreational");
    setTeamLogo(null);

    const fileInput = document.getElementById(
      "team-logo-input"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function addGame(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const res = await fetch("/api/admin/add-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
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

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const res = await fetch("/api/admin/update-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
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
      <section className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-2 text-2xl font-black text-white">Admin Mode</h2>

        {adminToken ? (
          <p className="text-green-300">Admin mode active in this browser.</p>
        ) : (
          <p className="text-orange-300">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        {message && <p className="mt-4 text-orange-400">{message}</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">Add Team</h2>

        <form onSubmit={addTeam} className="grid gap-3">
          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Captain"
            value={captain}
            onChange={(e) => setCaptain(e.target.value)}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <select
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={teamLeague}
            onChange={(e) => setTeamLeague(e.target.value)}
          >
            <option value="competitive">Competitive</option>
            <option value="recreational">Recreational</option>
          </select>

          <label className="grid gap-2 text-sm font-bold text-neutral-300">
            Team logo, optional
            <input
              id="team-logo-input"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              type="file"
              accept="image/*"
              onChange={(e) => setTeamLogo(e.target.files?.[0] || null)}
            />
          </label>

          <p className="text-xs text-neutral-500">
            If no logo is uploaded, the default rhino logo will be used.
          </p>

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600">
            Add Team
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Add Game Manually
        </h2>

        <p className="mb-4 text-sm text-neutral-400">
          This is still useful for one-off games. For the main schedule, use the
          scheduler.
        </p>

        <form onSubmit={addGame} className="grid gap-3">
          <select
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
          >
            <option value="">Home team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.league})
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
          >
            <option value="">Away team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.league})
              </option>
            ))}
          </select>

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Location, e.g. Court 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600">
            Add Game
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Enter Score Directly
        </h2>

        <p className="mb-4 text-sm text-neutral-400">
          Use this if you want to bypass public score submission and enter a
          final score directly as admin.
        </p>

        <form onSubmit={updateScore} className="grid gap-3">
          <select
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={scoreGameId}
            onChange={(e) => setScoreGameId(e.target.value)}
          >
            <option value="">Select game</option>

            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.home_team?.name} vs {game.away_team?.name} —{" "}
                {game.scheduled_at
                  ? new Date(game.scheduled_at).toLocaleDateString()
                  : "unscheduled"}
              </option>
            ))}
          </select>

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Home score"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-neutral-500"
            placeholder="Away score"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
          />

          <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600">
            Save Score
          </button>
        </form>
      </section>
    </div>
  );
}