"use client";

import { useState } from "react";

export default function PollClient({ poll }: { poll: any }) {
  const [options, setOptions] = useState(poll.poll_options || []);
  const [message, setMessage] = useState("");

  const totalVotes = options.reduce(
    (sum: number, option: any) => sum + option.votes,
    0
  );

  async function vote(optionId: string) {
    setMessage("");

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ optionId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Could not vote");
      return;
    }

    setOptions((current: any[]) =>
      current.map((option) =>
        option.id === optionId
          ? { ...option, votes: option.votes + 1 }
          : option
      )
    );

    setMessage("Vote counted.");
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-5 text-2xl font-black">{poll.question}</h2>

      <div className="grid gap-4">
        {options.map((option: any) => {
          const percent =
            totalVotes === 0
              ? 0
              : Math.round((option.votes / totalVotes) * 100);

          return (
            <div key={option.id}>
              <button
                onClick={() => vote(option.id)}
                className="w-full rounded-lg bg-orange-500 px-4 py-3 text-left font-bold hover:bg-orange-600"
              >
                {option.label}
              </button>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full bg-orange-400"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="mt-1 text-sm text-neutral-400">
                {option.votes} votes · {percent}%
              </p>
            </div>
          );
        })}
      </div>

      {message && <p className="mt-4 text-orange-400">{message}</p>}
    </div>
  );
}