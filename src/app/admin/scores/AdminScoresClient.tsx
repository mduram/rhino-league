"use client";

import { useEffect, useMemo, useState } from "react";
import { formatLeagueDateTime } from "@/lib/leagueTime";
import TeamLogo from "@/components/TeamLogo";
import LeagueBadge from "@/components/LeagueBadge";

type ViewMode = "needs_action" | "one_submission" | "both_submitted" | "no_submission" | "all_open";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function submissionTeamLabel(submission: any, game: any) {
  const homeTeam = normalizeTeam(game.home_team);
  const awayTeam = normalizeTeam(game.away_team);

  if (submission.submitting_team_id === game.home_team_id) {
    return homeTeam?.name || "Home team";
  }

  if (submission.submitting_team_id === game.away_team_id) {
    return awayTeam?.name || "Away team";
  }

  return "Unknown team";
}

function forfeitTeamLabel(forfeitTeamId: string | null | undefined, game: any) {
  const homeTeam = normalizeTeam(game.home_team);
  const awayTeam = normalizeTeam(game.away_team);

  if (!forfeitTeamId) return "";

  if (forfeitTeamId === game.home_team_id) {
    return homeTeam?.name || "Home team";
  }

  if (forfeitTeamId === game.away_team_id) {
    return awayTeam?.name || "Away team";
  }

  return "Unknown team";
}

function submissionsMatch(submissions: any[]) {
  if (submissions.length < 2) return false;

  const first = submissions[0];

  return submissions.every((submission) => {
    const sameScore =
      Number(submission.home_score) === Number(first.home_score) &&
      Number(submission.away_score) === Number(first.away_score);

    const sameForfeit =
      Boolean(submission.is_forfeit) === Boolean(first.is_forfeit) &&
      String(submission.forfeit_team_id || "") ===
        String(first.forfeit_team_id || "");

    return sameScore && sameForfeit;
  });
}

function getGameStatus({
  game,
  submissions,
}: {
  game: any;
  submissions: any[];
}) {
  const homeSubmitted = submissions.some(
    (submission) => submission.submitting_team_id === game.home_team_id
  );

  const awaySubmitted = submissions.some(
    (submission) => submission.submitting_team_id === game.away_team_id
  );

  const bothSubmitted = homeSubmitted && awaySubmitted;
  const oneSubmitted = submissions.length === 1 || (homeSubmitted !== awaySubmitted);
  const matching = bothSubmitted && submissionsMatch(submissions);

  if (matching) {
    return {
      label: "Both submitted — matching",
      tone: "green",
      homeSubmitted,
      awaySubmitted,
      bothSubmitted,
      oneSubmitted: false,
      matching,
    };
  }

  if (bothSubmitted) {
    return {
      label: "Both submitted — conflict",
      tone: "red",
      homeSubmitted,
      awaySubmitted,
      bothSubmitted,
      oneSubmitted: false,
      matching,
    };
  }

  if (oneSubmitted) {
    return {
      label: "One team submitted",
      tone: "gold",
      homeSubmitted,
      awaySubmitted,
      bothSubmitted,
      oneSubmitted: true,
      matching: false,
    };
  }

  return {
    label: "No submissions yet",
    tone: "neutral",
    homeSubmitted,
    awaySubmitted,
    bothSubmitted: false,
    oneSubmitted: false,
    matching: false,
  };
}

function statusBadgeClass(tone: string) {
  if (tone === "green") return "border-green-500/25 bg-green-500/10 text-green-300";
  if (tone === "red") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (tone === "gold") return "border-[#C4963E]/30 bg-[#C4963E]/10 text-[#F3EEE6]";
  return "border-white/10 bg-white/10 text-red-100/70";
}

