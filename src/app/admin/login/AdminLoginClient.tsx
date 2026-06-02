"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLoginClient() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not log in.");
      return;
    }

    localStorage.setItem("rhino_admin_token", data.token);
    setIsLoggedIn(true);
    setPassword("");
    setMessage("Logged in.");
  }

  function logout() {
    localStorage.removeItem("rhino_admin_token");
    setIsLoggedIn(false);
    setMessage("Logged out.");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-orange-400">
          Rhino League Admin
        </p>

        <h1 className="mb-8 text-4xl font-black">Admin Login</h1>

        <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">
          <form onSubmit={login} className="grid gap-4">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600">
              Log in
            </button>
          </form>

          <button
            onClick={logout}
            className="mt-4 rounded-xl border border-white/10 px-5 py-3 font-black text-neutral-300 hover:bg-white/10"
          >
            Log out this browser
          </button>

          {message && <p className="mt-4 text-orange-300">{message}</p>}

          {isLoggedIn && (
            <div className="mt-6 flex gap-3">
              <Link
                href="/admin"
                className="rounded-xl bg-white/10 px-4 py-2 font-black text-white hover:bg-white/20"
              >
                Go to Admin
              </Link>

              <Link
                href="/admin/scheduler"
                className="rounded-xl bg-white/10 px-4 py-2 font-black text-white hover:bg-white/20"
              >
                Go to Scheduler
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}