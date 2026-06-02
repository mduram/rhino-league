"use client";

import { useMemo, useState } from "react";

type League = "competitive" | "recreational";

export default function SchedulerClient({
  teams,
  games,
}: {
  teams: any[];
  games: any[];
}) {
  const [password, setPassword] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<League>("competitive");
  const [rounds, setRounds] = useState("1");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const filteredTeams = teams.filter((team) => team.league === selectedLeague);
  const filteredGames = games.filter((game) => game.league === selectedLeague);

  const unscheduledGames = filteredGames.filter(
    (game) => game.status === "unscheduled"
  );

  const scheduledGames = filteredGames.filter(
    (game) => game.status === "scheduled"
  );

  const teamBalance = useMemo(() => {
    return filteredTeams.map((team) => {
      const scheduledCount = scheduledGames.filter(
        (game) => game.home_team_id === team.id || game.away_team_id === team.id
      ).length;

      const unscheduledCount = unscheduledGames.filter(
        (game) => game.home_team_id === team.id || game.away_team_id === team.id
      ).length;

      return {
        id: team.id,
        name: team.name,
        scheduledCount,
        unscheduledCount,
        totalInPool: scheduledCount + unscheduledCount,
      };
    });
  }, [filteredTeams, scheduledGames, unscheduledGames]);

  async function generateGamePool(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/generate-game-pool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        league: selectedLeague,
        rounds: Number(rounds),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not generate game pool.");
      return;
    }

    setMessage(`Created ${data.created} unscheduled games. Refreshing...`);
    window.location.reload();
  }

  async function scheduleGame(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/schedule-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        gameId: selectedGameId,
        scheduledAt,
        location,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not schedule game.");
      return;
    }

    setMessage("Game scheduled. Refreshing...");
    window.location.reload();
  }

  async function unscheduleGame(gameId: string) {
    setMessage("");

    const res = await fetch("/api/admin/unschedule-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        gameId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not unschedule game.");
      return;
    }

    setMessage("Game moved back to pool. Refreshing...");
    window.location.reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">Controls</h2>

          <div className="grid gap-4">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value as League)}
            >
              <option value="competitive">Competitive</option>
              <option value="recreational">Recreational</option>
            </select>

            {message && (
              <p className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-300">
                {message}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Generate Game Pool
          </h2>

          <form onSubmit={generateGamePool} className="grid gap-4">
            <p className="text-sm text-neutral-400">
              This creates unscheduled games between teams in the selected
              league. For recreational, be careful because many teams create a
              very large pool.
            </p>

            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              type="number"
              min="1"
              max="10"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
            />

            <button className="rounded-xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-600">
              Generate Pool
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">Balance</h2>

          <div className="grid gap-2">
            {teamBalance.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <p className="font-black text-white">{team.name}</p>
                <p className="text-sm text-neutral-400">
                  Scheduled: {team.scheduledCount} · In pool:{" "}
                  {team.unscheduledCount}
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="space-y-8">
        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Schedule a Game
          </h2>

          <form onSubmit={scheduleGame} className="grid gap-4 md:grid-cols-2">
            <select
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white md:col-span-2"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              <option value="">Select from unscheduled game pool</option>

              {unscheduledGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.home_team?.name} vs {game.away_team?.name}
                  {game.round_label ? ` — ${game.round_label}` : ""}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />

            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              placeholder="Location, e.g. Court 1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <button className="rounded-xl bg-orange-500 px-4 py-3 font-black text-white hover:bg-orange-600 md:col-span-2">
              Place Game on Calendar
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Scheduled {selectedLeague} Games
          </h2>

          <div className="grid gap-4">
            {scheduledGames.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-black text-white">
                      {game.home_team?.name} vs {game.away_team?.name}
                    </p>

                    <p className="text-sm text-neutral-400">
                      {game.scheduled_at
                        ? new Date(game.scheduled_at).toLocaleString()
                        : "No date"}{" "}
                      {game.location ? `· ${game.location}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => unscheduleGame(game.id)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-neutral-300 hover:bg-white/10"
                  >
                    Move back to pool
                  </button>
                </div>
              </div>
            ))}

            {scheduledGames.length === 0 && (
              <p className="text-neutral-400">
                No scheduled games for this league yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Unscheduled Game Pool
          </h2>

          <div className="grid gap-3">
            {unscheduledGames.slice(0, 80).map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <p className="font-black text-white">
                  {game.home_team?.name} vs {game.away_team?.name}
                </p>

                <p className="text-sm text-neutral-500">
                  {game.round_label || "Unscheduled"} · {game.league}
                </p>
              </div>
            ))}

            {unscheduledGames.length > 80 && (
              <p className="text-sm text-neutral-400">
                Showing first 80 of {unscheduledGames.length} unscheduled games.
              </p>
            )}

            {unscheduledGames.length === 0 && (
              <p className="text-neutral-400">
                No unscheduled games in this pool.
              </p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}