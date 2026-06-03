"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function RescheduleTeamsClient({ teams }: { teams: any[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState(todayInputDate());
  const [endDate, setEndDate] = useState(addWeeksInputDate(8));
  const [location, setLocation] = useState("Court");

  const [minimumDaysBetweenGames, setMinimumDaysBetweenGames] = useState("1");
  const [idealDaysBetweenGames, setIdealDaysBetweenGames] = useState("2");
  const [maxGamesPerWeek, setMaxGamesPerWeek] = useState("2");

  const [blockedDates, setBlockedDates] = useState(
    "2026-06-19\n2026-07-03"
  );

  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesLeague =
        leagueFilter === "all" || team.league === leagueFilter;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        team.name?.toLowerCase().includes(query) ||
        team.captain?.toLowerCase().includes(query);

      return matchesLeague && matchesSearch;
    });
  }, [teams, leagueFilter, search]);

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) => {
      if (current.includes(teamId)) {
        return current.filter((id) => id !== teamId);
      }

      return [...current, teamId];
    });
  }

  function selectFilteredTeams() {
    const filteredIds = filteredTeams.map((team) => team.id);

    setSelectedTeamIds((current) => {
      return [...new Set([...current, ...filteredIds])];
    });
  }

  function clearSelectedTeams() {
    setSelectedTeamIds([]);
  }

  async function runTargetedRescheduler(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    if (selectedTeamIds.length === 0) {
      setMessage("Select at least one team first.");
      return;
    }

    const selectedNames = teams
      .filter((team) => selectedTeamIds.includes(team.id))
      .map((team) => team.name)
      .join(", ");

    const confirmed = window.confirm(
      `This will reschedule only auto-scheduled games involving these teams: ${selectedNames}. The rest of the schedule will stay locked. Continue?`
    );

    if (!confirmed) return;

    setIsRunning(true);

    const res = await fetch("/api/admin/reschedule-selected-teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        selectedTeamIds,
        startDate,
        endDate,
        location,
        minimumDaysBetweenGames: Number(minimumDaysBetweenGames),
        idealDaysBetweenGames: Number(idealDaysBetweenGames),
        maxGamesPerWeek: Number(maxGamesPerWeek),
        blockedDates,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Targeted rescheduler failed. Status: ${res.status}`);
      setResult(data);
      setIsRunning(false);
      return;
    }

    setResult(data);
    setMessage(data.message || "Targeted reschedule complete.");
    setIsRunning(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-5 text-sm text-red-100/75">
        <p className="font-black text-[#F3EEE6]">
          What this does:
        </p>

        <p className="mt-2">
          This does not rerun the whole schedule. It deletes and recreates only
          non-completed auto-scheduled games involving selected teams. All other
          scheduled games are treated as locked and their time slots are avoided.
        </p>
      </section>

      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Select teams to reschedule
        </h2>

        {adminToken ? (
          <p className="mb-4 text-green-300">Admin mode active.</p>
        ) : (
          <p className="mb-4 text-red-100">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/40"
            placeholder="Search team or captain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
          >
            <option value="all">All leagues</option>
            <option value="competitive">Competitive</option>
            <option value="recreational">Recreational</option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectFilteredTeams}
              className="rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-4 py-3 font-black text-[#F3EEE6] hover:bg-[#C4963E]/20"
            >
              Select shown
            </button>

            <button
              type="button"
              onClick={clearSelectedTeams}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-black text-red-100 hover:bg-red-500/20"
            >
              Clear
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-red-100/60">
          Selected: {selectedTeamIds.length}
        </p>

        <div className="max-h-[520px] overflow-auto rounded-2xl border border-[#A51C30]/20">
          <div className="grid gap-2 p-3 md:grid-cols-2">
            {filteredTeams.map((team) => {
              const checked = selectedTeamIds.includes(team.id);

              return (
                <label
                  key={team.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    checked
                      ? "border-[#C4963E]/60 bg-[#C4963E]/15"
                      : "border-[#A51C30]/25 bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(team.id)}
                      className="mt-1"
                    />

                    <div>
                      <p className="font-black text-white">
                        {team.name}
                      </p>

                      <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-red-100/45">
                        {team.league}
                      </p>

                      {team.captain && (
                        <p className="mt-1 text-sm text-red-100/60">
                          Captain: {team.captain}
                        </p>
                      )}

                      {(team.not_available ||
                        team.preferred_game_time ||
                        team.preferred_day_notes) && (
                        <div className="mt-3 grid gap-1 text-xs text-red-100/55">
                          {team.not_available && (
                            <p>
                              <span className="font-bold text-red-100/75">
                                Not available:
                              </span>{" "}
                              {team.not_available}
                            </p>
                          )}

                          {team.preferred_game_time && (
                            <p>
                              <span className="font-bold text-red-100/75">
                                Preferred time:
                              </span>{" "}
                              {team.preferred_game_time}
                            </p>
                          )}

                          {team.preferred_day_notes && (
                            <p>
                              <span className="font-bold text-red-100/75">
                                Day notes:
                              </span>{" "}
                              {team.preferred_day_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="mb-4 text-2xl font-black text-white">
          Rescheduler settings
        </h2>

        <form onSubmit={runTargetedRescheduler} className="grid gap-4">
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
            </label>
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
              One date per line in YYYY-MM-DD format.
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

          <button
            disabled={isRunning}
            className="rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
          >
            {isRunning ? "Rescheduling..." : "Reschedule Selected Teams"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      {result?.report && (
        <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
          <h2 className="mb-4 text-2xl font-black text-white">
            Targeted Reschedule Report
          </h2>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">
                Rescheduled
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.rescheduled}
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

            <div className="rounded-2xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F3EEE6]">
                Old games replaced
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {result.deletedOldGames}
              </p>
            </div>
          </div>

          <div className="max-h-[600px] overflow-auto rounded-2xl border border-[#A51C30]/20">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="sticky top-0 bg-[#A51C30]/30 text-left">
                <tr>
                  <th className="p-3">Game</th>
                  <th className="p-3">League</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Slot</th>
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
                          row.status === "rescheduled"
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