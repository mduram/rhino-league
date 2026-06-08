"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatLeagueDateTime } from "@/lib/leagueTime";
import TeamLogo from "@/components/TeamLogo";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function statusLabel(status: string) {
  if (status === "open") return "Open";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function statusClass(status: string) {
  if (status === "won") return "border-green-500/25 bg-green-500/10 text-green-300";
  if (status === "lost") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (status === "open") return "border-[#C4963E]/25 bg-[#C4963E]/10 text-[#F3EEE6]";
  return "border-white/10 bg-white/10 text-white";
}

async function readJsonSafely(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Server returned non-JSON response. Status: ${res.status}. This usually means the API route is missing, failed to build, or returned an HTML error page.`,
      raw: text.slice(0, 300),
    };
  }
}

export default function MyBetsClient() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);

      if (data.session) {
        await loadMyBets(data.session.access_token);
      }

      setIsLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession || null);

        if (nextSession) {
          await loadMyBets(nextSession.access_token);
        } else {
          setProfile(null);
          setBets([]);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const openBets = useMemo(
    () => bets.filter((bet) => bet.status === "open"),
    [bets]
  );

  const historicalBets = useMemo(
    () => bets.filter((bet) => bet.status !== "open"),
    [bets]
  );

  const totalStaked = useMemo(
    () => bets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0),
    [bets]
  );

  const totalWon = useMemo(
    () =>
      bets
        .filter((bet) => bet.status === "won")
        .reduce((sum, bet) => sum + Number(bet.potential_payout || 0), 0),
    [bets]
  );

  const gameBetCount = useMemo(
    () => bets.filter((bet) => bet.bet_type === "game").length,
    [bets]
  );

  const futuresBetCount = useMemo(
    () => bets.filter((bet) => bet.bet_type === "futures").length,
    [bets]
  );

  async function loadMyBets(accessToken: string) {
    setMessage("");

    const res = await fetch("/api/betting/my-bets", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load your bets.");
      return;
    }

    setProfile(data.profile);
    setBets(data.bets || []);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setBets([]);
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 text-red-100/70">
        Loading your Rhino Coin bets...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
        <h2 className="text-3xl font-black text-white">
          Log in to see your bets
        </h2>

        <p className="mt-3 text-red-100/70">
          Use the betting page to log in or create an account. Then come back
          here to see all your Rhino Coin picks.
        </p>

        <Link
          href="/betting"
          className="mt-5 inline-block rounded-full bg-[#A51C30] px-6 py-3 font-black text-white transition hover:bg-[#7F1524]"
        >
          Go to Betting
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
              My Account
            </p>

            <h2 className="text-3xl font-black text-white">
              {profile?.display_name || session.user.email}
            </h2>

            <p className="mt-2 text-red-100/70">
              Logged in as {session.user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/betting"
              className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524]"
            >
              Place More Bets
            </Link>

            <Link
              href="/leaderboard"
              className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-5 py-3 font-black text-white transition hover:bg-white/10"
            >
              Leaderboard
            </Link>

            <button
              onClick={signOut}
              className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Balance" value={`${profile?.rhino_coins ?? 0} 🦏`} />
          <StatCard label="Open Bets" value={String(openBets.length)} />
          <StatCard label="Game Bets" value={String(gameBetCount)} />
          <StatCard label="Futures" value={String(futuresBetCount)} />
          <StatCard label="Total Staked" value={`${totalStaked} 🦏`} />
          <StatCard label="Total Won" value={`${totalWon} 🦏`} green />
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      <BetsList title="Open Bets" bets={openBets} emptyText="No open bets yet." />

      <BetsList
        title="Historical Bets"
        bets={historicalBets}
        emptyText="No historical bets yet."
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        green
          ? "border-green-500/20 bg-green-500/10"
          : "border-[#A51C30]/25 bg-black/25"
      }`}
    >
      <p
        className={`text-sm font-black uppercase tracking-[0.18em] ${
          green ? "text-green-300" : "text-red-100/60"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function BetsList({
  title,
  bets,
  emptyText,
}: {
  title: string;
  bets: any[];
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-4 text-3xl font-black text-[#F3EEE6]">
        {title}
      </h2>

      <div className="grid gap-5">
        {bets.map((bet) =>
          bet.bet_type === "futures" ? (
            <FuturesBetCard key={`futures-${bet.id}`} bet={bet} />
          ) : (
            <GameBetCard key={`game-${bet.id}`} bet={bet} />
          )
        )}

        {bets.length === 0 && (
          <p className="rounded-2xl border border-[#A51C30]/25 bg-[#230B12]/70 p-5 text-red-100/60">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function GameBetCard({ bet }: { bet: any }) {
  const game = bet.game;
  const homeTeam = normalizeTeam(game?.home_team);
  const awayTeam = normalizeTeam(game?.away_team);
  const pickedTeam = bet.side === "home" ? homeTeam : awayTeam;

  return (
    <article className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
      <BetHeader bet={bet} label="Game bet" />

      {game ? (
        <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
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
              <p className="text-xl font-black text-white">
                {homeTeam?.name || "Home"}
              </p>
            </div>
          </div>

          <div className="text-center">
            {game.status === "completed" ? (
              <p className="rounded-2xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 text-2xl font-black text-white">
                {game.home_score} - {game.away_score}
              </p>
            ) : (
              <p className="rounded-2xl border border-[#A51C30]/30 bg-black/20 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-100">
                VS
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 md:justify-end">
            <div className="md:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                Away
              </p>
              <p className="text-xl font-black text-white">
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
      ) : (
        <p className="text-red-100/60">Game not found.</p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InfoBox label="Pick" value={pickedTeam?.name || bet.side} gold />
        <InfoBox label="Amount" value={`${bet.amount} 🦏`} />
        <InfoBox label="Odds" value={`${Number(bet.odds || 0).toFixed(2)}x`} />
        <InfoBox label="Potential Payout" value={`${bet.potential_payout} 🦏`} green />
      </div>

      {game?.scheduled_at && (
        <p className="mt-4 text-sm text-red-100/55">
          Game time: {formatLeagueDateTime(game.scheduled_at)}
        </p>
      )}
    </article>
  );
}

function FuturesBetCard({ bet }: { bet: any }) {
  const market = Array.isArray(bet.market) ? bet.market[0] : bet.market;
  const option = Array.isArray(bet.option) ? bet.option[0] : bet.option;
  const team = normalizeTeam(option?.team);

  return (
    <article className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30">
      <BetHeader bet={bet} label="Futures bet" />

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C4963E]">
            {market?.title || "Futures Market"}
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            {option?.label || "Unknown pick"}
          </h3>

          {market?.description && (
            <p className="mt-2 text-sm leading-6 text-red-100/60">
              {market.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
          <TeamLogo
            logoUrl={team?.logo_url || null}
            teamName={option?.label || "Team"}
            league={team?.league || "competitive"}
            size="sm"
          />

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
              Pick
            </p>
            <p className="font-black text-white">
              {option?.label || "Unknown"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InfoBox label="Market" value={market?.title || "Futures"} gold />
        <InfoBox label="Amount" value={`${bet.amount} 🦏`} />
        <InfoBox label="Odds" value={`${Number(bet.odds || 0).toFixed(2)}x`} />
        <InfoBox label="Potential Payout" value={`${bet.potential_payout} 🦏`} green />
      </div>
    </article>
  );
}

function BetHeader({ bet, label }: { bet: any; label: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#F3EEE6]">
          {label}
        </span>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${statusClass(
            bet.status
          )}`}
        >
          {statusLabel(bet.status)}
        </span>
      </div>

      <p className="text-sm text-red-100/60">
        Placed {new Date(bet.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  gold = false,
  green = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
  green?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        green
          ? "border-green-500/20 bg-green-500/10"
          : gold
            ? "border-[#C4963E]/25 bg-[#C4963E]/10"
            : "border-[#A51C30]/25 bg-black/25"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.16em] ${
          green ? "text-green-300" : gold ? "text-[#F3EEE6]" : "text-red-100/50"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 font-black text-white">
        {value}
      </p>
    </div>
  );
}