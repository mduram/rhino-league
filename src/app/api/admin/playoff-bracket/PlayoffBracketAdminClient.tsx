"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function gameTeamLabel(game: any, side: "home" | "away") {
  const team = normalizeTeam(side === "home" ? game.home_team : game.away_team);
  const source = side === "home" ? game.home_source : game.away_source;
  const seed = side === "home" ? game.home_seed : game.away_seed;

  if (team) {
    return seed ? `#${seed} ${team.name}` : team.name;
  }

  return source || "TBD";
}

export default function PlayoffBracketAdminClient({
  seeds,
  games,
}: {
  seeds: any[];
  games: any[];
}) {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  const groupedGames = useMemo(() => {
    return games.reduce((acc: Record<string, any[]>, game) => {
      const key = game.round_label || "Playoffs";
      acc[key] = acc[key] || [];
      acc[key].push(game);
      return acc;
    }, {});
  }, [games]);

  async function generateBracket() {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmText = forceRegenerate
      ? "This will DELETE and regenerate the current playoff bracket. Continue?"
      : "Generate the playoff bracket from the current standings?";

    if (!window.confirm(confirmText)) {
      return;
    }

    setIsGenerating(true);

    const res = await fetch("/api/admin/playoffs/generate-bracket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        force: forceRegenerate,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not generate bracket. Status ${res.status}`);
      setIsGenerating(false);
      return;
    }

    setMessage(
      `${data.message} Created ${data.seedCount} seeds and ${data.gameCount} games. Refreshing...`
    );

    window.setTimeout(() => {
      window.location.reload();
    }, 900);
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black">Bracket Generator</h2>

            <p className="mt-2 text-sm leading-6 text-red-100/65">
              Current bracket status:{" "}
              <span className="font-black text-white">
                {games.length > 0 ? `${games.length} games generated` : "Not generated"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/playoffs"
              className="rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              Public Playoff Page
            </Link>

            <button
              type="button"
              onClick={generateBracket}
              disabled={isGenerating}
              className="rounded-xl bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Bracket"}
            </button>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-bold text-red-100/70">
          <input
            type="checkbox"
            checked={forceRegenerate}
            onChange={(event) => setForceRegenerate(event.target.checked)}
          />

          Force regenerate existing bracket
        </label>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-[#F3EEE6]">
            {message}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black">Current Seeds</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse">
            <thead className="bg-[#C4963E]/15 text-left">
              <tr>
                <th className="p-3">Seed</th>
                <th className="p-3">Team</th>
                <th className="p-3">League</th>
                <th className="p-3">Pts</th>
                <th className="p-3">W</th>
                <th className="p-3">L</th>
                <th className="p-3">Diff</th>
                <th className="p-3">GP</th>
              </tr>
            </thead>

            <tbody>
              {seeds.map((seed) => {
                const team = normalizeTeam(seed.team);

                return (
                  <tr key={seed.seed} className="border-t border-[#C4963E]/15">
                    <td className="p-3 font-black">#{seed.seed}</td>
                    <td className="p-3 font-black text-white">
                      {team?.name || "Unknown"}
                    </td>
                    <td className="p-3 text-red-100/70">{team?.league || ""}</td>
                    <td className="p-3">{seed.standing_points}</td>
                    <td className="p-3">{seed.wins}</td>
                    <td className="p-3">{seed.losses}</td>
                    <td className="p-3">{seed.differential}</td>
                    <td className="p-3">{seed.games_played}</td>
                  </tr>
                );
              })}

              {seeds.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-red-100/60">
                    No seeds generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="text-3xl font-black">Generated Games</h2>

        {Object.entries(groupedGames).map(([roundLabel, roundGames]) => (
          <div
            key={roundLabel}
            className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30"
          >
            <h3 className="text-xl font-black text-white">{roundLabel}</h3>

            <div className="mt-4 grid gap-3">
              {roundGames.map((game) => (
                <div
                  key={game.id}
                  className="grid gap-3 rounded-2xl border border-[#A51C30]/20 bg-black/20 p-4 lg:grid-cols-[90px_1fr_180px]"
                >
                  <div className="font-black text-[#C4963E]">G{game.game_number}</div>

                  <div className="font-black text-white">
                    {gameTeamLabel(game, "home")}{" "}
                    <span className="text-red-100/40">vs</span>{" "}
                    {gameTeamLabel(game, "away")}
                  </div>

                  <div className="text-sm text-red-100/60">
                    {game.scheduled_at
                      ? formatLeagueDateTime(game.scheduled_at)
                      : "Time TBD"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5 text-red-100/60">
            No playoff games generated yet.
          </div>
        )}
      </section>
    </div>
  );
}