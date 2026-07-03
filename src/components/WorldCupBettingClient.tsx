"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatLeagueDateTime } from "@/lib/leagueTime";

type Side = "home" | "draw" | "away";

async function readJsonSafely(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Server returned non-JSON response. Status: ${res.status}.`,
      raw: text.slice(0, 300),
    };
  }
}

function stageLabel(stage: string | null | undefined) {
  if (!stage) return "World Cup";

  return stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isBettingClosed(match: any) {
  if (!match.scheduled_at) return true;

  return Date.now() >= new Date(match.scheduled_at).getTime();
}

function formatOddsUpdatedAt(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatLeagueDateTime(date);
}

export default function WorldCupBettingClient() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [matches, setMatches] = useState<any[]>([]);
  const [marketsByMatchId, setMarketsByMatchId] = useState<
    Record<string, any>
  >({});

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [placingKey, setPlacingKey] = useState<string | null>(null);

  const upcomingMatches = useMemo(() => {
    return matches.filter(
      (match) =>
        match.status === "scheduled" &&
        new Date(match.scheduled_at).getTime() > Date.now()
    );
  }, [matches]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session || null);

      await loadMarkets();

      if (data.session) {
        await loadMe(data.session.access_token);
      }

      setIsLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession || null);

        if (nextSession) {
          await loadMe(nextSession.access_token);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadMarkets() {
    const res = await fetch("/api/world-cup/markets", {
      cache: "no-store",
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load World Cup markets.");
      return;
    }

    setMatches(data.matches || []);
    setMarketsByMatchId(data.marketsByMatchId || {});
  }

  async function loadMe(accessToken: string) {
    const res = await fetch("/api/betting/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load Rhino Coin profile.");
      return;
    }

    setProfile(data.profile);
  }

  async function placeBet(matchId: string, side: Side) {
    if (!session) {
      setMessage("Log in from the Rhino League betting tab first.");
      return;
    }

    const amount = Number(amounts[matchId] || 0);

    if (!amount || amount <= 0) {
      setMessage("Enter a Rhino Coin amount first.");
      return;
    }

    const key = `${matchId}-${side}`;

    setPlacingKey(key);
    setMessage("");

    const res = await fetch("/api/world-cup/place", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },

      body: JSON.stringify({
        matchId,
        side,
        amount,
      }),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(
        data.error || `Could not place World Cup bet. Status: ${res.status}`
      );

      setPlacingKey(null);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      rhino_coins: data.rhinoCoins,
    }));

    setAmounts((current) => ({
      ...current,
      [matchId]: "",
    }));

    await loadMarkets();

    setMessage("World Cup Rhino Coin pick placed.");
    setPlacingKey(null);
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4963E]/25 bg-black/20 p-6 text-red-100/70">
        Loading World Cup betting markets...
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/35 md:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#C4963E]/15 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
            FIFA World Cup
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            World Cup Rhino Bets ⚽
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-red-100/70">
            Use the same Rhino Coin balance to predict World Cup matches. Pick
            the home team, a draw, or the away team. Betting closes
            automatically at kickoff.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-red-100/50">
            Match prices use bookmaker-derived odds when available. Your odds
            are locked when the bet is placed.
          </p>

          {profile && (
            <div className="mt-5 inline-flex rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6]">
              Your balance: {profile.rhino_coins} 🦏
            </div>
          )}

          {!session && (
            <p className="mt-5 rounded-2xl border border-[#A51C30]/25 bg-[#A51C30]/10 p-4 text-red-100/75">
              Log in or create an account in the Rhino League tab first, then
              return here to bet.
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-[#F3EEE6]">
              {message}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
            Upcoming fixtures
          </p>

          <h2 className="mt-1 text-3xl font-black text-white">
            Bet on the World Cup
          </h2>
        </div>

        <div className="grid gap-5">
          {upcomingMatches.map((match) => {
            const market = marketsByMatchId[match.id];
            const closed = isBettingClosed(match);

            return (
              <WorldCupMatchCard
                key={match.id}
                match={match}
                market={market}
                amount={amounts[match.id] || ""}
                setAmount={(value) =>
                  setAmounts((current) => ({
                    ...current,
                    [match.id]: value,
                  }))
                }
                placeBet={placeBet}
                placingKey={placingKey}
                session={session}
                closed={closed}
              />
            );
          })}

          {upcomingMatches.length === 0 && (
            <div className="rounded-3xl border border-[#A51C30]/25 bg-black/20 p-6 text-red-100/60">
              No upcoming World Cup matches are available right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WorldCupMatchCard({
  match,
  market,
  amount,
  setAmount,
  placeBet,
  placingKey,
  session,
  closed,
}: {
  match: any;
  market: any;
  amount: string;
  setAmount: (value: string) => void;
  placeBet: (matchId: string, side: Side) => void;
  placingKey: string | null;
  session: any;
  closed: boolean;
}) {
  const homeKey = `${match.id}-home`;
  const drawKey = `${match.id}-draw`;
  const awayKey = `${match.id}-away`;

  const homeOdds = market?.homeOdds ?? null;
  const drawOdds = market?.drawOdds ?? null;
  const awayOdds = market?.awayOdds ?? null;

  const hasAnyOdds =
    homeOdds !== null || drawOdds !== null || awayOdds !== null;

  const oddsUpdatedLabel = formatOddsUpdatedAt(market?.oddsUpdatedAt);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#C4963E]/25 bg-[#1A0F08]/90 shadow-2xl shadow-black/30">
      <div className="border-b border-[#C4963E]/15 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C4963E]">
              {stageLabel(match.stage)}
            </p>

            <p className="mt-2 text-sm text-red-100/60">
              {formatLeagueDateTime(match.scheduled_at)}
            </p>

            {market?.oddsSource && (
              <p className="mt-2 text-xs leading-5 text-red-100/40">
                Odds source: {market.oddsSource}
              </p>
            )}

            {oddsUpdatedLabel && (
              <p className="mt-1 text-xs leading-5 text-red-100/35">
                Odds updated: {oddsUpdatedLabel}
              </p>
            )}
          </div>

          <div
            className={`rounded-full border px-4 py-2 text-sm font-black ${
              closed
                ? "border-red-400/25 bg-red-500/10 text-red-100"
                : hasAnyOdds
                  ? "border-[#C4963E]/25 bg-[#C4963E]/10 text-[#F3EEE6]"
                  : "border-white/10 bg-white/[0.04] text-red-100/50"
            }`}
          >
            {closed
              ? "Closed"
              : hasAnyOdds
                ? "Open"
                : "Waiting for odds"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3">
        <TeamChoice
          crest={match.home_team_crest}
          name={match.home_team_name}
          label="Home"
          odds={homeOdds}
          amount={market?.homeAmount || 0}
          betCount={market?.homeBetCount || 0}
          disabled={closed || !session || placingKey !== null}
          busy={placingKey === homeKey}
          onClick={() => placeBet(match.id, "home")}
        />

        <TeamChoice
          crest={null}
          name="Draw"
          label="90-minute result"
          odds={drawOdds}
          amount={market?.drawAmount || 0}
          betCount={market?.drawBetCount || 0}
          disabled={closed || !session || placingKey !== null}
          busy={placingKey === drawKey}
          onClick={() => placeBet(match.id, "draw")}
        />

        <TeamChoice
          crest={match.away_team_crest}
          name={match.away_team_name}
          label="Away"
          odds={awayOdds}
          amount={market?.awayAmount || 0}
          betCount={market?.awayBetCount || 0}
          disabled={closed || !session || placingKey !== null}
          busy={placingKey === awayKey}
          onClick={() => placeBet(match.id, "away")}
        />
      </div>

      <div className="border-t border-[#C4963E]/15 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Rhino Coins to place"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
          />

          <div className="flex flex-wrap gap-3 text-sm text-red-100/55">
            <span>Market: {market?.totalMarket || 0} 🦏</span>
            <span>{market?.totalBetCount || 0} bets</span>
          </div>
        </div>

        {!hasAnyOdds && !closed && (
          <p className="mt-3 text-sm leading-6 text-red-100/45">
            Betting is temporarily unavailable for this match until a real
            bookmaker price is available.
          </p>
        )}
      </div>
    </article>
  );
}

function TeamChoice({
  crest,
  name,
  label,
  odds,
  amount,
  betCount,
  disabled,
  busy,
  onClick,
}: {
  crest: string | null;
  name: string;
  label: string;
  odds: number | null;
  amount: number;
  betCount: number;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const oddsAvailable = odds !== null;

  return (
    <div className="rounded-2xl border border-[#C4963E]/20 bg-black/20 p-4 text-center">
      <div className="flex min-h-16 items-center justify-center">
        {crest ? (
          <img
            src={crest}
            alt={name}
            className="h-14 w-14 object-contain"
          />
        ) : (
          <span className="text-4xl">🤝</span>
        )}
      </div>

      <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-red-100/45">
        {label}
      </p>

      <h3 className="mt-1 text-xl font-black text-white">{name}</h3>

      <p className="mt-3 text-sm text-[#F3EEE6]">
        Odds:{" "}
        <span className="font-black">
          {oddsAvailable ? `${Number(odds).toFixed(2)}x` : "Unavailable"}
        </span>
      </p>

      <p className="mt-1 text-xs text-red-100/45">
        {amount} 🦏 · {betCount} bets
      </p>

      <button
        type="button"
        disabled={disabled || !oddsAvailable}
        onClick={onClick}
        className="mt-4 w-full rounded-xl bg-[#C4963E] px-4 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy
          ? "Placing..."
          : oddsAvailable
            ? `Pick ${name}`
            : "Odds unavailable"}
      </button>
    </div>
  );
}