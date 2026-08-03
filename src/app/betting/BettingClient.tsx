"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import GameCard from "@/components/GameCard";
import TeamLogo from "@/components/TeamLogo";
import { formatLeagueDateTime } from "@/lib/leagueTime";
import {
  isPlayoffFuturesSlug,
  isRegularSeasonFuturesSlug,
} from "@/lib/seasonPhase";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function isBettingClosed(game: any) {
  if (!game.scheduled_at) return true;
  return Date.now() >= new Date(game.scheduled_at).getTime();
}

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

export default function BettingClient() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [games, setGames] = useState<any[]>([]);
  const [marketsByGameId, setMarketsByGameId] = useState<Record<string, any>>(
    {}
  );

  const [futuresMarkets, setFuturesMarkets] = useState<any[]>([]);
  const [playoffGames, setPlayoffGames] = useState<any[]>([]);
  const [playoffMarketsByGameId, setPlayoffMarketsByGameId] = useState<
    Record<string, any>
  >({});
  const [playoffBettingOpen, setPlayoffBettingOpen] = useState(false);
  const [playoffSchedulePublished, setPlayoffSchedulePublished] =
    useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [message, setMessage] = useState("");
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [futuresAmounts, setFuturesAmounts] = useState<Record<string, string>>(
    {}
  );
  const [playoffAmounts, setPlayoffAmounts] = useState<Record<string, string>>(
    {}
  );

  const [placingBetKey, setPlacingBetKey] = useState<string | null>(null);
  const [placingFuturesKey, setPlacingFuturesKey] = useState<string | null>(
    null
  );
  const [placingPlayoffKey, setPlacingPlayoffKey] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(true);

  const scheduledGames = useMemo(() => {
    return games.filter((game) => game.status === "scheduled");
  }, [games]);

  const playoffFutures = useMemo(
    () =>
      futuresMarkets.filter((market) => isPlayoffFuturesSlug(market.slug)),
    [futuresMarkets]
  );

  const closedRegularSeasonFutures = useMemo(
    () =>
      futuresMarkets.filter((market) =>
        isRegularSeasonFuturesSlug(market.slug)
      ),
    [futuresMarkets]
  );

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);

      await Promise.all([
        loadGameMarkets(),
        loadFuturesMarkets(),
        loadPlayoffMarkets(),
      ]);

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

  async function loadGameMarkets() {
    const res = await fetch("/api/betting/markets", {
      cache: "no-store",
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load game betting markets.");
      return;
    }

    setGames(data.games || []);
    setMarketsByGameId(data.marketsByGameId || {});
  }

  async function loadFuturesMarkets() {
    const res = await fetch("/api/futures/markets", {
      cache: "no-store",
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load futures markets.");
      return;
    }

    setFuturesMarkets(data.markets || []);
  }

  async function loadPlayoffMarkets() {
    const res = await fetch("/api/playoff-betting/markets", {
      cache: "no-store",
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not load playoff markets.");
      return;
    }

    setPlayoffGames(data.games || []);
    setPlayoffMarketsByGameId(data.marketsByGameId || {});
    setPlayoffBettingOpen(Boolean(data.bettingOpen));
    setPlayoffSchedulePublished(Boolean(data.schedulePublished));
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
      setMessage(data.error || "Could not load profile.");
      return;
    }

    setProfile(data.profile);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      data.session
        ? "Account created. You got 100 Rhino Coins."
        : "Account created."
    );

    if (data.session) {
      setSession(data.session);
      await loadMe(data.session.access_token);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setSession(data.session);
    await loadMe(data.session.access_token);
    setMessage("Logged in.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setMessage("Logged out.");
  }

  async function placeBet(gameId: string, side: "home" | "away") {
    if (!session) {
      setMessage("Log in first.");
      return;
    }

    const amount = Number(betAmounts[gameId] || 0);

    if (!amount || amount <= 0) {
      setMessage("Enter a Rhino Coin amount first.");
      return;
    }

    setPlacingBetKey(`${gameId}-${side}`);
    setMessage("");

    const res = await fetch("/api/betting/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        gameId,
        side,
        amount,
      }),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || `Could not place bet. Status: ${res.status}`);
      setPlacingBetKey(null);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      rhino_coins: data.rhinoCoins,
    }));

    setBetAmounts((current) => ({
      ...current,
      [gameId]: "",
    }));

    await loadGameMarkets();

    setMessage("Rhino Coin pick placed.");
    setPlacingBetKey(null);
  }

  async function placeFuturesBet(marketId: string, optionId: string) {
    if (!session) {
      setMessage("Log in first.");
      return;
    }

    const amount = Number(futuresAmounts[marketId] || 0);

    if (!amount || amount <= 0) {
      setMessage("Enter a Rhino Coin amount first.");
      return;
    }

    setPlacingFuturesKey(`${marketId}-${optionId}`);
    setMessage("");

    const res = await fetch("/api/futures/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        marketId,
        optionId,
        amount,
      }),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(
        data.error || `Could not place futures pick. Status: ${res.status}`
      );
      setPlacingFuturesKey(null);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      rhino_coins: data.rhinoCoins,
    }));

    setFuturesAmounts((current) => ({
      ...current,
      [marketId]: "",
    }));

    await loadFuturesMarkets();

    setMessage("Futures pick placed.");
    setPlacingFuturesKey(null);
  }

  async function placePlayoffBet(gameId: string, side: "home" | "away") {
    if (!session) {
      setMessage("Log in first.");
      return;
    }

    const amount = Number(playoffAmounts[gameId] || 0);
    if (!amount || amount <= 0) {
      setMessage("Enter a Rhino Coin amount first.");
      return;
    }

    setPlacingPlayoffKey(`${gameId}-${side}`);
    setMessage("");

    const res = await fetch("/api/playoff-betting/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ gameId, side, amount }),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      setMessage(data.error || "Could not place playoff pick.");
      setPlacingPlayoffKey(null);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      rhino_coins: data.rhinoCoins,
    }));
    setPlayoffAmounts((current) => ({ ...current, [gameId]: "" }));
    await loadPlayoffMarkets();
    setMessage("Playoff pick placed.");
    setPlacingPlayoffKey(null);
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4963E]/30 bg-[#1A0F08]/90 p-6 text-red-100/70">
        Loading betting markets...
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="playoff-grid relative overflow-hidden rounded-3xl border border-[#C4963E]/30 bg-[#1A0F08]/95 p-6 shadow-2xl shadow-black/30">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C4963E]/14 blur-3xl" />
        <div className="relative">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
          Rhino Coins · Playoff edition
        </p>

        <h2 className="text-3xl font-black text-white">
          Predict the road to the final
        </h2>

        <p className="mt-3 max-w-3xl text-white/65">
          Everyone starts with 100 Rhino Coins. Regular-season futures are now
          closed, World Cup betting has retired, and confirmed playoff game
          markets are live. Rhino Coins are fake, non-cash, and just for league
          chaos.
        </p>

        <p className="mt-3 max-w-3xl rounded-2xl border border-[#A51C30]/35 bg-[#A51C30]/12 p-4 text-sm leading-6 text-red-100/75">
          {playoffBettingOpen
            ? "The official playoff bracket is live, confirmed game markets are open below, and champion and runner-up futures are available."
            : "Playoff game markets open after the official bracket is released. Champion and runner-up futures are available below."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/my-bets"
            className="rounded-full bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#B92138]"
          >
            My Bets
          </Link>

          <Link
            href="/leaderboard"
            className="rounded-full border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
          >
            Rhino Leaderboard
          </Link>
        </div>

        {profile && (
          <div className="mt-5 rounded-2xl border border-[#C4963E]/30 bg-black/25 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C4963E]">
              Your balance
            </p>

            <p className="mt-2 text-5xl font-black text-white">
              {profile.rhino_coins} 🦏
            </p>
          </div>
        )}
        </div>
      </section>

      {!session ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={signIn}
            className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/30"
          >
            <h2 className="text-2xl font-black text-white">
              Log in
            </h2>

            <div className="mt-5 grid gap-3">
              <input
                className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button className="rounded-xl bg-[#8B5A1F] px-5 py-3 font-black text-white transition hover:bg-[#A66D28]">
                Log In
              </button>
            </div>
          </form>

          <form
            onSubmit={signUp}
            className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/30"
          >
            <h2 className="text-2xl font-black text-white">
              Create account
            </h2>

            <div className="mt-5 grid gap-3">
              <input
                className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <input
                className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button className="rounded-xl bg-[#C4963E] px-5 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A]">
                Create Account + Get 100 🦏
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5">
          <p className="text-red-100/70">
            Logged in as{" "}
            <span className="font-black text-white">
              {session.user.email}
            </span>
          </p>

          <button
            onClick={signOut}
            className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-5 py-3 font-black text-[#F3EEE6] hover:bg-[#C4963E]/20"
          >
            Log out
          </button>
        </section>
      )}

      {message && (
        <p className="rounded-2xl border border-[#C4963E]/30 bg-[#C4963E]/15 p-4 text-[#F3EEE6]">
          {message}
        </p>
      )}

      <PlayoffMarketsSection
        games={playoffGames}
        marketsByGameId={playoffMarketsByGameId}
        schedulePublished={playoffSchedulePublished}
        bettingOpen={playoffBettingOpen}
        session={session}
        amounts={playoffAmounts}
        setAmount={(gameId, value) =>
          setPlayoffAmounts((current) => ({
            ...current,
            [gameId]: value,
          }))
        }
        placingKey={placingPlayoffKey}
        placeBet={placePlayoffBet}
      />

      <section>
        <h2 className="mb-4 text-3xl font-black text-[#F3EEE6]">
          Playoff Futures
        </h2>

        <p className="mb-5 max-w-3xl text-red-100/65">
          Pick the 2026 champion or the team that finishes second. Odds update
          with Rhino Coin activity and team performance, and both markets close
          when the first playoff game begins.
        </p>

        <div className="grid gap-4">
          {playoffFutures.map((market) => (
            <FuturesMarketDropdown
              key={market.id}
              market={market}
              session={session}
              amount={futuresAmounts[market.id] || ""}
              setAmount={(value) =>
                setFuturesAmounts((current) => ({
                  ...current,
                  [market.id]: value,
                }))
              }
              placeFuturesBet={placeFuturesBet}
              placingFuturesKey={placingFuturesKey}
            />
          ))}

          {playoffFutures.length === 0 && (
            <p className="rounded-2xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 text-red-100/60">
              No playoff futures market is available yet.
            </p>
          )}

          {closedRegularSeasonFutures.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Closed markets
              </p>
              <p className="mt-2 text-lg font-black text-white">
                Regular-season futures are closed
              </p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Top-of-table and bottom-of-table picks are frozen while final
                results are confirmed. Existing picks remain in My Bets.
              </p>
            </div>
          )}
        </div>
      </section>

      {scheduledGames.length > 0 && (
        <section>
          <h2 className="mb-4 text-3xl font-black text-[#F3EEE6]">
            Remaining Regular-Season Games
          </h2>

        <div className="grid gap-6">
          {scheduledGames.map((game) => {
            const market = marketsByGameId[game.id];
            const homeTeam = normalizeTeam(game.home_team);
            const awayTeam = normalizeTeam(game.away_team);
            const closed = isBettingClosed(game);

            return (
              <div
                key={game.id}
                className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30"
              >
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C4963E]">
                      Game
                    </p>

                    <p className="mt-1 text-xl font-black text-white">
                      {homeTeam?.name} vs {awayTeam?.name}
                    </p>

                    <p className="mt-1 text-sm text-red-100/60">
                      {formatLeagueDateTime(game.scheduled_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                      Market
                    </p>

                    <p className="mt-1 text-2xl font-black text-white">
                      {market?.totalMarket || 0} 🦏
                    </p>

                    <p className="text-sm text-red-100/60">
                      {market?.totalBetCount || 0} bet
                      {(market?.totalBetCount || 0) === 1 ? "" : "s"} placed
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      closed
                        ? "border-red-500/25 bg-red-500/10"
                        : "border-green-500/25 bg-green-500/10"
                    }`}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white">
                      Status
                    </p>

                    <p className="mt-1 text-lg font-black text-white">
                      {closed ? "Closed" : "Open"}
                    </p>

                    <p className="text-sm text-red-100/60">
                      Closes at game start
                    </p>
                  </div>
                </div>

                <GameCard game={game} showPoll />

                <div className="mt-5 rounded-2xl border border-[#C4963E]/25 bg-black/20 p-4">
                  <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="rounded-2xl border border-[#A51C30]/25 bg-[#A51C30]/10 p-4">
                      <p className="font-black text-white">
                        {homeTeam?.name}
                      </p>

                      <p className="mt-1 text-sm text-red-100/60">
                        Odds: {market?.homeOdds || 2.0}x ·{" "}
                        {market?.homeAmount || 0} 🦏 ·{" "}
                        {market?.homeBetCount || 0} bets
                      </p>

                      <button
                        disabled={
                          !session ||
                          closed ||
                          placingBetKey === `${game.id}-home`
                        }
                        onClick={() => placeBet(game.id, "home")}
                        className="mt-3 w-full rounded-xl bg-[#A51C30] px-4 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
                      >
                        Pick {homeTeam?.name}
                      </button>
                    </div>

                    <div className="text-center text-xl font-black text-[#F3EEE6]">
                      VS
                    </div>

                    <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
                      <p className="font-black text-white">
                        {awayTeam?.name}
                      </p>

                      <p className="mt-1 text-sm text-red-100/60">
                        Odds: {market?.awayOdds || 2.0}x ·{" "}
                        {market?.awayAmount || 0} 🦏 ·{" "}
                        {market?.awayBetCount || 0} bets
                      </p>

                      <button
                        disabled={
                          !session ||
                          closed ||
                          placingBetKey === `${game.id}-away`
                        }
                        onClick={() => placeBet(game.id, "away")}
                        className="mt-3 w-full rounded-xl bg-[#C4963E] px-4 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
                      >
                        Pick {awayTeam?.name}
                      </button>
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-red-100/70">
                      Rhino Coins to place
                    </span>

                    <input
                      className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                      type="number"
                      min="1"
                      placeholder="Example: 10"
                      value={betAmounts[game.id] || ""}
                      onChange={(e) =>
                        setBetAmounts((current) => ({
                          ...current,
                          [game.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}

          </div>
        </section>
      )}
    </div>
  );
}

function PlayoffMarketsSection({
  games,
  marketsByGameId,
  schedulePublished,
  bettingOpen,
  session,
  amounts,
  setAmount,
  placingKey,
  placeBet,
}: {
  games: any[];
  marketsByGameId: Record<string, any>;
  schedulePublished: boolean;
  bettingOpen: boolean;
  session: any;
  amounts: Record<string, string>;
  setAmount: (gameId: string, value: string) => void;
  placingKey: string | null;
  placeBet: (gameId: string, side: "home" | "away") => void;
}) {
  if (!schedulePublished) {
    return (
      <section className="playoff-grid relative overflow-hidden rounded-[2rem] border border-[#C4963E]/25 bg-[#C4963E]/[0.07] p-6 md:p-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C4963E]/14 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C4963E]">
              Playoff game markets · Locked
            </p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
              Markets open with the official bracket
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/60">
              The betting system is ready, but no playoff game can accept picks
              before the official schedule is published and both teams are
              confirmed.
            </p>
          </div>
          <Link
            href="/playoffs"
            className="rounded-full border border-[#C4963E]/35 bg-[#C4963E]/10 px-5 py-3 text-center font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
          >
            Try Team Paths →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C4963E]">
            Playoff game markets
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">
            Pick the next winner
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Odds blend matchup poll votes with Rhino Coin market activity.
          </p>
        </div>
        <span
          className={`rounded-full border px-4 py-2 text-sm font-black ${
            bettingOpen
              ? "border-[#C4963E]/35 bg-[#C4963E]/10 text-[#C4963E]"
              : "border-white/10 bg-white/[0.05] text-white/50"
          }`}
        >
          {bettingOpen ? "Open" : "Awaiting commissioner release"}
        </span>
      </div>

      <div className="grid gap-5">
        {games.map((game) => {
          const homeTeam = normalizeTeam(game.home_team);
          const awayTeam = normalizeTeam(game.away_team);
          const market = marketsByGameId[game.id];
          const closed = !bettingOpen || isBettingClosed(game);

          return (
            <article
              key={game.id}
              className="rounded-3xl border border-[#C4963E]/20 bg-[#230B12]/90 p-5 shadow-xl shadow-black/25"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C4963E]">
                    G{game.game_number} · {game.round_label}
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    {formatLeagueDateTime(game.scheduled_at)}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-white/55">
                  {market?.totalMarket || 0} 🦏 in market
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  { side: "home" as const, team: homeTeam },
                  { side: "away" as const, team: awayTeam },
                ].map(({ side, team }) => (
                  <div
                    key={side}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo
                        logoUrl={team?.logo_url || null}
                        teamName={team?.name || side}
                        league={team?.league || "competitive"}
                        size="sm"
                      />
                      <div>
                        <p className="font-black text-white">
                          {team?.name || "TBD"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {Number(
                            side === "home"
                              ? market?.homeOdds || 2
                              : market?.awayOdds || 2
                          ).toFixed(2)}x odds
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={
                        !session ||
                        closed ||
                        placingKey === `${game.id}-${side}`
                      }
                      onClick={() => placeBet(game.id, side)}
                      className="mt-4 w-full rounded-xl bg-[#A51C30] px-4 py-3 font-black text-white transition hover:bg-[#B92138] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Pick {team?.name || side}
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-4 grid gap-2">
                <span className="text-sm font-bold text-white/60">
                  Rhino Coins to place
                </span>
                <input
                  type="number"
                  min="1"
                  disabled={closed}
                  value={amounts[game.id] || ""}
                  onChange={(event) => setAmount(game.id, event.target.value)}
                  placeholder="Example: 10"
                  className="rounded-xl border border-[#C4963E]/20 bg-black/25 px-4 py-3 text-white placeholder:text-white/30 disabled:opacity-45"
                />
              </label>
            </article>
          );
        })}

        {games.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/55">
            No confirmed playoff matchups are ready for betting yet.
          </p>
        )}
      </div>
    </section>
  );
}

function FuturesMarketDropdown({
  market,
  session,
  amount,
  setAmount,
  placeFuturesBet,
  placingFuturesKey,
}: {
  market: any;
  session: any;
  amount: string;
  setAmount: (value: string) => void;
  placeFuturesBet: (marketId: string, optionId: string) => void;
  placingFuturesKey: string | null;
}) {
  const sortedOptions = [...(market.options || [])].sort((a, b) => {
    const aOdds = Number(a.calculated?.odds || a.odds || 999);
    const bOdds = Number(b.calculated?.odds || b.odds || 999);
    return aOdds - bOdds;
  });

  const favorite = sortedOptions[0];

  return (
    <details className="group rounded-3xl border border-[#C4963E]/30 bg-[#1A0F08]/95 shadow-2xl shadow-black/30">
      <summary className="cursor-pointer list-none p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C4963E]">
              Futures Market
            </p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {market.title}
            </h3>

            {market.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/65">
                {market.description}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                Market
              </p>

              <p className="mt-1 text-2xl font-black text-white">
                {market.totalMarket || 0} 🦏
              </p>
            </div>

            <div className="rounded-2xl border border-[#C4963E]/25 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                Bets
              </p>

              <p className="mt-1 text-2xl font-black text-white">
                {market.totalBetCount || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-[#C4963E]/25 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
                Favorite
              </p>

              <p className="mt-1 truncate text-sm font-black text-white">
                {favorite?.label || "None yet"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm font-black text-[#F3EEE6]">
          <span className="group-open:hidden">Open market ▼</span>
          <span className="hidden group-open:inline">Close market ▲</span>
        </p>
      </summary>

      <div className="border-t border-[#C4963E]/20 p-5">
        <label className="mb-5 grid gap-2">
          <span className="text-sm font-bold text-red-100/70">
            Rhino Coins to place in this market
          </span>

          <input
            className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
            type="number"
            min="1"
            placeholder="Example: 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedOptions.map((option: any) => {
            const team = normalizeTeam(option.team);
            const odds = Number(option.calculated?.odds || option.odds || 10);
            const optionAmount = Number(option.calculated?.amount || 0);
            const optionBetCount = Number(option.calculated?.betCount || 0);
            const pollSignal = Number(option.calculated?.pollSignal || 0);
            const historicalSignal = Number(
              option.calculated?.historicalSignal || 0
            );
            const key = `${market.id}-${option.id}`;

            return (
              <div
                key={option.id}
                className="rounded-2xl border border-[#C4963E]/20 bg-black/25 p-4"
              >
                <div className="flex items-center gap-3">
                  <TeamLogo
                    logoUrl={team?.logo_url || null}
                    teamName={option.label}
                    league={team?.league || "competitive"}
                    size="sm"
                  />

                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {option.label}
                    </p>

                    <p className="text-sm text-red-100/55">
                      Odds: {odds.toFixed(2)}x · {optionAmount} 🦏 ·{" "}
                      {optionBetCount} bets
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-red-100/55">
                  <p>Poll signal: {pollSignal}</p>
                  <p>Historical signal: {historicalSignal}</p>
                </div>

                <button
                  disabled={!session || placingFuturesKey === key}
                  onClick={() => placeFuturesBet(market.id, option.id)}
                  className="mt-4 w-full rounded-xl bg-[#C4963E] px-4 py-3 font-black text-[#16070B] transition hover:bg-[#D7AA4A] disabled:opacity-50"
                >
                  Pick {option.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
