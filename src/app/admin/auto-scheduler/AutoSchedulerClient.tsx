"use client";

import { useEffect, useState } from "react";

function todayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addWeeksInputDate(weeks: number) {
  const today = new Date();
  today.setDate(today.getDate() + weeks * 7);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AutoSchedulerClient() {
  const [adminToken, setAdminToken] = useState("");
  const [startDate, setStartDate] = useState(todayInputDate());
  const [endDate, setEndDate] = useState(addWeeksInputDate(8));
  const [competitiveGamesPerTeam, setCompetitiveGamesPerTeam] = useState("4");
  const [recreationalGamesPerTeam, setRecreationalGamesPerTeam] = useState("4");
  const [location, setLocation] = useState("Court");
  const [clearExistingUnscheduled, setClearExistingUnscheduled] =
    useState(false);
  const [clearExistingAutoScheduled, setClearExistingAutoScheduled] =
    useState(true);

  const [minimumDaysBetweenGames, setMinimumDaysBetweenGames] = useState("1");
  const [idealDaysBetweenGames, setIdealDaysBetweenGames] = useState("2");
  const [maxGamesPerWeek, setMaxGamesPerWeek] = useState("2");

  const [blockedDates, setBlockedDates] = useState(
    "2026-06-19\n2026-07-03"
  );

  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function deleteAutoScheduledGames() {
    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmed = window.confirm(
      "Delete ALL auto-scheduled games? This will delete scheduled and unscheduled games created by the auto-scheduler. Manually created games and completed games should not be deleted."
    );

    if (!confirmed) return;

    setIsDeleting(true);

    const res = await fetch("/api/admin/delete-auto-scheduled-games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Delete failed. Status: ${res.status}`);
      setIsDeleting(false);
      return;
    }

    setMessage(data.message || `Deleted ${data.deleted} auto-scheduled games.`);
    setIsDeleting(false);
  }

  async function runAutoScheduler(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmed = window.confirm(
      clearExistingAutoScheduled
        ? "This will delete previous auto-scheduled games and create a new schedule. Manually created games and completed games will not be deleted. Continue?"
        : "This will add new games without deleting previous auto-scheduled games. This can create duplicates. Continue?"
    );

    if (!confirmed) return;

    setIsRunning(true);

    const res = await fetch("/api/admin/auto-schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        startDate,
        endDate,
        competitiveGamesPerTeam: Number(competitiveGamesPerTeam),
        recreationalGamesPerTeam: Number(recreationalGamesPerTeam),
        location,
        clearExistingUnscheduled,
        clearExistingAutoScheduled,
        minimumDaysBetweenGames: Number(minimumDaysBetweenGames),
        idealDaysBetweenGames: Number(idealDaysBetweenGames),
        maxGamesPerWeek: Number(maxGamesPerWeek),
        blockedDates,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Auto-scheduler failed. Status: ${res.status}`);
      setResult(data);
      setIsRunning(false);
      return;
    }

    setResult(data);
    setMessage(
      `Done. Scheduled ${data.scheduled} games. Left ${data.unscheduled} games unscheduled for manual review.`
    );
    setIsRunning(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-red-500/25 bg-red-500/10 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-3 text-2xl font-black text-white">
          Danger Zone
        </h2>

        <p className="mb-4 text-sm leading-6 text-red-100/75">
          Use this if the auto-scheduler made a bad schedule or you want to
          start over. This deletes games whose pool group starts with Auto
          Scheduled or Auto Scheduler. It does not target completed games.
        </p>

        <button
          onClick={deleteAutoScheduledGames}
          disabled={isDeleting}
          className="rounded-xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete All Auto-Scheduler Games"}
        </button>
      </section>

      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Scheduler Settings
        </h2>

        {adminToken ? (
          <p className="mb-4 text-green-300">Admin mode active.</p>
        ) : (
          <p className="mb-4 text-red-100">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        <form onSubmit={runAutoScheduler} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Start date
              </span>
              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                End date
              </span>
              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Competitive games per team
              </span>
              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                type="number"
                min="0"
                max="30"
                value={competitiveGamesPerTeam}
                onChange={(e) => setCompetitiveGamesPerTeam(e.target.value)}
              />
              <span className="text-xs text-red-100/45">
                Competitive teams can repeat matchups if needed.
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-red-100/70">
                Recreational games per team
              </span>
              <input
                className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                type="number"
                min="0"
                max="30"
                value={recreationalGamesPerTeam}
                onChange={(e) => setRecreationalGamesPerTeam(e.target.value)}
              />
              <span className="text-xs text-red-100/45">
                Recreational teams avoid repeat matchups.
              </span>
            </label>
          </div>

          <div className="rounded-3xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
            <h3 className="mb-4 text-xl font-black text-[#F3EEE6]">
              Rest / spacing rules
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Minimum days between games
                </span>
                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white"
                  type="number"
                  min="0"
                  max="7"
                  value={minimumDaysBetweenGames}
                  onChange={(e) => setMinimumDaysBetweenGames(e.target.value)}
                />
                <span className="text-xs text-red-100/45">
                  Default 1. Same-day games are strongly avoided.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Ideal days between games
                </span>
                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white"
                  type="number"
                  min="1"
                  max="14"
                  value={idealDaysBetweenGames}
                  onChange={(e) => setIdealDaysBetweenGames(e.target.value)}
                />
                <span className="text-xs text-red-100/45">
                  Default 2. Scheduler rewards better spacing.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Max games per team per week
                </span>
                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white"
                  type="number"
                  min="1"
                  max="5"
                  value={maxGamesPerWeek}
                  onChange={(e) => setMaxGamesPerWeek(e.target.value)}
                />
                <span className="text-xs text-red-100/45">
                  Default 2. Strongly avoids overload weeks.
                </span>
              </label>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Blocked dates
            </span>

            <textarea
              className="min-h-28 rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
              value={blockedDates}
              onChange={(e) => setBlockedDates(e.target.value)}
            />

            <span className="text-xs text-red-100/45">
              One date per line in YYYY-MM-DD format. Juneteenth and July 3 are
              included by default.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-red-100/70">
              Court / location name
            </span>
            <input
              className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[#A51C30]/25 bg-[#A51C30]/10 p-4">
            <input
              type="checkbox"
              checked={clearExistingAutoScheduled}
              onChange={(e) => setClearExistingAutoScheduled(e.target.checked)}
            />

            <span className="text-sm text-red-100/80">
              Delete previous auto-scheduled games before creating this schedule.
              Leave this ON unless you intentionally want to stack schedules.
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[#A51C30]/25 bg-black/20 p-4">
            <input
              type="checkbox"
              checked={clearExistingUnscheduled}
              onChange={(e) => setClearExistingUnscheduled(e.target.checked)}
            />

            <span className="text-sm text-red-100/70">
              Delete existing unscheduled games before creating new ones.
              Scheduled/completed games are never deleted by this option.
            </span>
          </label>

          <button
            disabled={isRunning}
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
          >
            {isRunning ? "Scheduling..." : "Run Auto-Scheduler"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-[#C4963E]/30 bg-black/20 p-5 text-sm text-red-100/70">
        <p className="font-black text-[#F3EEE6]">
          Valid game slots:
        </p>

        <p className="mt-2">
          Monday-Friday at 9-10am, 10-11am, 12-1pm, 3-4pm, and 4-5pm.
          The 2-3pm slot is left empty for re-schedules. Friday 4-5pm is blocked
          for pick-up.
        </p>

        <p className="mt-3">
          Blocked dates are excluded completely. By default, the scheduler blocks
          2026-06-19 for Juneteenth and 2026-07-03.
        </p>

        <p className="mt-3">
          The scheduler tries to avoid games that are too close together,
          prefers at least 2 days between games, allows 1 day if necessary, and
          strongly avoids more than 2 games per team per week.
        </p>
      </section>

      {result?.report && (
        <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Scheduling Report
          </h2>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">
                Scheduled
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.scheduled}
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
                Unscheduled
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.unscheduled}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-100/60">
                Max / Week
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.maxGamesPerWeek}
              </p>
            </div>

            <div className="rounded-2xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F3EEE6]">
                Ideal Rest
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.idealDaysBetweenGames}d
              </p>
            </div>
          </div>

          {result.blockedDates && (
            <div className="mb-4 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F3EEE6]">
                Blocked Dates
              </p>

              <p className="mt-2 text-red-100/70">
                {result.blockedDates.join(", ")}
              </p>
            </div>
          )}

          <div className="max-h-[600px] overflow-auto rounded-2xl border border-[#A51C30]/20">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead className="sticky top-0 bg-[#A51C30]/30 text-left">
                <tr>
                  <th className="p-3">Game</th>
                  <th className="p-3">League</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Repeat</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>

              <tbody>
                {result.report.map((row: any, index: number) => (
                  <tr key={index} className="border-t border-[#A51C30]/20">
                    <td className="p-3 font-bold text-white">
                      {row.game}
                    </td>

                    <td className="p-3 text-red-100/70">
                      {row.league}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          row.status === "scheduled"
                            ? "bg-green-500/15 text-green-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="p-3 text-red-100/70">
                      {row.slot || ""}
                    </td>

                    <td className="p-3 text-red-100/70">
                      {row.repeatNumber ? `#${row.repeatNumber}` : ""}
                    </td>

                    <td className="p-3 text-red-100/70">
                      {row.score}
                    </td>

                    <td className="p-3 text-red-100/60">
                      {(row.notes || []).join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}