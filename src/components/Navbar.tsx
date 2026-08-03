"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const primaryLinks = [
  { href: "/playoffs", label: "Playoffs" },
  { href: "/streams", label: "Streams" },
  { href: "/whats-new", label: "What’s New?" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/scores", label: "Scores" },
  { href: "/submit-scores", label: "Submit Scores" },
  { href: "/donate", label: "Support" },
];

const leagueLinks = [
  { href: "/standings", label: "Standings" },
  { href: "/photos", label: "Photos" },
  { href: "/polls", label: "Polls" },
];

const betLinks = [
  { href: "/betting", label: "Rhino Bets" },
  { href: "/my-bets", label: "My Bets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const [betsMenuOpen, setBetsMenuOpen] = useState(false);

  const leagueDropdownRef = useRef<HTMLDivElement | null>(null);
  const betsDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        leagueDropdownRef.current &&
        !leagueDropdownRef.current.contains(target)
      ) {
        setLeagueMenuOpen(false);
      }

      if (
        betsDropdownRef.current &&
        !betsDropdownRef.current.contains(target)
      ) {
        setBetsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLeagueMenuOpen(false);
        setBetsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <nav className="site-nav relative z-50 border-b border-[#A51C30]/25 bg-[#16070B] text-white shadow-xl shadow-black/30 xl:sticky xl:top-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <p className="text-lg font-black leading-none text-white">
            Rhino League
          </p>

          <p className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-[#C4963E]">
            Harvard Volleyball
          </p>
        </Link>

        <div className="hidden items-center gap-2 xl:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-black transition ${
                link.href === "/playoffs"
                  ? "bg-[#C4963E] text-[#16070B] hover:bg-[#D7AA4A]"
                  : link.href === "/streams"
                    ? "nav-streams-pill bg-[#9146FF] text-white shadow-lg shadow-[#9146FF]/20 hover:bg-[#772CE8]"
                    : link.href === "/whats-new"
                      ? "nav-whats-new-pill bg-[#2F80ED] text-white shadow-lg shadow-[#2F80ED]/20 hover:bg-[#2568C2]"
                    : link.href === "/teams"
                      ? "nav-teams-pill bg-[#FF2448] text-white shadow-lg shadow-[#FF2448]/30 hover:bg-[#FF4966]"
                  : "text-red-100/75 hover:bg-[#A51C30]/25 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div ref={leagueDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setLeagueMenuOpen((current) => !current)}
              aria-expanded={leagueMenuOpen}
              aria-haspopup="menu"
              className="whitespace-nowrap rounded-full border border-[#A51C30]/35 bg-[#A51C30]/10 px-3 py-2 text-sm font-black text-red-100/80 transition hover:bg-[#A51C30]/25 hover:text-white"
            >
              League {leagueMenuOpen ? "▲" : "▼"}
            </button>

            {leagueMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[#A51C30]/25 bg-[#230B12] p-2 shadow-2xl shadow-black/50"
              >
                <p className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-red-100/45">
                  Explore the league
                </p>
                {leagueLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setLeagueMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-bold text-red-100/80 hover:bg-[#A51C30]/25 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div ref={betsDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setBetsMenuOpen((current) => !current)}
              aria-expanded={betsMenuOpen}
              aria-haspopup="menu"
              className="whitespace-nowrap rounded-full border border-[#C4963E]/35 bg-[#C4963E]/10 px-3 py-2 text-sm font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              Bets {betsMenuOpen ? "▲" : "▼"}
            </button>

            {betsMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[#C4963E]/25 bg-[#230B12] p-2 shadow-2xl shadow-black/50"
              >
                <p className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#C4963E]">
                  Rhino Coins · just for fun
                </p>

                {betLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setBetsMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-bold text-red-100/80 hover:bg-[#A51C30]/25 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/admin"
            className="whitespace-nowrap rounded-full bg-[#A51C30] px-3 py-2 text-sm font-black text-white shadow-lg shadow-[#A51C30]/25 transition hover:bg-[#7F1524]"
          >
            Admin
          </Link>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <Link
            href="/admin"
            className="rounded-full bg-[#A51C30] px-3 py-2 text-sm font-black text-white"
          >
            Admin
          </Link>
        </div>
      </div>

      <div className="border-t border-[#A51C30]/20 px-4 py-3 xl:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black ${
                link.href === "/playoffs"
                  ? "border-[#C4963E]/40 bg-[#C4963E] text-[#16070B]"
                  : link.href === "/streams"
                    ? "nav-streams-pill border-[#9146FF] bg-[#9146FF] text-white"
                    : link.href === "/whats-new"
                      ? "nav-whats-new-pill border-[#2F80ED] bg-[#2F80ED] text-white"
                    : link.href === "/teams"
                      ? "nav-teams-pill border-[#FF2448] bg-[#FF2448] text-white"
                  : "border-[#A51C30]/25 bg-[#A51C30]/10 text-red-100/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <details className="nav-details rounded-2xl border border-[#A51C30]/25 bg-[#A51C30]/10">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-red-100/85">
              League menu
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-[#A51C30]/20 p-2">
              {leagueLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl bg-black/20 px-3 py-2 text-sm font-bold text-red-100/75"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>

          <details className="nav-details rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-[#F3EEE6]">
              Bets menu
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-[#C4963E]/20 p-2">
              {betLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl bg-black/20 px-3 py-2 text-sm font-bold text-[#F3EEE6]/80"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}
