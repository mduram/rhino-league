"use client";

import { useEffect, useState } from "react";

export default function AdminBettingClient() {
  const [adminToken, setAdminToken] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");
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

  return (
    <div className="grid gap-6">
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
                {result.settled ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 p-5">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
                Rhino Coins Paid Out
              </p>

              <p className="mt-2 text-4xl font-black text-white">
                {result.paidOut ?? 0} 🦏
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