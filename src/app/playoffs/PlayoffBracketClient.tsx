"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import TeamLogo from "@/components/TeamLogo";
import { formatLeagueDateTime } from "@/lib/leagueTime";

type Standing = {
  seed: number;
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  standingPoints: number;
  differential: number;
};

type BracketGame = {
  id?: string;
  game_number: number;
  bracket: "winners" | "losers" | "finals";
  round_label: string;
  scheduled_at?: string | null;
  location?: string | null;
  status: string;
  home_seed?: number | null;
  away_seed?: number | null;
  home_source?: string | null;
  away_source?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_team?: any;
  away_team?: any;
  provisional_home_team?: Standing | null;
  provisional_away_team?: Standing | null;
  note?: string;
};

type TabKey = "winners" | "losers" | "finals" | "schedule" | "seeds";

const WINNERS_ROUNDS = [
  "Winners Round 1",
  "Winners Round 2",
  "Winners Round 3",
  "Winners Semifinal",
];

const LOSERS_ROUNDS = [
  "Losers Round 1",
  "Losers Round 2",
  "Losers Round 3",
  "Losers Round 4",
  "Losers Round 5",
  "Losers Semifinal",
];

const FINALS_ROUNDS = [
  "Playoff Semifinal",
  "Third Place Game",
  "Championship Final",
];

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function getBracketTitle(tab: TabKey) {
  if (tab === "winners") return "Winners Bracket";
  if (tab === "losers") return "Losers Bracket";
  if (tab === "finals") return "Finals";
  if (tab === "schedule") return "Playoff Schedule";
  return "Playoff Seeds";
}

function getBracketSubtitle(tab: TabKey, hasGeneratedBracket: boolean) {
  if (tab === "winners") {
    return "The undefeated path. Seeds #1 and #2 start with first-round BYEs.";
  }

  if (tab === "losers") {
    return "One loss is survivable. A second loss ends the playoff run.";
  }

  if (tab === "finals") {
    return "Semifinals, third place game, and the championship final.";
  }

  if (tab === "schedule") {
    return hasGeneratedBracket
      ? "Official playoff game order and scheduled times."
      : "Provisional bracket order. Exact times appear after the official bracket is generated.";
  }

  return "Current playoff seeding based on the live standings.";
}

function gameTeam(game: BracketGame, side: "home" | "away") {
  const generatedTeam = normalizeTeam(
    side === "home" ? game.home_team : game.away_team
  );

  const provisionalTeam =
    side === "home" ? game.provisional_home_team : game.provisional_away_team;

  const source = side === "home" ? game.home_source : game.away_source;
  const seed = side === "home" ? game.home_seed : game.away_seed;

  if (generatedTeam) {
    return {
      id: generatedTeam.id,
      name: seed ? `#${seed} ${generatedTeam.name}` : generatedTeam.name,
      rawName: generatedTeam.name,
      logoUrl: generatedTeam.logo_url,
      league: generatedTeam.league,
      isTeam: true,
      isBye: false,
    };
  }

  if (provisionalTeam) {
    return {
      id: provisionalTeam.id,
      name: `#${provisionalTeam.seed} ${provisionalTeam.name}`,
      rawName: provisionalTeam.name,
      logoUrl: provisionalTeam.logo_url,
      league: provisionalTeam.league,
      isTeam: true,
      isBye: false,
    };
  }

  return {
    id: null,
    name: source || "TBD",
    rawName: source || "TBD",
    logoUrl: null,
    league: null,
    isTeam: false,
    isBye: source === "BYE",
  };
}

function getWinnerLabel(game: BracketGame) {
  if (
    game.home_score === null ||
    game.home_score === undefined ||
    game.away_score === null ||
    game.away_score === undefined
  ) {
    return null;
  }

  const home = gameTeam(game, "home");
  const away = gameTeam(game, "away");

  if (game.home_score > game.away_score) return home.name;
  if (game.away_score > game.home_score) return away.name;

  return null;
}

