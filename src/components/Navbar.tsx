"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const primaryLinks = [
  { href: "/schedule", label: "Schedule" },
  { href: "/scores", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/playoffs", label: "Playoffs" },
  { href: "/whats-new", label: "What’s New?" },
  { href: "/submit-scores", label: "Submit Scores" },
  { href: "/donate", label: "Support" },
];

const moreLinks = [
  { href: "/teams", label: "Teams" },
  { href: "/photos", label: "Photos" },
  { href: "/polls", label: "Polls" },
];

const rhinoCoinLinks = [
  { href: "/betting", label: "Rhino Bets" },
  { href: "/my-bets", label: "My Bets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [rhinoMenuOpen, setRhinoMenuOpen] = useState(false);

  const moreDropdownRef = useRef<HTMLDivElement | null>(null);
  const rhinoDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(target)
      ) {
        setMoreMenuOpen(false);
      }

      if (
        rhinoDropdownRef.current &&
        !rhinoDropdownRef.current.contains(target)
      ) {
        setRhinoMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreMenuOpen(false);
        setRhinoMenuOpen(false);
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
    <nav className="sticky top-0 z-50 border-b border-[#A51C30]/25 bg-[#16070B]/95 text-white shadow-xl shadow-black/30 backdrop-blur">
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
                  : "text-red-100/75 hover:bg-[#A51C30]/25 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div ref={moreDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((current) => !current)}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              className="whitespace-nowrap rounded-full border border-[#A51C30]/35 bg-[#A51C30]/10 px-3 py-2 text-sm font-black text-red-100/80 transition hover:bg-[#A51C30]/25 hover:text-white"
            >
              More {moreMenuOpen ? "▲" : "▼"}
            </button>

            {moreMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[#A51C30]/25 bg-[#230B12] p-2 shadow-2xl shadow-black/50"
              >
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-bold text-red-100/80 hover:bg-[#A51C30]/25 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div ref={rhinoDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setRhinoMenuOpen((current) => !current)}
              aria-expanded={rhinoMenuOpen}
              aria-haspopup="menu"
              className="whitespace-nowrap rounded-full border border-[#C4963E]/35 bg-[#C4963E]/10 px-3 py-2 text-sm font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
            >
              Rhino Coins {rhinoMenuOpen ? "▲" : "▼"}
            </button>

            {rhinoMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[#C4963E]/25 bg-[#230B12] p-2 shadow-2xl shadow-black/50"
              >
                <p className="px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#C4963E]">
                  Take control of the game
                </p>

                {rhinoCoinLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setRhinoMenuOpen(false)}
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
            href="/playoffs"
            className="rounded-full bg-[#C4963E] px-3 py-2 text-sm font-black text-[#16070B]"
          >
            Playoffs
          </Link>

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
          {[...primaryLinks, ...moreLinks, ...rhinoCoinLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-black ${
                link.href === "/playoffs"
                  ? "border-[#C4963E]/40 bg-[#C4963E] text-[#16070B]"
                  : "border-[#A51C30]/25 bg-[#A51C30]/10 text-red-100/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}