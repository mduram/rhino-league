"use client";

import { useEffect, useState } from "react";

export default function AdminBettingClient() {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [isSettlingBracket, setIsSettlingBracket] = useState(false);
  const [isClosingFutures, setIsClosingFutures] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("rhino_admin_token") || "";
    queueMicrotask(() => setAdminToken(storedToken));
  }, []);

  async function settleBets() {
    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmed = window.confirm(
      "Settle all open Rhino Coin bets for completed games? This will pay out winning bets and mark losing bets as lost."
    );

    if (!confirmed) return;

    setIsSettling(true);

    const res = await fetch("/api/admin/settle-bets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not settle bets. Status: ${res.status}`);
      setResult(data);
      setIsSettling(false);
      return;
    }

    setResult(data);
    setMessage(data.message || "Bets settled.");
    setIsSettling(false);
  }

  async function closeRegularSeasonFutures() {
    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const confirmed = window.confirm(
      "Close top-of-table and bottom-of-table regular-season futures? Existing picks will stay in place for later settlement."
    );
    if (!confirmed) return;

    setIsClosingFutures(true);
    const res = await fetch("/api/admin/futures/close-regular-season", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not close regular-season futures.");
      setResult(data);
      setIsClosingFutures(false);
      return;
    }

    setMessage(data.message || "Regular-season futures closed.");
    setResult(data);
    setIsClosingFutures(false);
  }

  async function settleBracketChallenge() {
    setMessage("");
    setResult(null);

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    if (
      !window.confirm(
        "Settle the Bracket Challenge and pay the full prize pot? This should only run after every playoff result is final."
      )
    ) {
      return;
    }

    setIsSettlingBracket(true);
    const res = await fetch("/api/admin/playoff-bracket-challenge/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not settle the Bracket Challenge.");
      setResult(data);
      setIsSettlingBracket(false);
      return;
    }

    setMessage(data.message || "Bracket Challenge settled.");
    setResult(data);
    setIsSettlingBracket(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-[#C4963E]/25 bg-[#C4963E]/[0.07] p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C4963E]">
          Season handoff
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Close Regular-Season Futures
        </h2>
        <p className="mt-3 max-w-3xl text-white/65">
          This closes the top-of-table and bottom-of-table markets without
          deleting existing picks. Run it after the final regular-season game.
        </p>
        <button
          type="button"
          onClick={closeRegularSeasonFutures}
          disabled={isClosingFutures}
          className="mt-5 rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#B92138] disabled:opacity-50"
        >
          {isClosingFutures ? "Closing Futures…" : "Close Regular-Season Futures"}
        </button>
      </section>

      <section className="rounded-3xl border border-[#1F8A70]/45 bg-[#1F8A70]/10 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#72D8BF]">
          Bracket Challenge
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Score Brackets + Pay the Pot
        </h2>
        <p className="mt-3 max-w-3xl text-red-100/75">
          After every playoff result is final, this scores each submitted
          bracket and pays the full entry pot to the top bracket. Tied leaders
          split the pot.
        </p>
        <button
          type="button"
          onClick={settleBracketChallenge}
          disabled={isSettlingBracket}
          className="mt-5 rounded-xl bg-[#1F8A70] px-5 py-3 font-black text-white transition hover:bg-[#257F6B] disabled:opacity-50"
        >
          {isSettlingBracket
            ? "Settling Bracket Challenge…"
            : "Settle Bracket Challenge"}
        </button>
      </section>

      <section className="rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-6 shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black text-white">
          Settle Completed Games
        </h2>

        <p className="mt-3 text-red-100/75">
          This checks every completed game and settles any open Rhino Coin picks.
          It skips tied games for now. Run this after you approve scores.
        </p>

        {adminToken ? (
          <p className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-green-300">
            Admin mode active.
          </p>
        ) : (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200">
            You are not logged in. Go to /admin/login first.
          </p>
        )}

        <button
          onClick={settleBets}
          disabled={isSettling}
          className="mt-5 rounded-xl bg-[#A51C30] px-5 py-3 font-black text-white transition hover:bg-[#7F1524] disabled:opacity-50"
        >
          {isSettling ? "Settling Bets..." : "Settle Rhino Coin Bets"}
        </button>

        {message && (
          <p className="mt-4 rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/20 p-4 text-red-100">
            {message}
          </p>
        )}
      </section>

      {result && (
        <section className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-white">
            Settlement Result
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-green-300">
                Bets Settled
              </p>

              <p className="mt-2 text-4xl font-black text-white">
                {Number(result.settled || 0) +
                  Number(result.playoffSettled || 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
                Rhino Coins Paid Out
              </p>

              <p className="mt-2 text-4xl font-black text-white">
                {Number(result.paidOut || 0) +
                  Number(result.playoffPaidOut || 0)} 🦏
              </p>
            </div>
          </div>

          <pre className="mt-5 overflow-auto rounded-2xl border border-[#A51C30]/20 bg-black/30 p-4 text-sm text-red-100/70">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
