"use client";

import { useEffect, useState } from "react";

export default function GamePoll({
  gameId,
  homeTeamName,
  awayTeamName,
  initialHomeVotes,
  initialAwayVotes,
  gameType = "regular",
}: {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHomeVotes: number;
  initialAwayVotes: number;
  gameType?: "regular" | "playoff";
}) {
  const [homeVotes, setHomeVotes] = useState(initialHomeVotes || 0);
  const [awayVotes, setAwayVotes] = useState(initialAwayVotes || 0);
  const [message, setMessage] = useState("");
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = homeVotes + awayVotes;

  useEffect(() => {
    if (gameType !== "playoff") return;

    let active = true;
    const params = new URLSearchParams({ gameId, gameType });

    fetch(`/api/games/vote?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => ({ res, data: await res.json() }))
      .then(({ res, data }) => {
        if (!active || !res.ok) return;
        setHomeVotes(Number(data.home_votes || 0));
        setAwayVotes(Number(data.away_votes || 0));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [gameId, gameType]);

  const homePercent =
    totalVotes === 0 ? 0 : Math.round((homeVotes / totalVotes) * 100);

  const awayPercent =
    totalVotes === 0 ? 0 : Math.round((awayVotes / totalVotes) * 100);

  async function vote(side: "home" | "away") {
    setIsVoting(true);
    setMessage("");

    const alreadyVotedKey = `rhino_vote_${gameType}_${gameId}`;

    if (localStorage.getItem(alreadyVotedKey)) {
      setMessage("You already voted on this game.");
      setIsVoting(false);
      return;
    }

    const res = await fetch("/api/games/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, gameType, side }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not vote.");
      setIsVoting(false);
      return;
    }

    setHomeVotes(data.home_votes);
    setAwayVotes(data.away_votes);
    localStorage.setItem(alreadyVotedKey, side);
    setMessage("Vote counted.");
    setIsVoting(false);
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#A51C30]/25 bg-black/25 p-4">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
        Who wins?
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => vote("home")}
          disabled={isVoting}
          className="rounded-xl bg-white/[0.08] px-4 py-3 text-left font-black text-white transition hover:bg-[#A51C30] disabled:opacity-50"
        >
          {homeTeamName}
        </button>

        <button
          onClick={() => vote("away")}
          disabled={isVoting}
          className="rounded-xl bg-white/[0.08] px-4 py-3 text-left font-black text-white transition hover:bg-[#A51C30] disabled:opacity-50"
        >
          {awayTeamName}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs text-red-100/60">
            <span>{homeTeamName}</span>
            <span>
              {homeVotes} votes · {homePercent}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[#A51C30]"
              style={{ width: `${homePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs text-red-100/60">
            <span>{awayTeamName}</span>
            <span>
              {awayVotes} votes · {awayPercent}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[#C4963E]"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-red-100/60">{message}</p>}
    </div>
  );
}
