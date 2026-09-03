"use client";

import { useEffect, useState } from "react";

function getCountdownParts(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return [
    {
      label: "Days",
      value: Math.floor(totalSeconds / 86_400),
    },
    {
      label: "Hours",
      value: Math.floor((totalSeconds % 86_400) / 3_600),
    },
    {
      label: "Minutes",
      value: Math.floor((totalSeconds % 3_600) / 60),
    },
    {
      label: "Seconds",
      value: totalSeconds % 60,
    },
  ];
}

export default function AnnouncementCountdown({
  releaseAt,
}: {
  releaseAt: number;
}) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    function tick() {
      const remaining = releaseAt - Date.now();

      if (remaining <= 0) {
        window.location.reload();
        return;
      }

      setRemainingMs(remaining);
      timer = window.setTimeout(tick, 1000);
    }

    timer = window.setTimeout(tick, 0);

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [releaseAt]);

  const countdownParts =
    remainingMs === null ? null : getCountdownParts(remainingMs);

  return (
    <main className="countdown-site relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-[#EDE8E5] sm:px-8">
      <div aria-hidden className="ominous-grain pointer-events-none fixed inset-0" />

      <section className="countdown-panel relative z-10 w-full max-w-4xl border border-red-950/70 bg-black/80 px-5 py-12 text-center shadow-2xl shadow-black sm:px-10 sm:py-16 lg:px-16">
        <div className="mx-auto flex w-fit items-center gap-3">
          <span
            aria-hidden
            className="omen-pulse h-2.5 w-2.5 rounded-full bg-[#B1122B] shadow-[0_0_18px_rgba(177,18,43,0.95)]"
          />
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#C43A4E] sm:text-sm">
            The Rhino League
          </p>
        </div>

        <h1 className="countdown-title mt-8 font-serif text-4xl font-bold uppercase leading-tight tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl">
          Important announcement coming
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
          Friday, September 4 at 5:00 PM Eastern Time
        </p>

        <div
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
          aria-label="Time remaining until the announcement"
        >
          {(countdownParts || [
            { label: "Days", value: null },
            { label: "Hours", value: null },
            { label: "Minutes", value: null },
            { label: "Seconds", value: null },
          ]).map(({ label, value }) => (
            <div
              key={label}
              className="countdown-unit border border-[#731126]/70 bg-[#24040A]/55 px-3 py-5 sm:py-6"
            >
              <p className="countdown-number font-mono text-4xl font-bold tabular-nums text-[#FFF4F6] sm:text-5xl">
                {value === null ? "--" : String(value).padStart(2, "0")}
              </p>
              <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-red-200/40 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-9 font-mono text-xs uppercase tracking-[0.16em] text-white/30">
          This page will update automatically
        </p>
      </section>
    </main>
  );
}
