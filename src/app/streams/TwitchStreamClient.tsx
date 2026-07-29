"use client";

import { useEffect, useRef } from "react";

const TWITCH_CHANNEL_URL = "https://www.twitch.tv/harvardrhinocup";

export default function TwitchStreamClient() {
  const playerRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const parent = window.location.hostname || "localhost";
    const query = new URLSearchParams({
      channel: "harvardrhinocup",
      parent,
      muted: "true",
    });

    if (playerRef.current) {
      playerRef.current.src = `https://player.twitch.tv/?${query.toString()}`;
    }
  }, []);

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#9146FF]/35 bg-[#1E102B]/95 p-6 shadow-2xl shadow-black/35 md:p-8">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#9146FF]/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C7A7FF]">
              Harvard Rhino Cup
            </p>
            <h2 className="mt-2 text-4xl font-black text-white md:text-6xl">
              The court, live.
            </h2>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-white/60">
              When the channel is live, the game appears below. Follow the
              channel on Twitch so you never miss a playoff stream.
            </p>
          </div>

          <a
            href={TWITCH_CHANNEL_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#9146FF] px-6 py-3 text-center font-black text-white shadow-lg shadow-[#9146FF]/20 transition hover:bg-[#772CE8]"
          >
            Follow on Twitch ↗
          </a>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#9146FF]/30 bg-black shadow-2xl shadow-black/45">
        <div className="aspect-video w-full">
          <iframe
            ref={playerRef}
            src="about:blank"
            title="Harvard Rhino Cup Twitch stream"
            allowFullScreen
            allow="autoplay; fullscreen"
            className="h-full w-full border-0"
          />
        </div>
      </section>

      <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/55">
        If Twitch blocks the embedded player in your browser, use the “Follow on
        Twitch” button above to open the channel directly.
      </p>
    </div>
  );
}
