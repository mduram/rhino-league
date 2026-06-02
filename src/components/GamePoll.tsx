"use client";

import { useState } from "react";

export default function GamePoll({
  gameId,
  homeTeamName,
  awayTeamName,
  initialHomeVotes,
  initialAwayVotes,
}: {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHomeVotes: number;
  initialAwayVotes: number;
}) {
  const [homeVotes, setHomeVotes] = useState(initialHomeVotes || 0);
  const [awayVotes, setAwayVotes] = useState(initialAwayVotes || 0);
  const [message, setMessage] = useState("");
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = homeVotes + awayVotes;

  const homePercent =
    totalVotes === 0 ? 0 : Math.round((homeVotes / totalVotes) * 100);

  const awayPercent =
    totalVotes === 0 ? 0 : Math.round((awayVotes / totalVotes) * 100);

  function getVoteKey() {
    return `rhino_vote_${encodeURIComponent(gameId)}`;
  }

  function hasAlreadyVoted() {
    try {
      return window.localStorage.getItem(getVoteKey()) !== null;
    } catch {
      return false;
    }
  }

  function saveVoteLocally(side: "home" | "away") {
    try {
      window.localStorage.setItem(getVoteKey(), side);
    } catch {
      // If localStorage fails, don't crash the site.
      // The vote will still be counted server-side.
    }
  }

  async function vote(side: "home" | "away") {
    setIsVoting(true);
    setMessage("");

    try {
      if (hasAlreadyVoted()) {
        setMessage("You already voted on this game.");
        setIsVoting(false);
        return;
      }

      const res = await fetch("/api/games/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId, side }),
      });

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setMessage(data?.error || `Could not vote. Status: ${res.status}`);
        setIsVoting(false);
        return;
      }

      setHomeVotes(Number(data.home_votes || 0));
      setAwayVotes(Number(data.away_votes || 0));
      saveVoteLocally(side);

      setMessage("Vote counted.");
      setIsVoting(false);
    } catch (err: any) {
      setMessage(err?.message || "Could not vote.");
      setIsVoting(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-300">
        Who wins?
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => vote("home")}
          disabled={isVoting}
          className="rounded-xl bg-white/[0.08] px-4 py-3 text-left font-black text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {homeTeamName}
        </button>

        <button
          onClick={() => vote("away")}
          disabled={isVoting}
          className="rounded-xl bg-white/[0.08] px-4 py-3 text-left font-black text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {awayTeamName}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs text-neutral-400">
            <span>{homeTeamName}</span>
            <span>
              {homeVotes} votes · {homePercent}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${homePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs text-neutral-400">
            <span>{awayTeamName}</span>
            <span>
              {awayVotes} votes · {awayPercent}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-orange-300"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-neutral-400">{message}</p>}
    </div>
  );
}