"use client";

import { useEffect, useState } from "react";

function getCountdownParts(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return [
    { label: "Days", value: Math.floor(totalSeconds / 86_400) },
    {
      label: "Hours",
      value: Math.floor((totalSeconds % 86_400) / 3_600),
    },
    {
      label: "Minutes",
      value: Math.floor((totalSeconds % 3_600) / 60),
    },
    { label: "Seconds", value: totalSeconds % 60 },
  ];
}

export default function SiteShutdownCountdown({
  shutdownAt,
}: {
  shutdownAt: number;
}) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    function tick() {
      const remaining = shutdownAt - Date.now();

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
  }, [shutdownAt]);

  const countdownParts =
    remainingMs === null ? null : getCountdownParts(remainingMs);

  return (
    <div className="mt-9">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#D44B61]">
        Time remaining
      </p>
      <div
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        aria-label="Time remaining until the Rhino League website closes"
      >
        {(countdownParts || [
          { label: "Days", value: null },
          { label: "Hours", value: null },
          { label: "Minutes", value: null },
          { label: "Seconds", value: null },
        ]).map(({ label, value }) => (
          <div
            key={label}
            className="countdown-unit border border-[#731126]/70 bg-[#24040A]/55 px-3 py-5 text-center sm:py-6"
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
    </div>
  );
}