export default function AdminScoresClient({
  games,
  pendingSubmissions,
}: {
  games: any[];
  pendingSubmissions: any[];
}) {
  const [adminToken, setAdminToken] = useState("");
  const [gameList, setGameList] = useState(games || []);
  const [submissionList, setSubmissionList] = useState(pendingSubmissions || []);
  const [viewMode, setViewMode] = useState<ViewMode>("needs_action");
  const [search, setSearch] = useState("");
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [homeScoreByGameId, setHomeScoreByGameId] = useState<Record<string, string>>({});
  const [awayScoreByGameId, setAwayScoreByGameId] = useState<Record<string, string>>({});
  const [forfeitTeamByGameId, setForfeitTeamByGameId] = useState<Record<string, string>>({});
  const [forfeitNoteByGameId, setForfeitNoteByGameId] = useState<Record<string, string>>({});

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");

    const initialHomeScores: Record<string, string> = {};
    const initialAwayScores: Record<string, string> = {};
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

      initialForfeits[game.id] = game.is_forfeit
        ? game.forfeit_team_id || ""
        : "";

      initialForfeitNotes[game.id] = game.forfeit_note || "";
    });

    pendingSubmissions.forEach((submission) => {
      if (!initialHomeScores[submission.game_id]) {
        initialHomeScores[submission.game_id] = String(submission.home_score ?? "");
      }

      if (!initialAwayScores[submission.game_id]) {
        initialAwayScores[submission.game_id] = String(submission.away_score ?? "");
      }

      if (submission.is_forfeit && !initialForfeits[submission.game_id]) {
        initialForfeits[submission.game_id] = submission.forfeit_team_id || "";
      }

      if (submission.forfeit_note && !initialForfeitNotes[submission.game_id]) {
        initialForfeitNotes[submission.game_id] = submission.forfeit_note || "";
      }
    });

    setHomeScoreByGameId(initialHomeScores);
    setAwayScoreByGameId(initialAwayScores);
    setForfeitTeamByGameId(initialForfeits);
    setForfeitNoteByGameId(initialForfeitNotes);
  }, [games, pendingSubmissions]);

  const submissionsByGameId = useMemo(() => {
    return submissionList.reduce((acc: Record<string, any[]>, submission) => {
      if (!acc[submission.game_id]) acc[submission.game_id] = [];
      acc[submission.game_id].push(submission);
      return acc;
    }, {});
  }, [submissionList]);

  const gameRows = useMemo(() => {
    return gameList.map((game) => {
      const submissions = submissionsByGameId[game.id] || [];
      const status = getGameStatus({ game, submissions });

      return {
        game,
        submissions,
        status,
      };
    });
  }, [gameList, submissionsByGameId]);

  const counts = useMemo(() => {
    return gameRows.reduce(
      (acc, row) => {
        acc.all_open += 1;

        if (row.submissions.length > 0) acc.needs_action += 1;
        if (row.status.oneSubmitted) acc.one_submission += 1;
        if (row.status.bothSubmitted) acc.both_submitted += 1;
        if (row.submissions.length === 0) acc.no_submission += 1;

        return acc;
      },
      {
        needs_action: 0,
        one_submission: 0,
        both_submitted: 0,
        no_submission: 0,
        all_open: 0,
      }
    );
  }, [gameRows]);

  const filteredRows = useMemo(() => {
    return gameRows.filter((row) => {
      const { game, submissions, status } = row;
      const homeTeam = normalizeTeam(game.home_team);
      const awayTeam = normalizeTeam(game.away_team);

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        homeTeam?.name?.toLowerCase().includes(query) ||
        awayTeam?.name?.toLowerCase().includes(query) ||
        game.location?.toLowerCase().includes(query) ||
        game.league?.toLowerCase().includes(query);

      const matchesView =
        viewMode === "all_open" ||
        (viewMode === "needs_action" && submissions.length > 0) ||
        (viewMode === "one_submission" && status.oneSubmitted) ||
        (viewMode === "both_submitted" && status.bothSubmitted) ||
        (viewMode === "no_submission" && submissions.length === 0);

      return matchesSearch && matchesView;
    });
  }, [gameRows, search, viewMode]);

  function applySubmissionToEditor(game: any, submission: any) {
    setHomeScoreByGameId((current) => ({
      ...current,
      [game.id]: String(submission.home_score ?? ""),
    }));

    setAwayScoreByGameId((current) => ({
      ...current,
      [game.id]: String(submission.away_score ?? ""),
    }));

    setForfeitTeamByGameId((current) => ({
      ...current,
      [game.id]: submission.is_forfeit ? submission.forfeit_team_id || "" : "",
    }));

    setForfeitNoteByGameId((current) => ({
      ...current,
      [game.id]: submission.forfeit_note || "",
    }));
  }

  async function approveSubmission(game: any, submission: any) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const homeTeam = normalizeTeam(game.home_team);
    const awayTeam = normalizeTeam(game.away_team);

    const confirmed = window.confirm(
      `Approve ${submission.home_score}-${submission.away_score} for ${
        homeTeam?.name || "Home"
      } vs ${awayTeam?.name || "Away"}? This will close the game as completed.`
    );

    if (!confirmed) return;

    const key = `approve-${submission.id}`;
    setBusyKey(key);

    const res = await fetch("/api/admin/approve-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        submissionId: submission.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not approve submission. Status: ${res.status}`);
      setBusyKey(null);
      return;
    }

    setGameList((current) => current.filter((item) => item.id !== game.id));
    setSubmissionList((current) =>
      current.filter((item) => item.game_id !== game.id)
    );

    setExpandedGameId(null);
    setMessage(data.message || "Submission approved and game closed.");
    setBusyKey(null);
  }

  async function rejectSubmission(game: any, submission: any) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmed = window.confirm(
      "Reject this submitted score? This only rejects this submission."
    );

    if (!confirmed) return;

    const key = `reject-${submission.id}`;
    setBusyKey(key);

    const res = await fetch("/api/admin/reject-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        submissionId: submission.id,
        gameId: game.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not reject submission. Status: ${res.status}`);
      setBusyKey(null);
      return;
    }

    setSubmissionList((current) =>
      current.filter((item) => item.id !== submission.id)
    );

    setMessage("Submission rejected.");
    setBusyKey(null);
  }

  async function saveManualScore(game: any) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const homeScore = homeScoreByGameId[game.id];
    const awayScore = awayScoreByGameId[game.id];
    const forfeitTeamId = forfeitTeamByGameId[game.id] || "";
    const isForfeit = Boolean(forfeitTeamId);

    if (homeScore === "" || awayScore === "") {
      setMessage("Enter both home and away scores before saving.");
      return;
    }

    const homeTeam = normalizeTeam(game.home_team);
    const awayTeam = normalizeTeam(game.away_team);

    const forfeitText = isForfeit
      ? ` This will mark ${forfeitTeamLabel(forfeitTeamId, game)} as forfeited.`
      : "";

    const confirmed = window.confirm(
      `Manually close ${homeTeam?.name || "Home"} vs ${
        awayTeam?.name || "Away"
      } as ${homeScore}-${awayScore}?${forfeitText}`
    );

    if (!confirmed) return;

    const key = `manual-${game.id}`;
    setBusyKey(key);

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
        status: "completed",
        clearPending: true,
        isForfeit,
        forfeitTeamId: isForfeit ? forfeitTeamId : null,
        forfeitNote: forfeitNoteByGameId[game.id] || "",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not save score. Status: ${res.status}`);
      setBusyKey(null);
      return;
    }

    setGameList((current) => current.filter((item) => item.id !== game.id));
    setSubmissionList((current) =>
      current.filter((item) => item.game_id !== game.id)
    );

    setExpandedGameId(null);
    setMessage(data.message || "Game score saved and game closed.");
    setBusyKey(null);
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              Open Score Queue
            </h2>

            <p className="mt-2 max-w-3xl text-red-100/65">
              Completed games are hidden. Use this queue to process submitted
              scores or manually close games that are missing submissions.
            </p>

            {adminToken ? (
              <p className="mt-3 text-sm font-black text-green-300">
                Admin mode active
              </p>
            ) : (
              <p className="mt-3 text-sm font-black text-red-300">
                Not logged in
              </p>
            )}
          </div>

          <input
            className="w-full rounded-full border border-[#C4963E]/25 bg-black/30 px-5 py-3 text-white placeholder:text-red-100/35 lg:max-w-sm"
            placeholder="Search team, league, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <FilterButton
            active={viewMode === "needs_action"}
            label="Needs action"
            count={counts.needs_action}
            onClick={() => setViewMode("needs_action")}
          />

          <FilterButton
            active={viewMode === "one_submission"}
            label="One team"
            count={counts.one_submission}
            onClick={() => setViewMode("one_submission")}
          />

          <FilterButton
            active={viewMode === "both_submitted"}
            label="Both teams"
            count={counts.both_submitted}
            onClick={() => setViewMode("both_submitted")}
          />

          <FilterButton
            active={viewMode === "no_submission"}
            label="No scores"
            count={counts.no_submission}
            onClick={() => setViewMode("no_submission")}
          />

          <FilterButton
            active={viewMode === "all_open"}
            label="All open"
            count={counts.all_open}
            onClick={() => setViewMode("all_open")}
          />
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/15 p-4 text-[#F3EEE6]">
            {message}
          </p>
        )}
      </section>

      <section className="grid gap-4">
        {filteredRows.length === 0 && (
          <p className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 text-red-100/60">
            No games match this view.
          </p>
        )}

        {filteredRows.map((row) => (
          <ScoreQueueCard
            key={row.game.id}
            row={row}
            expandedGameId={expandedGameId}
            setExpandedGameId={setExpandedGameId}
            homeScore={homeScoreByGameId[row.game.id] || ""}
            awayScore={awayScoreByGameId[row.game.id] || ""}
            setHomeScore={(value) =>
              setHomeScoreByGameId((current) => ({
                ...current,
                [row.game.id]: value,
              }))
            }
            setAwayScore={(value) =>
              setAwayScoreByGameId((current) => ({
                ...current,
                [row.game.id]: value,
              }))
            }
            forfeitTeamId={forfeitTeamByGameId[row.game.id] || ""}
            setForfeitTeamId={(value) =>
              setForfeitTeamByGameId((current) => ({
                ...current,
                [row.game.id]: value,
              }))
            }
            forfeitNote={forfeitNoteByGameId[row.game.id] || ""}
            setForfeitNote={(value) =>
              setForfeitNoteByGameId((current) => ({
                ...current,
                [row.game.id]: value,
              }))
            }
            approveSubmission={approveSubmission}
            rejectSubmission={rejectSubmission}
            applySubmissionToEditor={applySubmissionToEditor}
            saveManualScore={saveManualScore}
            busyKey={busyKey}
          />
        ))}
      </section>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#C4963E]/40 bg-[#C4963E]/15"
          : "border-[#A51C30]/25 bg-black/20 hover:bg-[#A51C30]/15"
      }`}
    >
      <p className="text-sm font-black uppercase tracking-[0.16em] text-red-100/55">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-white">
        {count}
      </p>
    </button>
  );
}

function ScoreQueueCard({
  row,
  expandedGameId,
  setExpandedGameId,
  homeScore,
  awayScore,
  setHomeScore,
  setAwayScore,
  forfeitTeamId,
  setForfeitTeamId,
  forfeitNote,
  setForfeitNote,
  approveSubmission,
  rejectSubmission,
  applySubmissionToEditor,
  saveManualScore,
  busyKey,
}: {
  row: any;
  expandedGameId: string | null;
  setExpandedGameId: (id: string | null) => void;
  homeScore: string;
  awayScore: string;
  setHomeScore: (value: string) => void;
  setAwayScore: (value: string) => void;
  forfeitTeamId: string;
  setForfeitTeamId: (value: string) => void;
  forfeitNote: string;
  setForfeitNote: (value: string) => void;
  approveSubmission: (game: any, submission: any) => void;
  rejectSubmission: (game: any, submission: any) => void;
  applySubmissionToEditor: (game: any, submission: any) => void;
  saveManualScore: (game: any) => void;
  busyKey: string | null;
}) {
  const { game, submissions, status } = row;
  const homeTeam = normalizeTeam(game.home_team);
  const awayTeam = normalizeTeam(game.away_team);
  const isExpanded = expandedGameId === game.id;
  const matchingSubmission = status.matching ? submissions[0] : null;

  return (
    <article className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${statusBadgeClass(
                status.tone
              )}`}
            >
              {status.label}
            </span>

            {game.league && <LeagueBadge league={game.league} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
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
                <p className="text-lg font-black text-white">
                  {homeTeam?.name || "Home"}
                </p>
              </div>
            </div>

            <p className="rounded-2xl border border-[#A51C30]/30 bg-black/20 px-4 py-2 text-center text-xl font-black text-white">
              {game.home_score ?? "-"} - {game.away_score ?? "-"}
            </p>

            <div className="flex items-center gap-3 sm:justify-end">
              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                  Away
                </p>
                <p className="text-lg font-black text-white">
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

          <p className="mt-3 text-sm text-red-100/55">
            {game.scheduled_at ? formatLeagueDateTime(game.scheduled_at) : "No scheduled time"}
            {game.location ? ` · ${game.location}` : ""}
          </p>
        </div>

        <div className="grid gap-3">
          <SubmissionMiniStatus
            label={homeTeam?.name || "Home"}
            submitted={status.homeSubmitted}
          />

          <SubmissionMiniStatus
            label={awayTeam?.name || "Away"}
            submitted={status.awaySubmitted}
          />

          {submissions.length > 0 && (
            <p className="text-sm text-red-100/55">
              {submissions.length} pending submission
              {submissions.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {matchingSubmission && (
            <button
              type="button"
              disabled={busyKey === `approve-${matchingSubmission.id}`}
              onClick={() => approveSubmission(game, matchingSubmission)}
              className="rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {busyKey === `approve-${matchingSubmission.id}`
                ? "Accepting..."
                : "Accept Matching Score"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setExpandedGameId(isExpanded ? null : game.id)
            }
            className="rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
          >
            {isExpanded ? "Close" : "Review / Add Score"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 grid gap-5 border-t border-[#A51C30]/20 pt-5">
          <section>
            <h3 className="text-xl font-black text-white">
              Submitted scores
            </h3>

            <div className="mt-3 grid gap-3">
              {submissions.length === 0 && (
                <p className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-4 text-red-100/60">
                  No submitted scores yet. You can manually add and close the
                  score below.
                </p>
              )}

              {submissions.map((submission: any) => (
                <SubmissionCard
                  key={submission.id}
                  game={game}
                  submission={submission}
                  approveSubmission={approveSubmission}
                  rejectSubmission={rejectSubmission}
                  applySubmissionToEditor={applySubmissionToEditor}
                  busyKey={busyKey}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
            <h3 className="text-xl font-black text-white">
              Manual score / override
            </h3>

            <p className="mt-1 text-sm text-red-100/65">
              Use this if only one team submitted, the two teams disagree, or no
              one submitted yet.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  {homeTeam?.name || "Home"} score
                </span>

                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white"
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  {awayTeam?.name || "Away"} score
                </span>

                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white"
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Forfeit
                </span>

                <select
                  className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white"
                  value={forfeitTeamId}
                  onChange={(e) => setForfeitTeamId(e.target.value)}
                >
                  <option value="">No forfeit</option>
                  <option value={game.home_team_id}>
                    {homeTeam?.name || "Home"} forfeited (-3 total)
                  </option>
                  <option value={game.away_team_id}>
                    {awayTeam?.name || "Away"} forfeited (-3 total)
                  </option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Forfeit note
                </span>

                <input
                  className="rounded-xl border border-red-500/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                  placeholder="Optional"
                  value={forfeitNote}
                  onChange={(e) => setForfeitNote(e.target.value)}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={busyKey === `manual-${game.id}`}
              onClick={() => saveManualScore(game)}
              className="mt-5 rounded-xl bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
            >
              {busyKey === `manual-${game.id}`
                ? "Saving..."
                : "Save and Close Game"}
            </button>
          </section>
        </div>
      )}
    </article>
  );
}

function SubmissionMiniStatus({
  label,
  submitted,
}: {
  label: string;
  submitted: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        submitted
          ? "border-green-500/20 bg-green-500/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100/45">
        {label}
      </p>

      <p className={`mt-1 font-black ${submitted ? "text-green-300" : "text-red-100/50"}`}>
        {submitted ? "Submitted" : "Missing"}
      </p>
    </div>
  );
}

function SubmissionCard({
  game,
  submission,
  approveSubmission,
  rejectSubmission,
  applySubmissionToEditor,
  busyKey,
}: {
  game: any;
  submission: any;
  approveSubmission: (game: any, submission: any) => void;
  rejectSubmission: (game: any, submission: any) => void;
  applySubmissionToEditor: (game: any, submission: any) => void;
  busyKey: string | null;
}) {
  const forfeitName = forfeitTeamLabel(submission.forfeit_team_id, game);

  return (
    <article className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C4963E]">
            Submitted by {submissionTeamLabel(submission, game)}
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {submission.home_score} - {submission.away_score}
          </p>

          <p className="mt-1 text-sm text-red-100/50">
            {submission.created_at
              ? new Date(submission.created_at).toLocaleString()
              : ""}
          </p>

          {(submission.submitter_name || submission.submitter_email) && (
            <p className="mt-2 text-sm text-red-100/60">
              {submission.submitter_name || "Unknown submitter"}
              {submission.submitter_email ? ` · ${submission.submitter_email}` : ""}
            </p>
          )}

          {submission.is_forfeit && (
            <p className="mt-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-black text-red-200">
              Forfeit: {forfeitName || "Unknown team"} (-3 total)
              {submission.forfeit_note ? ` · ${submission.forfeit_note}` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applySubmissionToEditor(game, submission)}
            className="rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-4 py-2 text-sm font-black text-[#F3EEE6] hover:bg-[#C4963E]/20"
          >
            Use in editor
          </button>

          <button
            type="button"
            disabled={busyKey === `approve-${submission.id}`}
            onClick={() => approveSubmission(game, submission)}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-500 disabled:opacity-50"
          >
            {busyKey === `approve-${submission.id}` ? "Accepting..." : "Accept"}
          </button>

          <button
            type="button"
            disabled={busyKey === `reject-${submission.id}`}
            onClick={() => rejectSubmission(game, submission)}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            {busyKey === `reject-${submission.id}` ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </article>
  );
}