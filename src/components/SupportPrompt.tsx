"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "rhino_support_prompt_dismissed_v1";

export default function SupportPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);

    if (!dismissed) {
      const timer = window.setTimeout(() => {
        setIsVisible(true);
      }, 700);

      return () => window.clearTimeout(timer);
    }
  }, []);

  function closePrompt() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-xl">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#C4963E]/35 bg-[#230B12]/95 p-5 text-white shadow-2xl shadow-black/60 backdrop-blur">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#C4963E]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#A51C30]/35 blur-3xl" />

        <div className="relative">
          <button
            type="button"
            onClick={closePrompt}
            className="absolute right-0 top-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-black text-red-100/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Close support prompt"
          >
            ✕
          </button>

          <p className="pr-12 text-sm font-black uppercase tracking-[0.22em] text-[#C4963E]">
            Support the league
          </p>

          <h2 className="mt-2 pr-10 text-2xl font-black text-white">
            Help keep Rhino League running 🦏
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-6 text-red-100/75">
            Donations help cover website hosting, court supplies, safe equipment,
            and commissioner survival. No Rhino Coins, standings points, or
            playoff advantages are given for donating.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/donate"
              onClick={closePrompt}
              className="rounded-full bg-[#C4963E] px-5 py-3 text-sm font-black text-[#16070B] shadow-lg shadow-[#C4963E]/20 transition hover:bg-[#D7AA4A]"
            >
              Support the Rhino League
            </Link>

            <button
              type="button"
              onClick={closePrompt}
              className="rounded-full border border-[#F3EEE6]/20 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}