"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import TeamLogo from "@/components/TeamLogo";
import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function bracketLabel(value: string) {
  if (value === "winners") return "Winners";
  if (value === "losers") return "Losers";
  if (value === "finals") return "Finals";
  return value;
}

function roundOrder(label: string) {
  const order: Record<string, number> = {
    "Winners Round 1": 1,
    "Winners Round 2": 2,
    "Winners Round 3": 3,
    "Winners Semifinal": 4,
    "Losers Round 1": 5,
    "Losers Round 2": 6,
    "Losers Round 3": 7,
    "Losers Round 4": 8,
    "Losers Round 5": 9,
    "Losers Semifinal": 10,
    "Playoff Semifinal": 11,
    "Third Place Game": 12,
    "Championship Final": 13,
  };

  return order[label] || 99;
}

function gameTeam(game: any, side: "home" | "away") {
  const team = normalizeTeam(side === "home" ? game.home_team : game.away_team);
  const source = side === "home" ? game.home_source : game.away_source;
  const seed = side === "home" ? game.home_seed : game.away_seed;

  if (team) {
    return {
      id: team.id,
      name: seed ? `#${seed} ${team.name}` : team.name,
      rawName: team.name,
      logoUrl: team.logo_url,
      isTeam: true,
    };
  }

  return {
    id: null,
    name: source || "TBD",
    rawName: source || "TBD",
    logoUrl: null,
    isTeam: false,
  };
}

