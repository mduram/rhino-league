"use client";

import { useEffect, useMemo, useState } from "react";

import LeagueBadge from "@/components/LeagueBadge";
import TeamLogo from "@/components/TeamLogo";
import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
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

export default function EditScoresClient({ games }: { games: any[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [gameList, setGameList] = useState(games || []);
  const [search, setSearch] = useState("");
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busyGameId, setBusyGameId] = useState<string | null>(null);

  const [homeScoreByGameId, setHomeScoreByGameId] = useState<
    Record<string, string>
  >({});

  const [awayScoreByGameId, setAwayScoreByGameId] = useState<
    Record<string, string>
  >({});

  const [forfeitTeamByGameId, setForfeitTeamByGameId] = useState<
    Record<string, string>
  >({});

  const [forfeitNoteByGameId, setForfeitNoteByGameId] = useState<
    Record<string, string>
  >({});

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

    setHomeScoreByGameId(initialHomeScores);
    setAwayScoreByGameId(initialAwayScores);
    setForfeitTeamByGameId(initialForfeits);
    setForfeitNoteByGameId(initialForfeitNotes);
  }, [games]);

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();

    return gameList.filter((game) => {
      const homeTeam = normalizeTeam(game.home_team);
      const awayTeam = normalizeTeam(game.away_team);

      if (!query) return true;

      return (
        homeTeam?.name?.toLowerCase().includes(query) ||
        awayTeam?.name?.toLowerCase().includes(query) ||
        game.location?.toLowerCase().includes(query) ||
        game.league?.toLowerCase().includes(query)
      );
    });
  }, [gameList, search]);

  async function saveScore(game: any) {
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
      ? ` This will mark ${forfeitTeamLabel(
          forfeitTeamId,
          game
        )} as forfeited.`
      : "";

    const confirmed = window.confirm(
      `Update final score for ${homeTeam?.name || "Home"} vs ${
        awayTeam?.name || "Away"
      } to ${homeScore}-${awayScore}?${forfeitText}`
    );

    if (!confirmed) return;

    setBusyGameId(game.id);

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
      setMessage(data.error || `Could not update score. Status: ${res.status}`);
      setBusyGameId(null);
      return;
    }

    setGameList((current) =>
      current.map((item) => (item.id === game.id ? data.game : item))
    );

    setMessage(data.message || "Final score updated.");
    setBusyGameId(null);
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Completed Games</h2>

            <p className="mt-2 text-sm leading-6 text-red-100/60">
              Search for a completed game, open it, edit the score, and save.
            </p>
          </div>

          <div
            className={`rounded-full border px-4 py-2 text-sm font-black ${
              adminToken
                ? "border-green-500/25 bg-green-500/10 text-green-300"
                : "border-red-500/25 bg-red-500/10 text-red-300"
            }`}
          >
            {adminToken ? "Admin mode active" : "Not logged in"}
          </div>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team, league, or location..."
          className="mt-5 w-full rounded-2xl border border-[#A51C30]/25 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/35"
        />

        {message && (
          <div className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-[#F3EEE6]">
            {message}
          </div>
        )}
      </div>

      {filteredGames.length === 0 && (
        <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5 text-red-100/60">
          No completed games match this search.
        </div>
      )}

      {filteredGames.map((game) => {
        const homeTeam = normalizeTeam(game.home_team);
        const awayTeam = normalizeTeam(game.away_team);
        const isExpanded = expandedGameId === game.id;

        return (
          <article
            key={game.id}
            className="overflow-hidden rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 shadow-2xl shadow-black/30"
          >
            <div className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="flex items-center gap-3">
                    <TeamLogo
                      logoUrl={homeTeam?.logo_url}
                      teamName={homeTeam?.name || "Home"}
                      size="md"
                    />

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100/45">
                        Home
                      </p>

                      <p className="font-black text-white">
                        {homeTeam?.name || "Home"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 px-5 py-3 text-center text-2xl font-black text-[#F3EEE6]">
                    {game.home_score ?? "-"} - {game.away_score ?? "-"}
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100/45">
                        Away
                      </p>

                      <p className="font-black text-white">
                        {awayTeam?.name || "Away"}
                      </p>
                    </div>

                    <TeamLogo
                      logoUrl={awayTeam?.logo_url}
                      teamName={awayTeam?.name || "Away"}
                      size="md"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                  className="rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
                >
                  {isExpanded ? "Close" : "Edit Score"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-red-100/55">
                {game.league && <LeagueBadge league={game.league} />}

                <span>
                  {game.scheduled_at
                    ? formatLeagueDateTime(game.scheduled_at)
                    : "No scheduled time"}
                </span>

                {game.location && <span>· {game.location}</span>}

                {game.is_forfeit && (
                  <span className="font-black text-red-200">
                    · Forfeit:{" "}
                    {forfeitTeamLabel(game.forfeit_team_id, game) ||
                      "Unknown team"}
                  </span>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-[#A51C30]/20 bg-black/15 p-5">
                <h3 className="text-xl font-black text-white">
                  Edit final score
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-100/60">
                  This updates the public score everywhere: scores page,
                  standings, team pages, and game cards.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-red-100/70">
                      {homeTeam?.name || "Home"} score
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={homeScoreByGameId[game.id] || ""}
                      onChange={(event) =>
                        setHomeScoreByGameId((current) => ({
                          ...current,
                          [game.id]: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-black text-red-100/70">
                      {awayTeam?.name || "Away"} score
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={awayScoreByGameId[game.id] || ""}
                      onChange={(event) =>
                        setAwayScoreByGameId((current) => ({
                          ...current,
                          [game.id]: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-red-100/70">
                      Forfeit
                    </span>

                    <select
                      value={forfeitTeamByGameId[game.id] || ""}
                      onChange={(event) =>
                        setForfeitTeamByGameId((current) => ({
                          ...current,
                          [game.id]: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white"
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
                    <span className="text-sm font-black text-red-100/70">
                      Forfeit note
                    </span>

                    <input
                      value={forfeitNoteByGameId[game.id] || ""}
                      onChange={(event) =>
                        setForfeitNoteByGameId((current) => ({
                          ...current,
                          [game.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional note"
                      className="rounded-xl border border-[#A51C30]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={busyGameId === game.id}
                  onClick={() => saveScore(game)}
                  className="mt-5 rounded-xl bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
                >
                  {busyGameId === game.id ? "Saving..." : "Save Updated Score"}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}