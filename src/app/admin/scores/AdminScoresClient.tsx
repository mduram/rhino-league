"use client";

import { useEffect, useMemo, useState } from "react";
import { formatLeagueDateTime } from "@/lib/leagueTime";
import TeamLogo from "@/components/TeamLogo";
import LeagueBadge from "@/components/LeagueBadge";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

export default function AdminScoresClient({ games }: { games: any[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [gameList, setGameList] = useState(games);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [homeScoreByGameId, setHomeScoreByGameId] = useState<Record<string, string>>({});
  const [awayScoreByGameId, setAwayScoreByGameId] = useState<Record<string, string>>({});
  const [statusByGameId, setStatusByGameId] = useState<Record<string, string>>({});
  const [forfeitTeamByGameId, setForfeitTeamByGameId] = useState<Record<string, string>>({});
  const [forfeitNoteByGameId, setForfeitNoteByGameId] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [savingGameId, setSavingGameId] = useState<string | null>(null);
  const [submissionGameId, setSubmissionGameId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionMessage, setSubmissionMessage] = useState("");

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");

    const initialHomeScores: Record<string, string> = {};
    const initialAwayScores: Record<string, string> = {};
    const initialStatuses: Record<string, string> = {};
    const initialForfeits: Record<string, string> = {};
    const initialForfeitNotes: Record<string, string> = {};

    games.forEach((game) => {
      initialHomeScores[game.id] =
        game.home_score === null || game.home_score === undefined
          ? ""
          : String(game.home_score);

      initialAwayScores[game.id] =
        game.away_score === null || game.away_score === undefined
          ? ""
          : String(game.away_score);

      initialStatuses[game.id] = game.status || "scheduled";
      initialForfeits[game.id] = game.is_forfeit ? game.forfeit_team_id || "" : "";
      initialForfeitNotes[game.id] = game.forfeit_note || "";
    });

    setHomeScoreByGameId(initialHomeScores);
    setAwayScoreByGameId(initialAwayScores);
    setStatusByGameId(initialStatuses);
    setForfeitTeamByGameId(initialForfeits);
    setForfeitNoteByGameId(initialForfeitNotes);
  }, [games]);

  const filteredGames = useMemo(() => {
    return gameList.filter((game) => {
      const homeTeam = normalizeTeam(game.home_team);
      const awayTeam = normalizeTeam(game.away_team);

      const matchesStatus =
        statusFilter === "all" ||
        game.status === statusFilter ||
        (statusFilter === "pending" && game.submitted_score_pending) ||
        (statusFilter === "forfeit" && game.is_forfeit);

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        homeTeam?.name?.toLowerCase().includes(query) ||
        awayTeam?.name?.toLowerCase().includes(query) ||
        game.location?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [gameList, statusFilter, search]);

  async function saveScore(game: any) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const homeScore = homeScoreByGameId[game.id];
    const awayScore = awayScoreByGameId[game.id];
    const nextStatus = statusByGameId[game.id] || "completed";
    const forfeitTeamId = forfeitTeamByGameId[game.id] || "";
    const isForfeit = Boolean(forfeitTeamId);

    if (homeScore === "" || awayScore === "") {
      setMessage("Enter both home and away scores before saving.");
      return;
    }

    const homeTeam = normalizeTeam(game.home_team);
    const awayTeam = normalizeTeam(game.away_team);
    const forfeitTeamName =
      forfeitTeamId === game.home_team_id
        ? homeTeam?.name || "Home team"
        : forfeitTeamId === game.away_team_id
          ? awayTeam?.name || "Away team"
          : "";

    const confirmed = window.confirm(
      isForfeit
        ? `Save score ${homeScore}-${awayScore}, set status to ${nextStatus}, and mark ${forfeitTeamName} as forfeited? This will apply a -3 standings penalty to that team.`
        : `Save score ${homeScore}-${awayScore} and set status to ${nextStatus}?`
    );

    if (!confirmed) return;

    setSavingGameId(game.id);

    const res = await fetch("/api/admin/update-game-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        gameId: game.id,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        status: nextStatus,
        clearPending: true,
        isForfeit,
        forfeitTeamId: isForfeit ? forfeitTeamId : null,
        forfeitNote: forfeitNoteByGameId[game.id] || "",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not update score. Status: ${res.status}`);
      setSavingGameId(null);
      return;
    }

    setGameList((current) =>
      current.map((item) => (item.id === game.id ? data.game : item))
    );

    setEditingGameId(null);
    setMessage(data.message || "Score updated.");
    setSavingGameId(null);
  }

  async function loadSubmissions(game: any) {
    setSubmissionMessage("");
    setSubmissions([]);
    setSubmissionGameId(game.id);

    if (!adminToken) {
      setSubmissionMessage("You are not logged in as admin.");
      return;
    }

    const res = await fetch("/api/admin/game-score-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        gameId: game.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSubmissionMessage(
        data.error || `Could not load submissions. Status: ${res.status}`
      );
      return;
    }

    setSubmissions(data.submissions || []);
    setSubmissionMessage(data.warning || "");
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              All Games
            </h2>

            <p className="mt-2 text-red-100/60">
              Edit scores directly here. If a team forfeited, select that team
              in the forfeit field. Standings should subtract an extra -3 from
              that team.
            </p>
          </div>

          {adminToken ? (
            <p className="rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-300">
              Admin mode active
            </p>
          ) : (
            <p className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200">
              Not logged in
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
            placeholder="Search teams or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All games</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending submissions</option>
            <option value="forfeit">Forfeits</option>
          </select>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      <section className="grid gap-5">
        {filteredGames.map((game) => {
          const homeTeam = normalizeTeam(game.home_team);
          const awayTeam = normalizeTeam(game.away_team);
          const isEditing = editingGameId === game.id;

          const forfeitingTeamName =
            game.forfeit_team_id === game.home_team_id
              ? homeTeam?.name
              : game.forfeit_team_id === game.away_team_id
                ? awayTeam?.name
                : null;

          return (
            <article
              key={game.id}
              className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      game.status === "completed"
                        ? "bg-green-500/15 text-green-300"
                        : "bg-[#A51C30]/25 text-red-100"
                    }`}
                  >
                    {game.status}
                  </span>

                  {game.submitted_score_pending && (
                    <span className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#F3EEE6]">
                      Pending submission
                    </span>
                  )}

                  {game.is_forfeit && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">
                      Forfeit: {forfeitingTeamName || "Unknown team"} (-3)
                    </span>
                  )}

                  {game.league && <LeagueBadge league={game.league} />}
                </div>

                <p className="text-sm text-red-100/60">
                  {formatLeagueDateTime(game.scheduled_at)}
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo
                    logoUrl={homeTeam?.logo_url || null}
                    teamName={homeTeam?.name || "Home"}
                    league={game.league}
                    size="sm"
                  />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                      Home
                    </p>
                    <p className="text-2xl font-black text-white">
                      {homeTeam?.name || "Home"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 px-5 py-3 text-center">
                  <p className="text-3xl font-black text-white">
                    {game.home_score ?? "-"} - {game.away_score ?? "-"}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                    Current score
                  </p>
                </div>

                <div className="flex items-center gap-3 lg:justify-end">
                  <div className="lg:text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                      Away
                    </p>
                    <p className="text-2xl font-black text-white">
                      {awayTeam?.name || "Away"}
                    </p>
                  </div>

                  <TeamLogo
                    logoUrl={awayTeam?.logo_url || null}
                    teamName={awayTeam?.name || "Away"}
                    league={game.league}
                    size="sm"
                  />
                </div>
              </div>

              {game.is_forfeit && game.forfeit_note && (
                <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                  {game.forfeit_note}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    setEditingGameId((current) =>
                      current === game.id ? null : game.id
                    )
                  }
                  className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
                >
                  {isEditing ? "Close Editor" : "Edit Score"}
                </button>

                <button
                  onClick={() => loadSubmissions(game)}
                  className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
                >
                  View Submitted Scores
                </button>
              </div>

              {isEditing && (
                <div className="mt-5 rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                  <h3 className="text-xl font-black text-white">
                    Edit score
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-red-100/70">
                        {homeTeam?.name || "Home"} score
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                        value={homeScoreByGameId[game.id] || ""}
                        onChange={(e) =>
                          setHomeScoreByGameId((current) => ({
                            ...current,
                            [game.id]: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-red-100/70">
                        {awayTeam?.name || "Away"} score
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                        value={awayScoreByGameId[game.id] || ""}
                        onChange={(e) =>
                          setAwayScoreByGameId((current) => ({
                            ...current,
                            [game.id]: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-red-100/70">
                        Status after saving
                      </span>
                      <select
                        className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                        value={statusByGameId[game.id] || "completed"}
                        onChange={(e) =>
                          setStatusByGameId((current) => ({
                            ...current,
                            [game.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="completed">Completed</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-red-100/70">
                        Forfeit
                      </span>

                      <select
                        className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white"
                        value={forfeitTeamByGameId[game.id] || ""}
                        onChange={(e) =>
                          setForfeitTeamByGameId((current) => ({
                            ...current,
                            [game.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">No forfeit</option>
                        <option value={game.home_team_id}>
                          {homeTeam?.name || "Home"} forfeited (-3)
                        </option>
                        <option value={game.away_team_id}>
                          {awayTeam?.name || "Away"} forfeited (-3)
                        </option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-red-100/70">
                        Forfeit note
                      </span>

                      <input
                        className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                        placeholder="Optional note, e.g. not enough players"
                        value={forfeitNoteByGameId[game.id] || ""}
                        onChange={(e) =>
                          setForfeitNoteByGameId((current) => ({
                            ...current,
                            [game.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => saveScore(game)}
                    disabled={savingGameId === game.id}
                    className="mt-4 rounded-xl bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
                  >
                    {savingGameId === game.id ? "Saving..." : "Save Score"}
                  </button>
                </div>
              )}

              {submissionGameId === game.id && (
                <div className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
                  <h3 className="text-xl font-black text-white">
                    Submitted scores
                  </h3>

                  {submissionMessage && (
                    <p className="mt-3 rounded-xl border border-[#A51C30]/25 bg-black/20 p-3 text-sm text-red-100/70">
                      {submissionMessage}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3">
                    {submissions.length === 0 && (
                      <p className="text-red-100/60">
                        No submitted score records found for this game.
                      </p>
                    )}

                    {submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="rounded-2xl border border-[#C4963E]/20 bg-black/25 p-4"
                      >
                        <pre className="overflow-auto text-sm text-red-100/75">
                          {JSON.stringify(submission, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {filteredGames.length === 0 && (
          <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
            No games match your filters.
          </p>
        )}
      </section>
    </div>
  );
}