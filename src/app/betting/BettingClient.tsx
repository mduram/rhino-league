"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import GameCard from "@/components/GameCard";
import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function isBettingClosed(game: any) {
  if (!game.scheduled_at) return true;
  return Date.now() >= new Date(game.scheduled_at).getTime();
}

export default function BettingClient() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [marketsByGameId, setMarketsByGameId] = useState<Record<string, any>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [placingBetKey, setPlacingBetKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const scheduledGames = useMemo(() => {
    return games.filter((game) => game.status === "scheduled");
  }, [games]);

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
    const res = await fetch("/api/betting/markets", {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not load betting markets.");
      return;
    }

    setGames(data.games || []);
    setMarketsByGameId(data.marketsByGameId || {});
  }

  async function loadMe(accessToken: string) {
    const res = await fetch("/api/betting/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await res.json();

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
        : "Account created"
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

    const data = await res.json();

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

    await loadMarkets();

    setMessage("Rhino Coin pick placed.");
    setPlacingBetKey(null);
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
      <section className="rounded-3xl border border-[#C4963E]/35 bg-[#1A0F08]/95 p-6 shadow-2xl shadow-black/30">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
          Rhino Coins
        </p>

        <h2 className="text-3xl font-black text-white">
          Rhino Coin Predictions
        </h2>

        <p className="mt-3 max-w-3xl text-red-100/75">
          Everyone starts with 100 Rhino Coins. Use them to predict games.
          Betting closes at scheduled game time. Rhino Coins are fake, non-cash,
          and just for league chaos.
        </p>

        <p className="mt-3 max-w-3xl rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-4 text-sm leading-6 text-[#F3EEE6]">
          Odds are intentionally conservative early on. A small number of poll
          votes or bets will only move the odds slightly until there is more
          market activity.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/my-bets"
            className="rounded-full bg-[#8B5A1F] px-5 py-3 font-black text-white transition hover:bg-[#A66D28]"
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

      <section>
        <h2 className="mb-4 text-3xl font-black text-[#F3EEE6]">
          Open Markets
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

          {scheduledGames.length === 0 && (
            <p className="rounded-2xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 text-red-100/60">
              No scheduled games available for Rhino Coin predictions.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}