function GameSlot({ game }: { game: any }) {
  const home = gameTeam(game, "home");
  const away = gameTeam(game, "away");

  return (
    <article
      id={`admin-playoff-g${game.game_number}`}
      className={`w-72 shrink-0 rounded-2xl border p-4 shadow-xl shadow-black/25 ${
        game.status === "completed"
          ? "border-[#C4963E]/40 bg-[#C4963E]/10"
          : game.status === "scheduled"
            ? "border-[#A51C30]/35 bg-[#230B12]/90"
            : "border-white/10 bg-black/25"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4963E]">
          G{game.game_number}
        </p>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-black text-red-100/55">
          {game.status}
        </span>
      </div>

      <p className="mt-2 text-xs font-bold text-red-100/50">
        {game.round_label}
      </p>

      <div className="mt-3 grid gap-2">
        <TeamLine team={home} />
        <TeamLine team={away} />
      </div>

      {game.home_score !== null && game.away_score !== null && (
        <p className="mt-3 text-lg font-black text-[#F3EEE6]">
          {game.home_score} - {game.away_score}
        </p>
      )}

      <div className="mt-3 text-xs leading-5 text-red-100/50">
        <p>
          {game.scheduled_at
            ? formatLeagueDateTime(game.scheduled_at)
            : "Not scheduled"}
        </p>

        {game.location && <p>{game.location}</p>}
      </div>
    </article>
  );
}

function TeamLine({
  team,
}: {
  team: {
    id: string | null;
    name: string;
    rawName: string;
    logoUrl: string | null;
    isTeam: boolean;
  };
}) {
  const content = (
    <>
      {team.isTeam ? (
        <TeamLogo logoUrl={team.logoUrl} teamName={team.rawName} size="sm" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-red-100/50">
          —
        </div>
      )}

      <span className="min-w-0 truncate text-sm font-black text-white">
        {team.name}
      </span>
    </>
  );

  if (team.id) {
    return (
      <Link
        href={`/teams/${team.id}`}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-2 transition hover:border-[#C4963E]/35 hover:bg-[#C4963E]/10"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-2">
      {content}
    </div>
  );
}

function BracketBoard({ games }: { games: any[] }) {
  const grouped = useMemo(() => {
    const byRound = games.reduce((acc: Record<string, any[]>, game) => {
      const key = game.round_label || "Playoffs";
      acc[key] = acc[key] || [];
      acc[key].push(game);
      return acc;
    }, {});

    return Object.entries(byRound)
      .sort(([a], [b]) => roundOrder(a) - roundOrder(b))
      .map(([roundLabel, roundGames]) => ({
        roundLabel,
        games: roundGames.sort((a, b) => a.game_number - b.game_number),
      }));
  }, [games]);

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-[#A51C30]/25 bg-black/20 p-5">
      <div className="flex min-w-max gap-5">
        {grouped.map((round) => (
          <section key={round.roundLabel} className="grid content-start gap-4">
            <div className="sticky left-0 rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-4 py-2 text-sm font-black text-[#F3EEE6]">
              {round.roundLabel}
            </div>

            <div className="grid gap-4">
              {round.games.map((game) => (
                <GameSlot key={game.id || game.game_number} game={game} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function PlayoffBracketAdminClient({
  seeds,
  games,
  unfinishedRegularSeasonGames,
}: {
  seeds: any[];
  games: any[];
  unfinishedRegularSeasonGames: number;
}) {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
  }, []);

  async function generateBracket() {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmText = forceRegenerate
      ? "This will DELETE and regenerate the current official playoff bracket. Continue?"
      : "Generate the official playoff bracket from the final standings?";

    if (!window.confirm(confirmText)) return;

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
      `${data.message} Created ${data.seedCount} seeds and ${data.gameCount} bracket slots. Refreshing...`
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
            <h2 className="text-2xl font-black">Official Bracket Generator</h2>

            <p className="mt-2 text-sm leading-6 text-red-100/65">
              Current bracket status:{" "}
              <span className="font-black text-white">
                {games.length > 0
                  ? `${games.length} bracket slots generated`
                  : "Not generated"}
              </span>
            </p>

            <p className="mt-2 text-sm leading-6 text-red-100/65">
              Unfinished regular-season games:{" "}
              <span
                className={
                  unfinishedRegularSeasonGames > 0
                    ? "font-black text-red-200"
                    : "font-black text-green-300"
                }
              >
                {unfinishedRegularSeasonGames}
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
              {isGenerating ? "Generating..." : "Generate Official Bracket"}
            </button>
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-bold text-red-100/70">
          <input
            type="checkbox"
            checked={forceRegenerate}
            onChange={(event) => setForceRegenerate(event.target.checked)}
          />

          Force generate/regenerate. This can delete the existing official
          playoff bracket.
        </label>

        {unfinishedRegularSeasonGames > 0 && (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100/80">
            The generator is meant for after the regular season ends. It will
            block generation unless you turn on force regenerate.
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-[#F3EEE6]">
            {message}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black">Official Seeds</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {seeds.map((seed) => {
            const team = normalizeTeam(seed.team);

            return (
              <div
                key={seed.seed}
                className={`rounded-2xl border p-4 ${
                  seed.seed === 1 || seed.seed === 2
                    ? "border-[#C4963E]/45 bg-[#C4963E]/10"
                    : "border-[#A51C30]/25 bg-black/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <TeamLogo
                    logoUrl={team?.logo_url}
                    teamName={team?.name || "Team"}
                    league={team?.league}
                    size="sm"
                  />

                  <div>
                    <p className="text-sm font-black text-[#C4963E]">
                      #{seed.seed}
                      {seed.seed === 1 || seed.seed === 2 ? " · BYE" : ""}
                    </p>

                    <p className="font-black text-white">
                      {team?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-red-100/55">
                  {seed.standing_points} pts · {seed.wins}-{seed.losses} · diff{" "}
                  {seed.differential}
                </p>
              </div>
            );
          })}

          {seeds.length === 0 && (
            <p className="text-red-100/60">No official seeds generated yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-3xl font-black">Official Bracket</h2>

        {games.length > 0 ? (
          <BracketBoard games={games} />
        ) : (
          <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5 text-red-100/60">
            No official playoff bracket generated yet.
          </div>
        )}
      </section>
    </div>
  );
}