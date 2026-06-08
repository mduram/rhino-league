"use client";

import { useEffect, useMemo, useState } from "react";
import LeagueBadge from "@/components/LeagueBadge";

type League = "competitive" | "recreational";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dateToInputDate(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

function dateToInputTime(date: Date) {
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${hours}:${minutes}`;
}

function addDays(dateString: string, daysToAdd: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return dateToInputDate(date);
}

function buildIsoDateTime(dateString: string, timeString: string) {
  const localDate = new Date(`${dateString}T${timeString}:00`);
  return localDate.toISOString();
}

function slotKeyFromDate(dateString: string, timeString: string) {
  return `${dateString}_${timeString}`;
}

function slotKeyFromScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt);
  return `${dateToInputDate(date)}_${dateToInputTime(date)}`;
}

function readAdminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("rhino_admin_token") || "";
}

export default function SchedulerClient({
  teams,
  games,
}: {
  teams: any[];
  games: any[];
}) {
  const [adminToken, setAdminToken] = useState("");
  const [gameList, setGameList] = useState<any[]>(games || []);
  const [selectedLeague, setSelectedLeague] = useState<League>("competitive");
  const [gamesPerTeam, setGamesPerTeam] = useState("4");
  const [poolGroup, setPoolGroup] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(dateToInputDate(new Date()));
  const [numberOfDays, setNumberOfDays] = useState("7");
  const [timeSlots, setTimeSlots] = useState("18:00,19:00,20:00");
  const [location, setLocation] = useState("Court 1");
  const [fallbackGameId, setFallbackGameId] = useState("");
  const [fallbackSlotId, setFallbackSlotId] = useState("");
  const [busyGameId, setBusyGameId] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(readAdminToken());
  }, []);

  const filteredTeams = teams.filter((team) => team.league === selectedLeague);
  const filteredGames = gameList.filter((game) => game.league === selectedLeague);

  const unscheduledGames = filteredGames.filter(
    (game) => game.status === "unscheduled"
  );

  const scheduledGames = filteredGames
    .filter((game) => game.status === "scheduled")
    .sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return aTime - bTime;
    });

  const parsedTimeSlots = timeSlots
    .split(",")
    .map((slot) => slot.trim())
    .filter(Boolean);

  const calendarSlots = useMemo(() => {
    const days = Number(numberOfDays || 1);
    const slots = [];

    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      const date = addDays(startDate, dayIndex);

      for (const time of parsedTimeSlots) {
        slots.push({
          id: slotKeyFromDate(date, time),
          date,
          time,
          scheduledAt: buildIsoDateTime(date, time),
        });
      }
    }

    return slots;
  }, [startDate, numberOfDays, timeSlots]);

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

  function gamesInSlot(slot: { id: string }) {
    return scheduledGames.filter((game) => {
      if (!game.scheduled_at) return false;
      return slotKeyFromScheduledAt(game.scheduled_at) === slot.id;
    });
  }

  async function generateGamePool(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const res = await fetch("/api/admin/generate-game-pool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        league: selectedLeague,
        gamesPerTeam: Number(gamesPerTeam),
        poolGroup,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not generate game pool. Status: ${res.status}`);
      return;
    }

    setMessage(`Created ${data.created} unscheduled games. Refreshing...`);
    window.location.reload();
  }

  async function scheduleGame(gameId: string, scheduledAt: string) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    if (!gameId) {
      setMessage("No game selected.");
      return;
    }

    if (!scheduledAt) {
      setMessage("No time slot selected.");
      return;
    }

    setBusyGameId(gameId);

    const res = await fetch("/api/admin/schedule-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        gameId,
        scheduledAt,
        location,
        court: location,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not schedule game. Status: ${res.status}`);
      setBusyGameId(null);
      return;
    }

    setGameList((current) =>
      current.map((game) =>
        game.id === gameId
          ? {
              ...game,
              scheduled_at: scheduledAt,
              location,
              court: location,
              status: "scheduled",
            }
          : game
      )
    );

    setFallbackGameId("");
    setFallbackSlotId("");
    setMessage("Game scheduled.");
    setBusyGameId(null);
  }

  async function unscheduleGame(gameId: string) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmUnschedule = window.confirm(
      "Move this game back to the unscheduled pool?"
    );

    if (!confirmUnschedule) return;

    setBusyGameId(gameId);

    const res = await fetch("/api/admin/unschedule-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        gameId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not unschedule game. Status: ${res.status}`);
      setBusyGameId(null);
      return;
    }

    setGameList((current) =>
      current.map((game) =>
        game.id === gameId
          ? {
              ...game,
              scheduled_at: null,
              location: null,
              court: null,
              status: "unscheduled",
            }
          : game
      )
    );

    setMessage("Game moved back to pool.");
    setBusyGameId(null);
  }

  function onDragStart(e: React.DragEvent, gameId: string) {
    e.dataTransfer.setData("text/plain", gameId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function onDrop(e: React.DragEvent, scheduledAt: string) {
    e.preventDefault();

    const gameId = e.dataTransfer.getData("text/plain");

    if (!gameId) {
      setMessage("Drop failed: no game ID was transferred.");
      return;
    }

    await scheduleGame(gameId, scheduledAt);
  }

  async function scheduleFallback(e: React.FormEvent) {
    e.preventDefault();

    const slot = calendarSlots.find(
      (calendarSlot) => calendarSlot.id === fallbackSlotId
    );

    if (!slot) {
      setMessage("Choose a slot first.");
      return;
    }

    await scheduleGame(fallbackGameId, slot.scheduledAt);
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Admin Mode</h2>

        {adminToken ? (
          <p className="mt-2 text-green-300">Admin mode active.</p>
        ) : (
          <p className="mt-2 text-red-300">
            Not logged in. Go to /admin/login first.
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/25 bg-[#A51C30]/15 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">League</h2>

        <select
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value as League)}
        >
          <option value="competitive">Competitive</option>
          <option value="recreational">Recreational</option>
        </select>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Balanced Generator</h2>

        <form onSubmit={generateGamePool} className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Games per team
            </span>
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={gamesPerTeam}
              onChange={(e) => setGamesPerTeam(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Pool label, optional
            </span>
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={poolGroup}
              onChange={(e) => setPoolGroup(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white"
          >
            Generate Balanced Pool
          </button>
        </form>

        <p className="mt-3 text-sm text-red-100/50">
          Example: 22 recreational teams × 4 games each creates about 44 games.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Calendar Settings</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Start date
            </span>
            <input
              type="date"
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Number of days
            </span>
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Time slots, comma-separated
            </span>
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={timeSlots}
              onChange={(e) => setTimeSlots(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Location / court
            </span>
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Balance</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {teamBalance.map((team) => (
            <div
              key={team.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p className="font-black">{team.name}</p>
              <p className="mt-1 text-sm text-red-100/60">
                Scheduled: {team.scheduledCount} · In pool:{" "}
                {team.unscheduledCount}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Drag Game Pool</h2>

        {unscheduledGames.length === 0 ? (
          <p className="mt-4 text-red-100/60">
            No unscheduled games in this pool.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {unscheduledGames.map((game) => (
              <div
                key={game.id}
                draggable
                onDragStart={(e) => onDragStart(e, game.id)}
                className={`cursor-grab rounded-2xl border p-4 active:cursor-grabbing ${
                  game.league === "competitive"
                    ? "border-cyan-400/20 bg-cyan-500/10"
                    : "border-orange-400/20 bg-orange-500/10"
                }`}
              >
                <p className="font-black">
                  {game.home_team?.name} vs {game.away_team?.name}
                </p>

                <p className="mt-1 text-sm text-red-100/60">
                  {game.pool_group || game.round_label || "Unscheduled"}
                </p>

                {game.league && (
                  <div className="mt-2">
                    <LeagueBadge league={game.league} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Manual Schedule Fallback</h2>

        <p className="mt-2 text-red-100/60">
          If drag/drop is annoying in your browser, use this. It schedules the
          exact same way.
        </p>

        <form onSubmit={scheduleFallback} className="mt-5 grid gap-4 md:grid-cols-3">
          <select
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
            value={fallbackGameId}
            onChange={(e) => setFallbackGameId(e.target.value)}
          >
            <option value="">Select game</option>
            {unscheduledGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.home_team?.name} vs {game.away_team?.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
            value={fallbackSlotId}
            onChange={(e) => setFallbackSlotId(e.target.value)}
          >
            <option value="">Select slot</option>
            {calendarSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(`${slot.date}T00:00:00`).toLocaleDateString()} ·{" "}
                {slot.time}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white disabled:opacity-50"
            disabled={!fallbackGameId || !fallbackSlotId || Boolean(busyGameId)}
          >
            Schedule
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">Calendar Slots</h2>

        <p className="mt-2 text-red-100/60">
          Drag a game from the pool into a slot.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {calendarSlots.map((slot) => {
            const slotGames = gamesInSlot(slot);

            return (
              <div
                key={slot.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, slot.scheduledAt)}
                className="min-h-40 rounded-2xl border border-dashed border-white/20 bg-black/20 p-4"
              >
                <p className="font-black">
                  {new Date(`${slot.date}T00:00:00`).toLocaleDateString()}
                </p>

                <p className="mt-1 text-sm text-red-100/60">
                  {slot.time} · {location}
                </p>

                <div className="mt-4 grid gap-3">
                  {slotGames.map((game) => (
                    <div
                      key={game.id}
                      className="rounded-xl border border-white/10 bg-white/10 p-3"
                    >
                      <p className="font-black">
                        {game.home_team?.name} vs {game.away_team?.name}
                      </p>

                      <button
                        type="button"
                        disabled={busyGameId === game.id}
                        onClick={() => unscheduleGame(game.id)}
                        className="mt-3 rounded-lg border border-white/10 px-3 py-1 text-xs font-black text-neutral-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        {busyGameId === game.id ? "Moving..." : "Move back to pool"}
                      </button>
                    </div>
                  ))}

                  {slotGames.length === 0 && (
                    <p className="text-sm text-red-100/40">Drop game here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-black">All Scheduled Games</h2>

        <p className="mt-2 text-red-100/60">
          This shows every scheduled game in the selected league, even if it is
          outside the calendar range above. Use this to unschedule anything.
        </p>

        {scheduledGames.length === 0 ? (
          <p className="mt-4 text-red-100/60">
            No scheduled games for this league.
          </p>
        ) : (
          <div className="mt-5 grid gap-3">
            {scheduledGames.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-black">
                      {game.home_team?.name} vs {game.away_team?.name}
                    </p>

                    <p className="mt-1 text-sm text-red-100/60">
                      {game.scheduled_at
                        ? new Date(game.scheduled_at).toLocaleString()
                        : "No date"}
                      {game.location ? ` · ${game.location}` : ""}
                    </p>

                    {game.pool_group && (
                      <p className="mt-1 text-xs text-red-100/40">
                        {game.pool_group}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={busyGameId === game.id}
                    onClick={() => unscheduleGame(game.id)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {busyGameId === game.id ? "Moving..." : "Move back to pool"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}