function TeamLine({
  team,
  isWinner,
}: {
  team: ReturnType<typeof gameTeam>;
  isWinner?: boolean;
}) {
  const content = (
    <>
      {team.isTeam ? (
        <TeamLogo
          logoUrl={team.logoUrl}
          teamName={team.rawName}
          league={team.league}
          size="sm"
        />
      ) : (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
            team.isBye
              ? "border-[#C4963E]/35 bg-[#C4963E]/15 text-[#F3EEE6]"
              : "border-white/10 bg-white/[0.04] text-red-100/50"
          }`}
        >
          {team.isBye ? "B" : "—"}
        </div>
      )}

      <span
        className={`min-w-0 truncate text-sm font-black ${
          isWinner
            ? "text-[#F3EEE6]"
            : team.isBye
              ? "text-[#F3EEE6]"
              : "text-white"
        }`}
      >
        {team.name}
      </span>
    </>
  );

  const className = `flex items-center gap-2 rounded-xl border p-2 transition ${
    isWinner
      ? "border-[#C4963E]/50 bg-[#C4963E]/15"
      : "border-white/10 bg-black/25"
  } ${
    team.id ? "hover:border-[#C4963E]/45 hover:bg-[#C4963E]/10" : ""
  }`;

  if (team.id) {
    return (
      <Link href={`/teams/${team.id}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function GameCard({ game }: { game: BracketGame }) {
  const home = gameTeam(game, "home");
  const away = gameTeam(game, "away");
  const winnerLabel = getWinnerLabel(game);

  const isFinal = game.round_label === "Championship Final";
  const isThirdPlace = game.round_label === "Third Place Game";
  const isByeGame = game.home_source === "BYE" || game.away_source === "BYE";

  return (
    <article
      id={`playoff-g${game.game_number}`}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-xl shadow-black/25 ${
        isFinal
          ? "border-[#C4963E]/70 bg-[#C4963E]/20"
          : isThirdPlace
            ? "border-[#F3EEE6]/25 bg-white/[0.06]"
            : isByeGame
              ? "border-[#C4963E]/35 bg-[#C4963E]/10"
              : "border-[#A51C30]/25 bg-[#230B12]/90"
      }`}
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#C4963E]/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4963E]">
              G{game.game_number}
            </p>

            <p className="mt-1 text-xs font-bold text-red-100/50">
              {game.round_label}
            </p>
          </div>

          <span
            className={`rounded-full border px-2 py-1 text-xs font-black ${
              isByeGame
                ? "border-[#C4963E]/30 bg-[#C4963E]/15 text-[#F3EEE6]"
                : game.status === "completed"
                  ? "border-green-400/25 bg-green-500/10 text-green-200"
                  : game.status === "scheduled"
                    ? "border-[#C4963E]/25 bg-[#C4963E]/10 text-[#F3EEE6]"
                    : "border-white/10 bg-white/[0.04] text-red-100/55"
            }`}
          >
            {isByeGame ? "BYE" : game.status}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          <TeamLine team={home} isWinner={winnerLabel === home.name} />
          <TeamLine team={away} isWinner={winnerLabel === away.name} />
        </div>

        {game.home_score !== null &&
          game.home_score !== undefined &&
          game.away_score !== null &&
          game.away_score !== undefined && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-red-100/45">
                Score
              </span>

              <span className="text-lg font-black text-[#F3EEE6]">
                {game.home_score} - {game.away_score}
              </span>
            </div>
          )}

        {game.note && (
          <p className="mt-3 rounded-xl border border-[#C4963E]/20 bg-black/20 p-2 text-xs leading-5 text-[#F3EEE6]">
            {game.note}
          </p>
        )}

        <div className="mt-3 text-xs leading-5 text-red-100/50">
          <p>
            {game.scheduled_at
              ? formatLeagueDateTime(game.scheduled_at)
              : isByeGame
                ? "Automatic advancement"
                : "Time TBD"}
          </p>

          {game.location && <p>{game.location}</p>}
        </div>
      </div>
    </article>
  );
}

function BracketRound({
  roundLabel,
  games,
}: {
  roundLabel: string;
  games: BracketGame[];
}) {
  return (
    <section className="min-w-[19rem] shrink-0">
      <div className="sticky left-0 mb-4 rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-4 py-2 text-center text-sm font-black text-[#F3EEE6]">
        {roundLabel}
      </div>

      <div className="grid gap-4">
        {games.map((game) => (
          <GameCard key={game.id || game.game_number} game={game} />
        ))}
      </div>
    </section>
  );
}

function BracketView({
  games,
  rounds,
}: {
  games: BracketGame[];
  rounds: string[];
}) {
  const gamesByRound = rounds.map((roundLabel) => ({
    roundLabel,
    games: games
      .filter((game) => game.round_label === roundLabel)
      .sort((a, b) => a.game_number - b.game_number),
  }));

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-[#A51C30]/25 bg-black/25 p-4">
      <div className="flex min-w-max gap-5 pb-2">
        {gamesByRound.map((round) => (
          <BracketRound
            key={round.roundLabel}
            roundLabel={round.roundLabel}
            games={round.games}
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleView({ games }: { games: BracketGame[] }) {
  const sortedGames = [...games].sort((a, b) => {
    if (a.scheduled_at && b.scheduled_at) {
      return (
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime()
      );
    }

    if (a.scheduled_at && !b.scheduled_at) return -1;
    if (!a.scheduled_at && b.scheduled_at) return 1;

    return a.game_number - b.game_number;
  });

  return (
    <div className="grid gap-3">
      {sortedGames.map((game) => {
        const home = gameTeam(game, "home");
        const away = gameTeam(game, "away");

        return (
          <article
            key={game.id || game.game_number}
            className="grid gap-4 rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/85 p-4 md:grid-cols-[110px_1fr_220px]"
          >
            <div>
              <p className="text-sm font-black text-[#C4963E]">
                G{game.game_number}
              </p>

              <p className="mt-1 text-xs text-red-100/45">
                {game.round_label}
              </p>
            </div>

            <div className="font-black text-white">
              {home.id ? (
                <Link
                  href={`/teams/${home.id}`}
                  className="hover:text-[#C4963E]"
                >
                  {home.name}
                </Link>
              ) : (
                <span>{home.name}</span>
              )}{" "}
              <span className="text-red-100/35">vs</span>{" "}
              {away.id ? (
                <Link
                  href={`/teams/${away.id}`}
                  className="hover:text-[#C4963E]"
                >
                  {away.name}
                </Link>
              ) : (
                <span>{away.name}</span>
              )}
            </div>

            <div className="text-sm text-red-100/60 md:text-right">
              <p>
                {game.scheduled_at
                  ? formatLeagueDateTime(game.scheduled_at)
                  : game.home_source === "BYE" || game.away_source === "BYE"
                    ? "Automatic advancement"
                    : "Time TBD"}
              </p>

              {game.location && <p>{game.location}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SeedsView({ playoffTeams }: { playoffTeams: Standing[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {playoffTeams.map((team) => (
        <Link
          key={team.id}
          href={`/teams/${team.id}`}
          className={`rounded-2xl border p-4 transition hover:border-[#C4963E]/60 ${
            team.seed === 1 || team.seed === 2
              ? "border-[#C4963E]/50 bg-[#C4963E]/15"
              : "border-[#A51C30]/25 bg-black/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <TeamLogo
              logoUrl={team.logo_url}
              teamName={team.name}
              league={team.league}
              size="sm"
            />

            <div>
              <p className="text-sm font-black text-[#C4963E]">
                Seed #{team.seed}
                {team.seed === 1 || team.seed === 2 ? " · BYE" : ""}
              </p>

              <p className="font-black text-white">{team.name}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-red-100/55">
            {team.standingPoints} pts · {team.wins}-{team.losses} · diff{" "}
            {team.differential}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function PlayoffBracketClient({
  bracketGames = [],
  playoffTeams = [],
  hasGeneratedBracket = false,
}: {
  bracketGames?: BracketGame[];
  playoffTeams?: Standing[];
  hasGeneratedBracket?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("winners");

  const safeBracketGames = bracketGames || [];
  const safePlayoffTeams = playoffTeams || [];

  const tabCounts = useMemo(
    () => ({
      winners: safeBracketGames.filter((game) => game.bracket === "winners")
        .length,
      losers: safeBracketGames.filter((game) => game.bracket === "losers")
        .length,
      finals: safeBracketGames.filter((game) => game.bracket === "finals")
        .length,
      schedule: safeBracketGames.length,
      seeds: safePlayoffTeams.length,
    }),
    [safeBracketGames, safePlayoffTeams]
  );

  const winnersGames = safeBracketGames.filter(
    (game) => game.bracket === "winners"
  );

  const losersGames = safeBracketGames.filter(
    (game) => game.bracket === "losers"
  );

  const finalsGames = safeBracketGames.filter(
    (game) => game.bracket === "finals"
  );

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/35 md:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C4963E]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#A51C30]/35 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#C4963E]">
            Playoff Season
          </p>

          <h2 className="mt-2 text-4xl font-black text-white md:text-6xl">
            The road to Rhino glory starts August 3
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-red-100/75">
            The bracket below is{" "}
            {hasGeneratedBracket ? "officially generated" : "provisional"}.
            Because two teams are eliminated/disqualified, the current #1 and #2
            seeds get first-round BYEs and advance directly to the next
            winners-bracket round.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-5 py-3 font-black text-white">
              Third Place: Aug 28, 2pm Eastern
            </div>

            <div className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B]">
              Final: Aug 28, 4pm Eastern
            </div>

            <Link
              href="/standings"
              className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              View standings
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2.4rem] border border-[#C4963E]/35 bg-[#100509] p-5 shadow-2xl shadow-black/40 md:p-7">
        <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#C4963E]/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-[#A51C30]/25 blur-3xl" />

        <div className="relative">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-[#C4963E]">
                Playoff bracket
              </p>

              <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">
                {getBracketTitle(activeTab)}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-red-100/65">
                {getBracketSubtitle(activeTab, hasGeneratedBracket)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#C4963E] px-4 py-2 text-sm font-black text-[#16070B]">
                30 teams
              </span>

              <span className="rounded-full border border-[#F3EEE6]/15 bg-white/[0.06] px-4 py-2 text-sm font-black text-white">
                Double elimination
              </span>

              <span className="rounded-full border border-[#A51C30]/35 bg-[#A51C30]/15 px-4 py-2 text-sm font-black text-red-100">
                Final Aug 28
              </span>
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "winners", label: "Winners", count: tabCounts.winners },
              { key: "losers", label: "Losers", count: tabCounts.losers },
              { key: "finals", label: "Finals", count: tabCounts.finals },
              { key: "schedule", label: "Schedule", count: tabCounts.schedule },
              { key: "seeds", label: "Seeds", count: tabCounts.seeds },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                  activeTab === tab.key
                    ? "border-[#C4963E] bg-[#C4963E] text-[#16070B]"
                    : "border-[#F3EEE6]/15 bg-white/[0.04] text-red-100/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {tab.label} <span className="opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {activeTab === "winners" && (
            <BracketView games={winnersGames} rounds={WINNERS_ROUNDS} />
          )}

          {activeTab === "losers" && (
            <BracketView games={losersGames} rounds={LOSERS_ROUNDS} />
          )}

          {activeTab === "finals" && (
            <BracketView games={finalsGames} rounds={FINALS_ROUNDS} />
          )}

          {activeTab === "schedule" && (
            <ScheduleView games={safeBracketGames} />
          )}

          {activeTab === "seeds" && (
            <SeedsView playoffTeams={safePlayoffTeams} />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#C4963E]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
              Bracket status
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              {hasGeneratedBracket
                ? "Official playoff bracket"
                : "Provisional live bracket"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-100/65">
              {hasGeneratedBracket
                ? "This view uses the official playoff_games table generated by admin."
                : "This view is generated directly from current standings and may change as scores are updated."}
            </p>
          </div>

          <div className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-5 py-3 text-sm font-black text-[#F3EEE6]">
            {safePlayoffTeams.length} eligible teams shown
          </div>
        </div>
      </section>
    </div>
  );
}