"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import TeamLogo from "@/components/TeamLogo";
import {
  BRACKET_CHALLENGE_ENTRY_FEE,
  buildBracketChallenge,
  type BracketChallengeResult,
  type BracketChallengeTeam,
} from "@/lib/bracketChallenge";
import { formatLeagueDateTime } from "@/lib/leagueTime";
import { supabase } from "@/lib/supabase";

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

type BracketTeam = {
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
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
  home_team?: BracketTeam | BracketTeam[] | null;
  away_team?: BracketTeam | BracketTeam[] | null;
  provisional_home_team?: Standing | null;
  provisional_away_team?: Standing | null;
  note?: string;
};

type TabKey = "actual" | "simulate" | "challenge" | "schedule" | "seeds";

type ScenarioResult = {
  winner: Standing;
  loser: Standing | null;
};

type ScenarioGame = BracketGame & {
  scenarioHome: Standing | null;
  scenarioAway: Standing | null;
  homeIsBye: boolean;
  awayIsBye: boolean;
  scenarioResult: ScenarioResult | null;
};

type FieldMode = "favorites" | "chaos";
type SelectedOutcome = "win" | "loss";

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

function normalizeTeam(
  team: BracketTeam | BracketTeam[] | null | undefined
): BracketTeam | null {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function getBracketTitle(tab: TabKey) {
  if (tab === "actual") return "Actual Bracket";
  if (tab === "simulate") return "Simulate Bracket";
  if (tab === "challenge") return "Submit a Bracket";
  if (tab === "schedule") return "Playoff Schedule";
  return "Playoff Seeds";
}

function getBracketSubtitle(tab: TabKey, hasGeneratedBracket: boolean) {
  if (tab === "actual") {
    return hasGeneratedBracket
      ? "The official bracket with recorded teams, scores, and results."
      : "The fixed bracket based on the current seeds. Results will appear here as games are completed.";
  }

  if (tab === "simulate") {
    return "Move between the winners, elimination, and finals paths—or choose a team to explore one continuous route.";
  }

  if (tab === "challenge") {
    return "Pick every matchup, submit one bracket for 100 Rhino Coins, and chase the winner-take-all prize pot.";
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

function resolveScenarioSource({
  source,
  seedByNumber,
  resultByGame,
}: {
  source?: string | null;
  seedByNumber: Map<number, Standing>;
  resultByGame: Map<number, ScenarioResult>;
}) {
  if (!source) return { team: null, isBye: false };
  if (source === "BYE") return { team: null, isBye: true };

  const seedMatch = source.match(/^Seed\s+(\d+)/i);
  if (seedMatch) {
    return {
      team: seedByNumber.get(Number(seedMatch[1])) || null,
      isBye: false,
    };
  }

  const resultMatch = source.match(/^([WL])\s+G(\d+)/i);
  if (!resultMatch) return { team: null, isBye: false };

  const result = resultByGame.get(Number(resultMatch[2]));
  if (!result) return { team: null, isBye: false };

  return {
    team: resultMatch[1].toUpperCase() === "W" ? result.winner : result.loser,
    isBye: false,
  };
}

function pickFieldWinner({
  home,
  away,
  gameNumber,
  mode,
  chaosSeed,
}: {
  home: Standing;
  away: Standing;
  gameNumber: number;
  mode: FieldMode;
  chaosSeed: number;
}) {
  if (mode === "favorites") {
    return home.seed < away.seed ? home : away;
  }

  const signature = `${gameNumber}:${chaosSeed}:${home.id}:${away.id}`;
  const score = [...signature].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) % 997,
    0
  );

  return score % 2 === 0 ? home : away;
}

function buildFocusedScenario({
  games,
  teams,
  selectedTeamId,
  outcomes,
  manualWinners,
  fieldMode,
  chaosSeed,
}: {
  games: BracketGame[];
  teams: Standing[];
  selectedTeamId: string;
  outcomes: Record<number, SelectedOutcome>;
  manualWinners: Record<number, string>;
  fieldMode: FieldMode;
  chaosSeed: number;
}) {
  const seedByNumber = new Map(teams.map((team) => [team.seed, team]));
  const resultByGame = new Map<number, ScenarioResult>();
  const scenarioGames: ScenarioGame[] = [];

  [...games]
    .sort((a, b) => a.game_number - b.game_number)
    .forEach((game) => {
      const homeSource = resolveScenarioSource({
        source: game.home_source,
        seedByNumber,
        resultByGame,
      });
      const awaySource = resolveScenarioSource({
        source: game.away_source,
        seedByNumber,
        resultByGame,
      });

      let winner: Standing | null = null;
      let loser: Standing | null = null;

      if (homeSource.team && awaySource.isBye) {
        winner = homeSource.team;
      } else if (awaySource.team && homeSource.isBye) {
        winner = awaySource.team;
      } else if (homeSource.team && awaySource.team) {
        const manualWinnerId = manualWinners[game.game_number];
        const selectedIsHome = homeSource.team.id === selectedTeamId;
        const selectedIsAway = awaySource.team.id === selectedTeamId;

        if (
          manualWinnerId === homeSource.team.id ||
          manualWinnerId === awaySource.team.id
        ) {
          winner =
            manualWinnerId === homeSource.team.id
              ? homeSource.team
              : awaySource.team;
          loser =
            winner.id === homeSource.team.id
              ? awaySource.team
              : homeSource.team;
        } else if (selectedIsHome || selectedIsAway) {
          const selectedTeam = selectedIsHome
            ? homeSource.team
            : awaySource.team;
          const opponent = selectedIsHome ? awaySource.team : homeSource.team;
          const outcome = outcomes[game.game_number];

          if (outcome === "win") {
            winner = selectedTeam;
            loser = opponent;
          } else if (outcome === "loss") {
            winner = opponent;
            loser = selectedTeam;
          }
        } else {
          winner = pickFieldWinner({
            home: homeSource.team,
            away: awaySource.team,
            gameNumber: game.game_number,
            mode: fieldMode,
            chaosSeed,
          });
          loser =
            winner.id === homeSource.team.id
              ? awaySource.team
              : homeSource.team;
        }
      }

      const scenarioResult = winner ? { winner, loser } : null;
      if (scenarioResult) resultByGame.set(game.game_number, scenarioResult);

      scenarioGames.push({
        ...game,
        scenarioHome: homeSource.team,
        scenarioAway: awaySource.team,
        homeIsBye: homeSource.isBye,
        awayIsBye: awaySource.isBye,
        scenarioResult,
      });
    });

  return { scenarioGames, resultByGame };
}

function standingTeam(team: Standing) {
  return {
    id: team.id,
    name: `#${team.seed} ${team.name}`,
    rawName: team.name,
    logoUrl: team.logo_url,
    league: team.league,
    isTeam: true,
    isBye: false,
  };
}

function bracketChallengeTeam(team: BracketChallengeTeam) {
  return {
    id: team.id,
    name: `#${team.seed} ${team.name}`,
    rawName: team.name,
    logoUrl: team.logo_url,
    league: team.league,
    isTeam: true,
    isBye: false,
  };
}

function CompactTeamRow({
  team,
  score,
  isWinner,
  isFollowed,
}: {
  team: ReturnType<typeof gameTeam>;
  score?: number | null;
  isWinner?: boolean;
  isFollowed?: boolean;
}) {
  return (
    <div
      className={`flex h-8 items-center gap-2 border-b px-2.5 last:border-b-0 ${
        isFollowed
          ? "border-b-[#C4963E]/50 bg-[#FFF0C2] shadow-[inset_4px_0_0_#C4963E]"
          : isWinner
          ? "border-b-[#4E8F57] bg-[#E7F0E4]"
          : "border-b-[#16070B]/10 bg-[#F8F4EE]"
      }`}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md">
      {team.isTeam ? (
          <div className="scale-50">
            <TeamLogo
              logoUrl={team.logoUrl}
              teamName={team.rawName}
              league={team.league}
              size="sm"
            />
          </div>
      ) : (
        <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border text-[0.6rem] font-black ${
            team.isBye
                ? "border-[#C4963E]/50 bg-[#C4963E]/20 text-[#7A5310]"
                : "border-[#16070B]/10 bg-[#16070B]/5 text-[#16070B]/35"
          }`}
        >
          {team.isBye ? "B" : "—"}
        </div>
      )}
      </div>

      <span
        className={`min-w-0 flex-1 truncate text-xs font-black ${
          isFollowed
            ? "text-[#5D3A00]"
            : isWinner
            ? "text-[#183B1F]"
            : team.isBye
                ? "text-[#7A5310]"
                : "text-[#16070B]"
        }`}
      >
        {team.name}
      </span>
      <span className="w-5 text-right text-xs font-black text-[#16070B]">
        {score ?? ""}
      </span>
    </div>
  );
}

function CompactBracketCard({
  game,
  scenarioGame,
  followedTeamId,
  isPathGame,
  isCurrentGame,
  selected,
  onSelect,
  left,
  top,
  width,
  height,
}: {
  game: BracketGame;
  scenarioGame?: ScenarioGame;
  followedTeamId?: string;
  isPathGame?: boolean;
  isCurrentGame?: boolean;
  selected: boolean;
  onSelect: () => void;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const home = scenarioGame?.scenarioHome
    ? standingTeam(scenarioGame.scenarioHome)
    : gameTeam(game, "home");
  const away = scenarioGame?.scenarioAway
    ? standingTeam(scenarioGame.scenarioAway)
    : gameTeam(game, "away");
  const winnerLabel = getWinnerLabel(game);
  const scenarioWinnerId = scenarioGame?.scenarioResult?.winner.id;
  const isFinal = game.round_label === "Championship Final";
  const isByeGame = game.home_source === "BYE" || game.away_source === "BYE";

  return (
    <button
      type="button"
      id={`playoff-g${game.game_number}`}
      data-game-number={game.game_number}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Game ${game.game_number}: ${home.name} versus ${away.name}`}
      style={{ left, top, width, height }}
      className={`bracket-card absolute z-10 overflow-hidden rounded-xl border bg-[#F8F4EE] text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#A51C30] ${
        isCurrentGame
          ? "border-[#C4963E] ring-4 ring-[#C4963E]/35 shadow-xl shadow-[#C4963E]/20"
          : selected
          ? "border-[#A51C30] ring-2 ring-[#A51C30]/25"
          : isPathGame
            ? "border-[#C4963E] shadow-lg shadow-[#C4963E]/20"
          : isFinal
            ? "border-[#C4963E]"
            : "border-[#16070B]/20"
      }`}
    >
      <div
        className={`flex h-6 items-center justify-between px-2.5 text-[0.65rem] font-black uppercase tracking-[0.12em] ${
          isFinal
            ? "bg-[#C4963E] text-[#16070B]"
            : isCurrentGame
              ? "bg-[#C4963E] text-[#16070B]"
              : selected
              ? "bg-[#A51C30] text-white"
              : isPathGame
                ? "bg-[#F1D99B] text-[#5D3A00]"
              : "bg-[#E8E1D7] text-[#16070B]/65"
        }`}
      >
        <span>G{game.game_number}</span>
        <span>{isCurrentGame ? "YOUR PICK" : isByeGame ? "BYE" : game.status}</span>
      </div>
      <CompactTeamRow
        team={home}
        score={game.home_score}
        isWinner={
          scenarioWinnerId ? scenarioWinnerId === home.id : winnerLabel === home.name
        }
        isFollowed={home.id === followedTeamId}
      />
      <CompactTeamRow
        team={away}
        score={game.away_score}
        isWinner={
          scenarioWinnerId ? scenarioWinnerId === away.id : winnerLabel === away.name
        }
        isFollowed={away.id === followedTeamId}
      />
    </button>
  );
}

function PickableBracketCard({
  game,
  home,
  away,
  pickedWinnerId,
  statusLabel,
  disabled,
  left,
  top,
  width,
  height,
  onPick,
}: {
  game: BracketGame;
  home: ReturnType<typeof gameTeam>;
  away: ReturnType<typeof gameTeam>;
  pickedWinnerId?: string | null;
  statusLabel: string;
  disabled: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  onPick: (teamId: string) => void;
}) {
  const canPick = Boolean(home.id && away.id && !disabled);

  function teamRow(team: ReturnType<typeof gameTeam>) {
    const picked = Boolean(team.id && pickedWinnerId === team.id);

    return (
      <button
        type="button"
        disabled={!canPick || !team.id}
        onClick={() => team.id && onPick(team.id)}
        aria-pressed={picked}
        className={`bracket-team-button flex h-8 w-full items-center gap-2 border-b px-2.5 text-left last:border-b-0 disabled:cursor-not-allowed ${
          picked
            ? "border-[#1F8A70]/40 bg-[#DDF5ED] text-[#124D40] shadow-[inset_4px_0_0_#1F8A70]"
            : "border-[#16070B]/10 bg-[#F8F4EE] text-[#16070B] hover:bg-[#FFF0C2] disabled:hover:bg-[#F8F4EE]"
        }`}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {team.isTeam ? (
            <div className="scale-50">
              <TeamLogo
                logoUrl={team.logoUrl}
                teamName={team.rawName}
                league={team.league}
                size="sm"
              />
            </div>
          ) : (
            <span className="text-[0.65rem] font-black text-[#16070B]/35">
              {team.isBye ? "B" : "—"}
            </span>
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-xs font-black">
          {team.name}
        </span>
        {picked && <span className="text-xs font-black">✓</span>}
      </button>
    );
  }

  return (
    <div
      id={`playoff-g${game.game_number}`}
      style={{ left, top, width, height }}
      className={`bracket-card absolute z-10 overflow-hidden rounded-xl border bg-[#F8F4EE] text-left shadow-lg transition ${
        pickedWinnerId
          ? "border-[#1F8A70] shadow-[#1F8A70]/15"
          : canPick
            ? "border-[#C4963E] ring-2 ring-[#C4963E]/20"
            : "border-[#16070B]/20"
      }`}
    >
      <div
        className={`flex h-6 items-center justify-between px-2.5 text-[0.65rem] font-black uppercase tracking-[0.12em] ${
          pickedWinnerId
            ? "bg-[#1F8A70] text-white"
            : canPick
              ? "bg-[#C4963E] text-[#16070B]"
              : "bg-[#E8E1D7] text-[#16070B]/55"
        }`}
      >
        <span>G{game.game_number}</span>
        <span>{statusLabel}</span>
      </div>
      {teamRow(home)}
      {teamRow(away)}
    </div>
  );
}

function BracketConnector({
  startX,
  startY,
  endX,
  endY,
  state,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  state: "default" | "selected" | "path";
}) {
  const midpoint = startX + (endX - startX) / 2;
  const top = Math.min(startY, endY);
  const color =
    state === "selected"
      ? "#A51C30"
      : state === "path"
        ? "#C4963E"
        : "rgba(22, 7, 11, 0.24)";
  const thickness = state === "default" ? 1 : 3;

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-0 transition-colors"
        style={{
          left: startX,
          top: startY,
          width: midpoint - startX,
          height: thickness,
          backgroundColor: color,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-0 transition-colors"
        style={{
          left: midpoint,
          top,
          width: thickness,
          height: Math.max(thickness, Math.abs(endY - startY)),
          backgroundColor: color,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-0 transition-colors"
        style={{
          left: midpoint,
          top: endY,
          width: endX - midpoint,
          height: thickness,
          backgroundColor: color,
        }}
      />
    </>
  );
}

function sourceGameNumber(source?: string | null) {
  const match = source?.match(/^[WL]\s+G(\d+)/i);
  return match ? Number(match[1]) : null;
}

function BracketView({
  games,
  rounds,
  allGames,
  scenarioGames = [],
  followedTeamId,
  pathGameNumbers,
  focusGameNumber,
  currentGameNumber,
  onNavigateToGame,
  predictionResults = [],
  onPredictionPick,
  predictionLocked = false,
  onScenarioPick,
}: {
  games: BracketGame[];
  rounds: string[];
  allGames: BracketGame[];
  scenarioGames?: ScenarioGame[];
  followedTeamId?: string;
  pathGameNumbers: Set<number>;
  focusGameNumber?: number;
  currentGameNumber?: number;
  onNavigateToGame: (game: BracketGame) => void;
  predictionResults?: BracketChallengeResult[];
  onPredictionPick?: (gameNumber: number, teamId: string) => void;
  predictionLocked?: boolean;
  onScenarioPick?: (gameNumber: number, teamId: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [selectedGameNumber, setSelectedGameNumber] = useState<number | null>(
    null
  );
  const [comfortable, setComfortable] = useState(false);

  const layout = useMemo(() => {
    const cardWidth = comfortable ? 254 : 220;
    const cardHeight = 90;
    const columnGap = comfortable ? 96 : 78;
    const slotHeight = comfortable ? 132 : 108;
    const headerHeight = 62;
    const sidePadding = 34;
    const gamesByRound = rounds.map((roundLabel) => ({
      roundLabel,
      games: games
        .filter((game) => game.round_label === roundLabel)
        .sort((a, b) => a.game_number - b.game_number),
    }));
    const maxGames = Math.max(
      1,
      ...gamesByRound.map((round) => round.games.length)
    );
    const bracketHeight = Math.max(520, maxGames * slotHeight);
    const canvasHeight = headerHeight + bracketHeight + 34;
    const canvasWidth =
      sidePadding * 2 +
      rounds.length * cardWidth +
      Math.max(0, rounds.length - 1) * columnGap;
    const positions = new Map<
      number,
      { x: number; y: number; roundIndex: number }
    >();

    gamesByRound.forEach((round, roundIndex) => {
      const roundCount = Math.max(1, round.games.length);
      const roundSpacing = bracketHeight / roundCount;
      const x = sidePadding + roundIndex * (cardWidth + columnGap);

      round.games.forEach((game, gameIndex) => {
        positions.set(game.game_number, {
          x,
          y:
            headerHeight +
            roundSpacing * (gameIndex + 0.5) -
            cardHeight / 2,
          roundIndex,
        });
      });
    });

    const connections: {
      key: string;
      sourceGameNumber: number;
      targetGameNumber: number;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }[] = [];

    games.forEach((targetGame) => {
      [targetGame.home_source, targetGame.away_source].forEach(
        (source, sourceIndex) => {
          const sourceNumber = sourceGameNumber(source);
          if (!sourceNumber) return;

          const sourcePosition = positions.get(sourceNumber);
          const targetPosition = positions.get(targetGame.game_number);
          if (!sourcePosition || !targetPosition) return;

          connections.push({
            key: `${sourceNumber}-${targetGame.game_number}-${sourceIndex}`,
            sourceGameNumber: sourceNumber,
            targetGameNumber: targetGame.game_number,
            startX: sourcePosition.x + cardWidth,
            startY: sourcePosition.y + cardHeight / 2,
            endX: targetPosition.x,
            endY: targetPosition.y + cardHeight / 2,
          });
        }
      );
    });

    return {
      bracketHeight,
      canvasHeight,
      canvasWidth,
      cardHeight,
      cardWidth,
      columnGap,
      connections,
      gamesByRound,
      headerHeight,
      positions,
      sidePadding,
    };
  }, [comfortable, games, rounds]);

  const selectedGame = games.find(
    (game) => game.game_number === selectedGameNumber
  );
  const scenarioByGame = useMemo(
    () => new Map(scenarioGames.map((game) => [game.game_number, game])),
    [scenarioGames]
  );
  const predictionByGame = useMemo(
    () =>
      new Map(
        predictionResults.map((result) => [result.game.game_number, result])
      ),
    [predictionResults]
  );
  const pickableMode = Boolean(onPredictionPick || onScenarioPick);
  const selectedScenario = selectedGame
    ? scenarioByGame.get(selectedGame.game_number)
    : undefined;
  const selectedHome = selectedScenario?.scenarioHome
    ? standingTeam(selectedScenario.scenarioHome)
    : selectedGame
      ? gameTeam(selectedGame, "home")
      : null;
  const selectedAway = selectedScenario?.scenarioAway
    ? standingTeam(selectedScenario.scenarioAway)
    : selectedGame
      ? gameTeam(selectedGame, "away")
      : null;
  const winnerDestinations = selectedGame
    ? allGames.filter((game) =>
        [game.home_source, game.away_source].includes(
          `W G${selectedGame.game_number}`
        )
      )
    : [];
  const loserDestinations = selectedGame
    ? allGames.filter((game) =>
        [game.home_source, game.away_source].includes(
          `L G${selectedGame.game_number}`
        )
      )
    : [];

  function goToRound(index: number) {
    const targetIndex = Math.max(0, Math.min(index, rounds.length - 1));
    const left =
      layout.sidePadding +
      targetIndex * (layout.cardWidth + layout.columnGap) -
      16;

    setActiveRoundIndex(targetIndex);
    viewportRef.current?.scrollTo({ left, behavior: "smooth" });
  }

  useEffect(() => {
    if (!focusGameNumber) return;
    const position = layout.positions.get(focusGameNumber);
    if (!position) return;

    const frame = window.requestAnimationFrame(() => {
      setSelectedGameNumber(focusGameNumber);
      setActiveRoundIndex(position.roundIndex);
      viewportRef.current?.scrollTo({
        left: Math.max(0, position.x - 24),
        top: Math.max(0, position.y - 120),
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusGameNumber, layout.positions]);

  function destinationLabel(game: BracketGame) {
    if (game.bracket === "losers") return `Elimination · G${game.game_number}`;
    if (game.bracket === "finals") return `Finals · G${game.game_number}`;
    return `Winners · G${game.game_number}`;
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-[#A51C30]/30 bg-[#F3EEE6] shadow-2xl shadow-black/20">
      <div className="bracket-toolbar border-b border-[#A51C30]/20 bg-[#230B12] p-4">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {layout.gamesByRound.map((round, index) => (
              <button
                key={round.roundLabel}
                type="button"
                onClick={() => goToRound(index)}
                aria-pressed={activeRoundIndex === index}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                  activeRoundIndex === index
                    ? "border-[#F3EEE6] bg-[#F3EEE6] text-[#16070B]"
                    : "border-white/15 bg-black/20 text-red-100/70 hover:border-[#C4963E]/45 hover:text-white"
                }`}
              >
                {round.roundLabel}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => goToRound(activeRoundIndex - 1)}
              disabled={activeRoundIndex === 0}
              aria-label="Previous bracket round"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => goToRound(activeRoundIndex + 1)}
              disabled={activeRoundIndex === rounds.length - 1}
              aria-label="Next bracket round"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => setComfortable((current) => !current)}
              aria-pressed={comfortable}
              className="rounded-full border border-[#C4963E]/35 bg-[#C4963E]/10 px-4 py-2 text-xs font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              {comfortable ? "Compact view" : "Roomier view"}
            </button>
          </div>
        </div>
      </div>

      <div className="bracket-context border-b border-[#16070B]/10 bg-[#E8E1D7] px-4 py-3 text-[#16070B]">
        {pickableMode ? (
          <p className="text-sm font-bold text-[#16070B]/65">
            Click either team inside a resolved matchup to choose its winner.
            Every downstream game updates automatically.
          </p>
        ) : selectedGame ? (
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A51C30]">
                Selected · Game {selectedGame.game_number}
              </p>
              <p className="mt-1 font-black">
                {selectedHome?.name} vs. {selectedAway?.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              {winnerDestinations.length > 0 ? (
                winnerDestinations.map((game) => (
                  <button
                    key={`winner-${game.game_number}`}
                    type="button"
                    onClick={() => onNavigateToGame(game)}
                    className="rounded-full border border-[#16070B]/15 bg-white/60 px-3 py-2 transition hover:border-[#A51C30]/45 hover:bg-white"
                  >
                    Winner → {destinationLabel(game)}
                  </button>
                ))
              ) : (
                <span className="rounded-full border border-[#16070B]/15 bg-white/60 px-3 py-2">
                  Winner → title
                </span>
              )}
              {loserDestinations.length > 0 ? (
                loserDestinations.map((game) => (
                  <button
                    key={`loser-${game.game_number}`}
                    type="button"
                    onClick={() => onNavigateToGame(game)}
                    className="rounded-full border border-[#A51C30]/25 bg-[#A51C30]/10 px-3 py-2 text-[#7F1524] transition hover:border-[#A51C30]/55 hover:bg-[#A51C30]/15"
                  >
                    Loser → {destinationLabel(game)}
                  </button>
                ))
              ) : (
                <span className="rounded-full border border-[#16070B]/15 bg-white/60 px-3 py-2">
                  Loser → eliminated
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm font-bold text-[#16070B]/60">
            Select any matchup to highlight its connections and see where the winner and loser go next.
          </p>
        )}
      </div>

      <div
        ref={viewportRef}
        className="bracket-scroll w-full min-w-0 overflow-auto bg-[#F3EEE6] scroll-smooth"
      >
        <div
          className="bracket-canvas relative"
          style={{
            width: layout.canvasWidth,
            height: layout.canvasHeight,
            backgroundImage:
              "radial-gradient(circle, rgba(22,7,11,0.08) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {layout.gamesByRound.map((round, index) => (
            <button
              key={round.roundLabel}
              type="button"
              onClick={() => goToRound(index)}
              style={{
                left:
                  layout.sidePadding +
                  index * (layout.cardWidth + layout.columnGap),
                top: 16,
                width: layout.cardWidth,
              }}
              className={`absolute z-20 rounded-full border px-3 py-2 text-xs font-black transition ${
                activeRoundIndex === index
                  ? "border-[#A51C30] bg-[#A51C30] text-white"
                  : "border-[#16070B]/15 bg-white/80 text-[#16070B] hover:border-[#A51C30]/45"
              }`}
            >
              {round.roundLabel}
            </button>
          ))}

          {layout.connections.map((connection) => (
            <BracketConnector
              key={connection.key}
              startX={connection.startX}
              startY={connection.startY}
              endX={connection.endX}
              endY={connection.endY}
              state={
                selectedGameNumber === connection.sourceGameNumber ||
                selectedGameNumber === connection.targetGameNumber
                  ? "selected"
                  : pathGameNumbers.has(connection.sourceGameNumber) &&
                      pathGameNumbers.has(connection.targetGameNumber)
                    ? "path"
                    : "default"
              }
            />
          ))}

          {games.map((game) => {
            const position = layout.positions.get(game.game_number);
            if (!position) return null;
            const prediction = predictionByGame.get(game.game_number);
            const scenario = scenarioByGame.get(game.game_number);

            if (onPredictionPick && prediction) {
              const home = prediction.home
                ? bracketChallengeTeam(prediction.home)
                : gameTeam(game, "home");
              const away = prediction.away
                ? bracketChallengeTeam(prediction.away)
                : gameTeam(game, "away");

              return (
                <PickableBracketCard
                  key={game.id || game.game_number}
                  game={game}
                  home={home}
                  away={away}
                  pickedWinnerId={prediction.winner?.id}
                  statusLabel={
                    predictionLocked
                      ? "LOCKED"
                      : prediction.isBye
                        ? "BYE"
                        : prediction.hasValidPick
                          ? "PICKED"
                          : prediction.home && prediction.away
                            ? "PICK WINNER"
                            : "WAITING"
                  }
                  disabled={predictionLocked || prediction.isBye}
                  onPick={(teamId) =>
                    onPredictionPick(game.game_number, teamId)
                  }
                  left={position.x}
                  top={position.y}
                  width={layout.cardWidth}
                  height={layout.cardHeight}
                />
              );
            }

            if (onScenarioPick && scenario) {
              const scenarioIsBye =
                scenario.homeIsBye || scenario.awayIsBye;
              const home = scenario.scenarioHome
                ? standingTeam(scenario.scenarioHome)
                : gameTeam(game, "home");
              const away = scenario.scenarioAway
                ? standingTeam(scenario.scenarioAway)
                : gameTeam(game, "away");

              return (
                <PickableBracketCard
                  key={game.id || game.game_number}
                  game={game}
                  home={home}
                  away={away}
                  pickedWinnerId={scenario.scenarioResult?.winner.id}
                  statusLabel={
                    currentGameNumber === game.game_number
                      ? "YOUR PICK"
                      : scenarioIsBye
                        ? "BYE"
                        : "CLICK TEAM"
                  }
                  disabled={scenarioIsBye}
                  onPick={(teamId) => onScenarioPick(game.game_number, teamId)}
                  left={position.x}
                  top={position.y}
                  width={layout.cardWidth}
                  height={layout.cardHeight}
                />
              );
            }

            return (
              <CompactBracketCard
                key={game.id || game.game_number}
                game={game}
                scenarioGame={scenarioByGame.get(game.game_number)}
                followedTeamId={followedTeamId}
                isPathGame={pathGameNumbers.has(game.game_number)}
                isCurrentGame={currentGameNumber === game.game_number}
                selected={selectedGameNumber === game.game_number}
                onSelect={() => {
                  setSelectedGameNumber((current) =>
                    current === game.game_number ? null : game.game_number
                  );
                  setActiveRoundIndex(position.roundIndex);
                }}
                left={position.x}
                top={position.y}
                width={layout.cardWidth}
                height={layout.cardHeight}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#16070B]/10 bg-[#E8E1D7] px-4 py-3 text-xs text-[#16070B]/55">
        <p>Scroll vertically for every matchup and sideways to move through rounds.</p>
        <div className="flex items-center gap-3 font-black">
          {pickableMode && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F8A70]" /> Picked winner
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4E8F57]" /> Winner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C4963E]" /> Team route
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#A51C30]" /> Selected game
          </span>
        </div>
      </div>
    </div>
  );
}

const EMPTY_GAME_NUMBERS = new Set<number>();

function ActualBracket({ games }: { games: BracketGame[] }) {
  const [activeBracket, setActiveBracket] =
    useState<BracketGame["bracket"]>("winners");
  const [focusGameNumber, setFocusGameNumber] = useState<number | undefined>();

  const activeGames = games.filter((game) => game.bracket === activeBracket);
  const activeRounds =
    activeBracket === "winners"
      ? WINNERS_ROUNDS
      : activeBracket === "losers"
        ? LOSERS_ROUNDS
        : FINALS_ROUNDS;

  function navigateToGame(game: BracketGame) {
    setActiveBracket(game.bracket);
    setFocusGameNumber(game.game_number);
  }

  return (
    <section className="min-w-0 rounded-[2rem] border border-[#C4963E]/25 bg-[#16070B] p-3 md:p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {[
            {
              key: "winners" as const,
              label: "Winners",
              count: games.filter((game) => game.bracket === "winners").length,
            },
            {
              key: "losers" as const,
              label: "Elimination",
              count: games.filter((game) => game.bracket === "losers").length,
            },
            {
              key: "finals" as const,
              label: "Finals",
              count: games.filter((game) => game.bracket === "finals").length,
            },
          ].map((bracket) => (
            <button
              key={bracket.key}
              type="button"
              onClick={() => {
                setActiveBracket(bracket.key);
                setFocusGameNumber(undefined);
              }}
              aria-pressed={activeBracket === bracket.key}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                activeBracket === bracket.key
                  ? "border-[#C4963E] bg-[#C4963E] text-[#16070B]"
                  : "border-white/15 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {bracket.label} · {bracket.count}
            </button>
          ))}
        </div>
        <p className="shrink-0 text-xs font-bold text-white/45">
          Fixed bracket · recorded results only
        </p>
      </div>

      <BracketView
        key={activeBracket}
        games={activeGames}
        rounds={activeRounds}
        allGames={games}
        pathGameNumbers={EMPTY_GAME_NUMBERS}
        focusGameNumber={
          activeGames.some((game) => game.game_number === focusGameNumber)
            ? focusGameNumber
            : undefined
        }
        onNavigateToGame={navigateToGame}
      />
    </section>
  );
}

type BracketChallengeStatus = {
  entryFee: number;
  submissionOpen: boolean;
  schedulePublished: boolean;
  standingsFinal?: boolean;
  entryCount: number;
  pot: number;
  locksAt?: string | null;
  completedGames?: number;
  message?: string;
  leaders: {
    rank: number;
    displayName: string;
    score: number;
    status: string;
    payout: number;
  }[];
  myEntry?: {
    id: string;
    picks: Record<string, string>;
    liveScore: number;
    status: string;
    payout: number;
  } | null;
};

function BracketChallenge({
  games,
  teams,
}: {
  games: BracketGame[];
  teams: Standing[];
}) {
  const [activeBracket, setActiveBracket] =
    useState<BracketGame["bracket"]>("winners");
  const [focusGameNumber, setFocusGameNumber] = useState<number | undefined>();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<BracketChallengeStatus>({
    entryFee: BRACKET_CHALLENGE_ENTRY_FEE,
    submissionOpen: false,
    schedulePublished: false,
    entryCount: 0,
    pot: 0,
    leaders: [],
    myEntry: null,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const challengeTeams = useMemo(
    () =>
      teams.map(
        (team) =>
          ({
            id: team.id,
            seed: team.seed,
            name: team.name,
            league: team.league,
            logo_url: team.logo_url,
          }) as BracketChallengeTeam
      ),
    [teams]
  );
  const challenge = useMemo(
    () =>
      buildBracketChallenge({
        games,
        teams: challengeTeams,
        picks,
      }),
    [games, challengeTeams, picks]
  );
  const activeGames = games.filter((game) => game.bracket === activeBracket);
  const activeResults = challenge.results.filter(
    (result) => result.game.bracket === activeBracket
  );
  const activeRounds =
    activeBracket === "winners"
      ? WINNERS_ROUNDS
      : activeBracket === "losers"
        ? LOSERS_ROUNDS
        : FINALS_ROUNDS;
  const nextOpenGame = challenge.results.find(
    (result) =>
      result.requiresPick &&
      result.home &&
      result.away &&
      !result.hasValidPick
  );
  const submitted = Boolean(status.myEntry);

  async function loadStatus(accessToken?: string) {
    const res = await fetch("/api/playoff-bracket-challenge", {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not load the Bracket Challenge.");
      setLoading(false);
      return;
    }

    setStatus(data);
    if (data.myEntry?.picks) {
      setPicks(
        Object.fromEntries(
          Object.entries(data.myEntry.picks).map(([gameNumber, teamId]) => [
            Number(gameNumber),
            String(teamId),
          ])
        )
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      loadStatus(data.session?.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession || null);
        loadStatus(nextSession?.access_token);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function pickWinner(gameNumber: number, teamId: string) {
    if (submitted) return;
    const nextPicks = { ...picks, [gameNumber]: teamId };
    const nextChallenge = buildBracketChallenge({
      games,
      teams: challengeTeams,
      picks: nextPicks,
    });
    setPicks(nextChallenge.validPicks);
    setMessage("");
  }

  function navigateToGame(game: BracketGame) {
    setActiveBracket(game.bracket);
    setFocusGameNumber(game.game_number);
  }

  function goToNextPick() {
    if (!nextOpenGame) return;
    setActiveBracket(nextOpenGame.game.bracket);
    setFocusGameNumber(nextOpenGame.game.game_number);
  }

  async function submitBracket() {
    if (!session) {
      setMessage("Log in through Rhino Bets before submitting your bracket.");
      return;
    }
    if (!challenge.isComplete) {
      setMessage(
        `Finish every matchup first (${challenge.completedPicks}/${challenge.totalPicks}).`
      );
      goToNextPick();
      return;
    }
    if (!status.submissionOpen) {
      setMessage("Bracket submissions are not open yet.");
      return;
    }
    if (
      !window.confirm(
        `Submit this bracket for ${status.entryFee} Rhino Coins? Submitted brackets cannot be edited.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    const res = await fetch("/api/playoff-bracket-challenge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ picks: challenge.validPicks }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not submit your bracket.");
      setSubmitting(false);
      return;
    }

    setMessage(data.message || "Bracket submitted.");
    await loadStatus(session.access_token);
    setSubmitting(false);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="playoff-grid rounded-[2rem] border border-[#1F8A70]/55 bg-[#10251F] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#72D8BF]">
              Rhino Bracket Challenge
            </p>
            <h3 className="mt-2 text-3xl font-black text-white md:text-4xl">
              Pick every matchup. Own the bracket.
            </h3>
            <p className="mt-3 max-w-2xl leading-7 text-white/65">
              One submitted bracket costs 100 Rhino Coins. Each correct winner
              earns one point, and the top bracket takes the full pot. Tied
              leaders split it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Entry", `${status.entryFee} 🦏`],
              ["Pot", `${status.pot} 🦏`],
              ["Entries", status.entryCount],
              ["Your picks", `${challenge.completedPicks}/${challenge.totalPicks}`],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[#72D8BF]/20 bg-black/25 p-4"
              >
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#72D8BF]/70">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goToNextPick}
            disabled={!nextOpenGame || submitted}
            className="rounded-full border border-[#72D8BF]/30 bg-[#72D8BF]/10 px-5 py-3 font-black text-[#BFF4E7] transition hover:bg-[#72D8BF]/20 disabled:opacity-40"
          >
            {nextOpenGame ? `Next open pick · G${nextOpenGame.game.game_number}` : "All picks complete"}
          </button>
          <button
            type="button"
            onClick={submitBracket}
            disabled={
              submitting ||
              submitted ||
              !status.submissionOpen ||
              !challenge.isComplete
            }
            className="rounded-full bg-[#1F8A70] px-6 py-3 font-black text-white transition hover:bg-[#257F6B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitted
              ? "Bracket submitted ✓"
              : submitting
                ? "Submitting…"
                : `Submit for ${status.entryFee} 🦏`}
          </button>
          {!session && (
            <Link
              href="/betting"
              className="rounded-full px-4 py-3 font-black text-[#BFF4E7] hover:text-white"
            >
              Log in through Rhino Bets →
            </Link>
          )}
          <Link
            href="/betting"
            className="rounded-full border border-white/10 bg-black/15 px-4 py-3 font-black text-white/65 transition hover:border-[#72D8BF]/35 hover:text-white"
          >
            Individual playoff game bets →
          </Link>
          <span className="text-sm font-bold text-white/45">
            {submitted
              ? `Live score: ${status.myEntry?.liveScore || 0}`
              : status.message ||
                (status.submissionOpen
                  ? "Submissions close when the first playoff game begins."
                  : "Submissions wait for final standings and the official playoff schedule.")}
          </span>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-[#72D8BF]/25 bg-[#72D8BF]/10 p-4 text-[#D8FFF5]">
            {message}
          </p>
        )}
      </section>

      <section className="min-w-0 rounded-[2rem] border border-[#1F8A70]/35 bg-[#16070B] p-3 md:p-4">
        <div className="mb-4 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {[
              { key: "winners" as const, label: "Winners" },
              { key: "losers" as const, label: "Elimination" },
              { key: "finals" as const, label: "Finals" },
            ].map((bracket) => (
              <button
                key={bracket.key}
                type="button"
                onClick={() => {
                  setActiveBracket(bracket.key);
                  setFocusGameNumber(undefined);
                }}
                aria-pressed={activeBracket === bracket.key}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                  activeBracket === bracket.key
                    ? "border-[#1F8A70] bg-[#1F8A70] text-white"
                    : "border-white/15 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {bracket.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold text-white/45">
            {submitted ? "Submitted bracket · locked" : "Click a team to advance it"}
          </p>
        </div>

        <BracketView
          key={activeBracket}
          games={activeGames}
          rounds={activeRounds}
          allGames={games}
          pathGameNumbers={EMPTY_GAME_NUMBERS}
          focusGameNumber={
            activeGames.some((game) => game.game_number === focusGameNumber)
              ? focusGameNumber
              : undefined
          }
          onNavigateToGame={navigateToGame}
          predictionResults={activeResults}
          onPredictionPick={pickWinner}
          predictionLocked={submitted}
        />
      </section>

      {status.leaders.length > 0 && (
        <section className="rounded-[2rem] border border-[#1F8A70]/30 bg-[#10251F]/85 p-5 md:p-6">
          <h3 className="text-2xl font-black text-white">Bracket leaderboard</h3>
          <div className="mt-4 grid gap-2">
            {status.leaders.map((leader) => (
              <div
                key={`${leader.rank}-${leader.displayName}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <p className="font-black text-white">
                  #{leader.rank} {leader.displayName}
                </p>
                <p className="font-black text-[#72D8BF]">
                  {leader.score} correct
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <p className="text-sm text-white/45">Loading challenge status…</p>
      )}
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
            className="grid gap-4 rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/85 p-4 md:grid-cols-[110px_minmax(0,1fr)_220px]"
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

function JourneyTeam({
  team,
  label,
  emphasized = false,
}: {
  team: Standing;
  label: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 ${
        emphasized
          ? "border-[#C4963E]/45 bg-[#C4963E]/12"
          : "border-white/10 bg-black/25"
      }`}
    >
      <TeamLogo
        logoUrl={team.logo_url}
        teamName={team.name}
        league={team.league}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black text-white">
          #{team.seed} {team.name}
        </span>
        <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] text-white/40">
          {label}
        </span>
      </span>
    </div>
  );
}

function JourneyStep({
  game,
  selectedTeamId,
  isCurrent,
  onSelect,
}: {
  game: ScenarioGame;
  selectedTeamId: string;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const result = game.scenarioResult;
  const selectedWon = result?.winner.id === selectedTeamId;
  const selectedLost = result?.loser?.id === selectedTeamId;
  const opponent =
    game.scenarioHome?.id === selectedTeamId
      ? game.scenarioAway
      : game.scenarioAway?.id === selectedTeamId
        ? game.scenarioHome
        : null;

  const status = selectedWon
    ? game.homeIsBye || game.awayIsBye
      ? "BYE · ADVANCES"
      : "WIN · ADVANCES"
    : selectedLost
      ? game.bracket === "winners"
        ? "LOSS · DROPS DOWN"
        : "LOSS · RUN ENDS"
      : "NEXT DECISION";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[15rem] rounded-3xl border p-4 ${
        isCurrent
          ? "route-active border-[#C4963E]/55 bg-[#C4963E]/12"
          : selectedWon
            ? "border-[#C4963E]/30 bg-[#C4963E]/10"
            : selectedLost
              ? "border-[#A51C30]/45 bg-[#A51C30]/12"
              : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C4963E]">
          G{game.game_number}
        </p>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-white/45">
          {game.bracket}
        </span>
      </div>
      <p className="mt-3 text-lg font-black text-white">{game.round_label}</p>
      <p className="mt-2 text-sm text-white/50">
        {opponent ? `vs. #${opponent.seed} ${opponent.name}` : "First-round bye"}
      </p>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]/70">
        {status}
      </p>
    </button>
  );
}

function ScenarioLab({
  games,
  teams,
}: {
  games: BracketGame[];
  teams: Standing[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [outcomes, setOutcomes] = useState<
    Record<number, SelectedOutcome>
  >({});
  const [manualWinners, setManualWinners] = useState<Record<number, string>>(
    {}
  );
  const [fieldMode, setFieldMode] = useState<FieldMode>("favorites");
  const [chaosSeed, setChaosSeed] = useState(1);
  const [activeBracket, setActiveBracket] =
    useState<BracketGame["bracket"]>("winners");
  const [focusGameNumber, setFocusGameNumber] = useState<number | undefined>();

  const { scenarioGames } = useMemo(
    () =>
      buildFocusedScenario({
        games,
        teams,
        selectedTeamId,
        outcomes,
        manualWinners,
        fieldMode,
        chaosSeed,
      }),
    [
      games,
      teams,
      selectedTeamId,
      outcomes,
      manualWinners,
      fieldMode,
      chaosSeed,
    ]
  );

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const championshipGame = scenarioGames.find((game) => game.game_number === 61);
  const scenarioChampion = selectedTeamId
    ? championshipGame?.scenarioResult?.winner || null
    : null;

  const pathGames = scenarioGames.filter(
    (game) =>
      game.scenarioHome?.id === selectedTeamId ||
      game.scenarioAway?.id === selectedTeamId
  );
  const currentGame = pathGames.find(
    (game) =>
      game.scenarioHome && game.scenarioAway && !game.scenarioResult
  );
  const selectedLosses = pathGames.filter(
    (game) => game.scenarioResult?.loser?.id === selectedTeamId
  ).length;
  const decidedPathGames = pathGames.filter(
    (game) => Boolean(game.scenarioResult)
  );
  const lastPathGame = decidedPathGames[decidedPathGames.length - 1];
  const thirdPlaceGame = scenarioGames.find((game) => game.game_number === 62);

  let journeyStatus = currentGame ? "Still alive" : "Ready to begin";
  if (championshipGame?.scenarioResult?.winner.id === selectedTeamId) {
    journeyStatus = "Scenario champion";
  } else if (championshipGame?.scenarioResult?.loser?.id === selectedTeamId) {
    journeyStatus = "Scenario runner-up";
  } else if (thirdPlaceGame?.scenarioResult?.winner.id === selectedTeamId) {
    journeyStatus = "Scenario third place";
  } else if (thirdPlaceGame?.scenarioResult?.loser?.id === selectedTeamId) {
    journeyStatus = "Scenario fourth place";
  } else if (
    lastPathGame?.scenarioResult?.loser?.id === selectedTeamId &&
    lastPathGame.bracket === "losers"
  ) {
    journeyStatus = `Eliminated · ${lastPathGame.round_label}`;
  }

  const currentOpponent =
    currentGame?.scenarioHome?.id === selectedTeamId
      ? currentGame.scenarioAway
      : currentGame?.scenarioAway?.id === selectedTeamId
        ? currentGame.scenarioHome
        : null;
  const pathGameNumbers = new Set(
    pathGames.map((game) => game.game_number)
  );
  const activeGames = games.filter((game) => game.bracket === activeBracket);
  const activeScenarioGames = scenarioGames.filter(
    (game) => game.bracket === activeBracket
  );
  const activeRounds =
    activeBracket === "winners"
      ? WINNERS_ROUNDS
      : activeBracket === "losers"
        ? LOSERS_ROUNDS
        : FINALS_ROUNDS;

  function focusNextDecision(
    nextOutcomes: Record<number, SelectedOutcome>,
    teamId = selectedTeamId,
    nextManualWinners = manualWinners
  ) {
    const nextScenario = buildFocusedScenario({
      games,
      teams,
      selectedTeamId: teamId,
      outcomes: nextOutcomes,
      manualWinners: nextManualWinners,
      fieldMode,
      chaosSeed,
    }).scenarioGames;
    const nextGame = nextScenario.find(
      (game) =>
        (game.scenarioHome?.id === teamId ||
          game.scenarioAway?.id === teamId) &&
        game.scenarioHome &&
        game.scenarioAway &&
        !game.scenarioResult
    );

    if (!nextGame) return;
    setActiveBracket(nextGame.bracket);
    setFocusGameNumber(nextGame.game_number);
  }

  function chooseOutcome(outcome: SelectedOutcome) {
    if (!currentGame) return;
    const nextOutcomes = {
      ...outcomes,
      [currentGame.game_number]: outcome,
    };
    const chosenWinnerId =
      outcome === "win"
        ? selectedTeamId
        : currentGame.scenarioHome?.id === selectedTeamId
          ? currentGame.scenarioAway?.id
          : currentGame.scenarioHome?.id;
    const nextManualWinners = chosenWinnerId
      ? { ...manualWinners, [currentGame.game_number]: chosenWinnerId }
      : manualWinners;
    setOutcomes(nextOutcomes);
    setManualWinners(nextManualWinners);
    focusNextDecision(nextOutcomes, selectedTeamId, nextManualWinners);
  }

  function navigateToGame(game: BracketGame) {
    setActiveBracket(game.bracket);
    setFocusGameNumber(game.game_number);
  }

  function pickScenarioWinner(gameNumber: number, teamId: string) {
    const nextManualWinners = {
      ...manualWinners,
      [gameNumber]: teamId,
    };
    const scenarioGame = scenarioGames.find(
      (game) => game.game_number === gameNumber
    );
    const nextOutcomes = { ...outcomes };

    if (
      selectedTeamId &&
      (scenarioGame?.scenarioHome?.id === selectedTeamId ||
        scenarioGame?.scenarioAway?.id === selectedTeamId)
    ) {
      nextOutcomes[gameNumber] =
        teamId === selectedTeamId ? "win" : "loss";
    }

    setManualWinners(nextManualWinners);
    setOutcomes(nextOutcomes);
    focusNextDecision(nextOutcomes, selectedTeamId, nextManualWinners);
  }

  function runSelectedTeamToTitle() {
    if (!selectedTeamId) return;
    let titleOutcomes: Record<number, SelectedOutcome> = {};

    for (let index = 0; index < games.length + 2; index += 1) {
      const nextScenario = buildFocusedScenario({
        games,
        teams,
        selectedTeamId,
        outcomes: titleOutcomes,
        manualWinners: {},
        fieldMode,
        chaosSeed,
      }).scenarioGames;
      const nextGame = nextScenario.find(
        (game) =>
          (game.scenarioHome?.id === selectedTeamId ||
            game.scenarioAway?.id === selectedTeamId) &&
          game.scenarioHome &&
          game.scenarioAway &&
          !game.scenarioResult
      );

      if (!nextGame) break;
      titleOutcomes = {
        ...titleOutcomes,
        [nextGame.game_number]: "win",
      };
    }

    setOutcomes(titleOutcomes);
    setManualWinners({});
    setActiveBracket("finals");
    setFocusGameNumber(61);
  }

  function undoLastDecision() {
    const lastGameNumber = Object.keys(manualWinners)
      .map(Number)
      .at(-1);
    if (!lastGameNumber) return;

    const nextOutcomes = { ...outcomes };
    delete nextOutcomes[lastGameNumber];
    const nextManualWinners = { ...manualWinners };
    delete nextManualWinners[lastGameNumber];
    setOutcomes(nextOutcomes);
    setManualWinners(nextManualWinners);
    focusNextDecision(nextOutcomes, selectedTeamId, nextManualWinners);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="playoff-grid relative overflow-hidden rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/95 p-5 md:p-7">
        <div className="playoff-ambient absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#C4963E]/14 blur-3xl" />
        <div className="relative grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C4963E]">
              Choose a team · optional
            </p>
            <h3 className="mt-2 text-3xl font-black text-white">
              Simulate the bracket
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/55">
              We simulate the rest of the field so you only make the calls that
              change your team&apos;s route.
            </p>

            <select
              aria-label="Choose a team to follow through the playoff bracket"
              value={selectedTeamId}
              onChange={(event) => {
                const nextTeamId = event.target.value;
                setSelectedTeamId(nextTeamId);
                setOutcomes({});
                setManualWinners({});
                setFocusGameNumber(undefined);
                if (nextTeamId) focusNextDecision({}, nextTeamId, {});
              }}
              className="safari-select mt-5 w-full rounded-2xl border border-[#C4963E]/30 bg-[#230B12] px-4 py-4 text-lg font-black text-white outline-none focus:border-[#C4963E]"
            >
              <option value="">Choose a team to explore…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  #{team.seed} {team.name}
                </option>
              ))}
            </select>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                How should the other teams behave?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  {
                    key: "favorites" as const,
                    label: "Favorites advance",
                    detail: "Higher seeds win",
                  },
                  {
                    key: "chaos" as const,
                    label: "Chaos mode",
                    detail: "Upsets included",
                  },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    aria-pressed={fieldMode === mode.key}
                    onClick={() => setFieldMode(mode.key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      fieldMode === mode.key
                        ? "border-[#C4963E]/55 bg-[#C4963E]/14 text-white"
                        : "border-white/10 bg-black/20 text-white/55 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span className="block font-black">{mode.label}</span>
                    <span className="mt-1 block text-xs opacity-60">
                      {mode.detail}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setChaosSeed((current) => current + 1)}
                  disabled={fieldMode !== "chaos"}
                  className="rounded-2xl border border-[#A51C30]/40 bg-[#A51C30]/12 px-4 py-3 text-left font-black text-red-100 transition hover:bg-[#A51C30]/20 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ↻ Shuffle upsets
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runSelectedTeamToTitle}
                disabled={!selectedTeamId}
                className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-40"
              >
                Show title run
              </button>
              <button
                type="button"
                onClick={undoLastDecision}
                disabled={Object.keys(manualWinners).length === 0}
                className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 font-black text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Undo last
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutcomes({});
                  setManualWinners({});
                  if (selectedTeamId) focusNextDecision({}, selectedTeamId, {});
                }}
                className="rounded-full px-4 py-3 font-black text-white/45 transition hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Your calls
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {Object.keys(manualWinners).length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#A51C30]/35 bg-[#A51C30]/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-100/65">
                Losses
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {selectedLosses}<span className="text-xl text-white/35"> / 2</span>
              </p>
            </div>
            <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C4963E]">
                Journey status
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {journeyStatus}
              </p>
              <p className="mt-2 text-sm text-white/45">
                Scenario champion: {scenarioChampion?.name || "not decided yet"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {selectedTeam && (
      <section className="relative overflow-hidden rounded-[2rem] border border-[#A51C30]/35 bg-[#230B12]/85 p-5 md:p-7">
        <div className="playoff-ambient absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#A51C30]/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C4963E]">
                Next decision
              </p>
              <h3 className="mt-2 text-3xl font-black text-white">
                {currentGame ? currentGame.round_label : journeyStatus}
              </h3>
            </div>
            {currentGame && (
              <span className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-4 py-2 text-sm font-black text-[#F3EEE6]">
                Game {currentGame.game_number} · {currentGame.bracket} bracket
              </span>
            )}
          </div>

          {selectedTeam && currentGame && currentOpponent ? (
            <div className="mt-6">
              <div className="grid min-w-0 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <JourneyTeam
                  team={selectedTeam}
                  label="Your team"
                  emphasized
                />
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#C4963E]/35 bg-[#16070B] text-sm font-black text-[#C4963E]">
                  VS
                </span>
                <JourneyTeam team={currentOpponent} label="Next opponent" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseOutcome("win")}
                  className="rounded-2xl bg-[#C4963E] px-5 py-4 text-lg font-black text-[#16070B] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#D7AA4A]"
                >
                  {selectedTeam.name} wins →
                </button>
                <button
                  type="button"
                  onClick={() => chooseOutcome("loss")}
                  className="rounded-2xl border border-[#A51C30]/55 bg-[#A51C30]/18 px-5 py-4 text-lg font-black text-white transition hover:-translate-y-0.5 hover:bg-[#A51C30]/28"
                >
                  {selectedTeam.name} loses →
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-white/45">
                Pick an outcome and the next opponent appears instantly.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-6 text-center">
              <p className="text-4xl">🏆</p>
              <p className="mt-3 text-2xl font-black text-white">
                {journeyStatus}
              </p>
              <p className="mt-2 text-sm text-white/55">
                Reset the journey or undo the last call to try another route.
              </p>
            </div>
          )}
        </div>
      </section>
      )}

      <section className="min-w-0 rounded-[2rem] border border-[#C4963E]/25 bg-[#16070B] p-3 md:p-4">
        <div className="mb-4 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {[
              {
                key: "winners" as const,
                label: "Winners",
                count: games.filter((game) => game.bracket === "winners").length,
              },
              {
                key: "losers" as const,
                label: "Elimination",
                count: games.filter((game) => game.bracket === "losers").length,
              },
              {
                key: "finals" as const,
                label: "Finals",
                count: games.filter((game) => game.bracket === "finals").length,
              },
            ].map((bracket) => (
              <button
                key={bracket.key}
                type="button"
                onClick={() => {
                  setActiveBracket(bracket.key);
                  setFocusGameNumber(undefined);
                }}
                aria-pressed={activeBracket === bracket.key}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${
                  activeBracket === bracket.key
                    ? "border-[#C4963E] bg-[#C4963E] text-[#16070B]"
                    : "border-white/15 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {bracket.label} · {bracket.count}
              </button>
            ))}
          </div>
          <p className="shrink-0 text-xs font-bold text-white/45">
            Winner advances · loser crosses into elimination
          </p>
        </div>

        <BracketView
          key={activeBracket}
          games={activeGames}
          rounds={activeRounds}
          allGames={games}
          scenarioGames={selectedTeamId ? activeScenarioGames : []}
          followedTeamId={selectedTeamId || undefined}
          pathGameNumbers={pathGameNumbers}
          focusGameNumber={
            activeGames.some((game) => game.game_number === focusGameNumber)
              ? focusGameNumber
              : undefined
          }
          currentGameNumber={
            currentGame?.bracket === activeBracket
              ? currentGame.game_number
              : undefined
          }
          onNavigateToGame={navigateToGame}
          onScenarioPick={pickScenarioWinner}
        />
      </section>

      <section className="rounded-[2rem] border border-[#C4963E]/20 bg-[#C4963E]/[0.05] p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C4963E]">
              Live route
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {selectedTeam?.name || "Choose a team"}&apos;s journey
            </h3>
          </div>
          <p className="text-sm text-white/50">
            Gold is a win. Crimson is a loss. The pulsing card is next.
          </p>
        </div>

        <div className="mt-5 flex items-stretch gap-3 overflow-x-auto pb-3">
          {pathGames.map((game, index) => (
            <div key={game.game_number} className="flex items-center gap-3">
              <JourneyStep
                game={game}
                selectedTeamId={selectedTeamId}
                isCurrent={game.game_number === currentGame?.game_number}
                onSelect={() => navigateToGame(game)}
              />
              {index < pathGames.length - 1 && (
                <span className="text-2xl font-black text-[#C4963E]/50">→</span>
              )}
            </div>
          ))}

          {pathGames.length === 0 && (
            <p className="text-sm text-white/50">
              Choose a team to reveal its opening route.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PlayoffBracketClient({
  bracketGames = [],
  playoffTeams = [],
  hasGeneratedBracket = false,
  schedulePublished = false,
}: {
  bracketGames?: BracketGame[];
  playoffTeams?: Standing[];
  hasGeneratedBracket?: boolean;
  schedulePublished?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("actual");

  const safeBracketGames = bracketGames;
  const safePlayoffTeams = playoffTeams;

  const tabCounts = useMemo(
    () => ({
      schedule: safeBracketGames.length,
      seeds: safePlayoffTeams.length,
    }),
    [safeBracketGames, safePlayoffTeams]
  );

  return (
    <div className="grid gap-8">
      <section className="playoff-grid relative overflow-hidden rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/95 p-6 shadow-2xl shadow-black/35 md:p-8">
        <div className="playoff-ambient absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C4963E]/18 blur-3xl" />
        <div className="playoff-ambient absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#A51C30]/22 blur-3xl" />

        <div className="relative min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#C4963E]">
            Playoff Season
          </p>

          <h2 className="mt-2 text-4xl font-black text-white md:text-6xl">
            The road to Rhino glory starts August 3
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-red-100/75">
            The bracket below is{" "}
            {hasGeneratedBracket ? "officially generated" : "provisional"}.
            In the 30-team field, seeds #1 and #2 receive first-round BYEs and
            advance directly to the next winners-bracket round.{" "}
            {schedulePublished
              ? "The official schedule is now live."
              : "The official schedule appears after the regular season closes."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 font-black text-white">
              Third Place: Aug 28, 2pm Eastern
            </div>

            <div className="rounded-full bg-[#C4963E] px-5 py-3 font-black text-[#16070B]">
              Final: Aug 28, 4pm Eastern
            </div>

            <div className="rounded-full border border-[#A51C30]/40 bg-[#A51C30]/14 px-5 py-3 font-black text-red-100">
              Official schedule: {schedulePublished ? "Live" : "Locked"}
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

      <section className="relative overflow-hidden rounded-[2.4rem] border border-[#C4963E]/25 bg-[#100509] p-5 shadow-2xl shadow-black/40 md:p-7">
        <div className="playoff-ambient absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#C4963E]/12 blur-3xl" />
        <div className="playoff-ambient absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-[#A51C30]/18 blur-3xl" />

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
              {
                key: "actual",
                label: "Actual Bracket",
                count: "results",
              },
              {
                key: "simulate",
                label: "Simulate Bracket",
                count: "interactive",
              },
              {
                key: "challenge",
                label: "Submit a Bracket",
                count: "100 🦏",
              },
              {
                key: "schedule",
                label: schedulePublished ? "Schedule" : "Schedule · Locked",
                count: schedulePublished ? tabCounts.schedule : "locked",
              },
              { key: "seeds", label: "Seeds", count: tabCounts.seeds },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                disabled={tab.key === "schedule" && !schedulePublished}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  tab.key === "challenge"
                    ? activeTab === tab.key
                      ? "border-[#72D8BF] bg-[#1F8A70] text-white shadow-lg shadow-[#1F8A70]/20"
                      : "border-[#1F8A70]/60 bg-[#1F8A70]/15 text-[#BFF4E7] hover:bg-[#1F8A70]/25"
                    : activeTab === tab.key
                      ? "border-[#C4963E] bg-[#C4963E] text-[#16070B]"
                      : "border-[#F3EEE6]/15 bg-white/[0.04] text-red-100/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {tab.label} <span className="opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {activeTab === "actual" && (
            <ActualBracket games={safeBracketGames} />
          )}

          {activeTab === "simulate" && (
            <ScenarioLab games={safeBracketGames} teams={safePlayoffTeams} />
          )}

          {activeTab === "challenge" && (
            <BracketChallenge
              games={safeBracketGames}
              teams={safePlayoffTeams}
            />
          )}

          {activeTab === "schedule" && schedulePublished && (
            <ScheduleView games={safeBracketGames} />
          )}

          {activeTab === "seeds" && (
            <SeedsView playoffTeams={safePlayoffTeams} />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#C4963E]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
              Bracket status
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              {hasGeneratedBracket
                ? "Official playoff bracket"
                : "Provisional scenario bracket"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-100/65">
              {hasGeneratedBracket
                ? "This view uses the official bracket and published playoff schedule."
                : "This view is generated from live standings. The official schedule appears after the regular season closes."}
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
