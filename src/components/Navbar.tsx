"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const mainLinks = [
  { href: "/whats-new", label: "What’s New?" },
  { href: "/schedule", label: "Schedule" },
  { href: "/scores", label: "Scores" },
  { href: "/submit-scores", label: "Submit Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/photos", label: "Photos" },
  { href: "/polls", label: "Polls" },
  { href: "/donate", label: "Support" },
];

const rhinoCoinLinks = [
  { href: "/betting", label: "Rhino Bets" },
  { href: "/my-bets", label: "My Bets" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const [rhinoMenuOpen, setRhinoMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setRhinoMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
    <header className="sticky top-0 z-50 border-b border-[#A51C30]/30 bg-[#16070B]/95 text-white shadow-lg shadow-[#A51C30]/10 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A51C30] text-2xl shadow-lg shadow-[#A51C30]/40">
            🦏
          </div>

          <div>
            <div className="text-lg font-black leading-none">
              Rhino League
            </div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
              Harvard Volleyball
            </div>
          </div>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 md:flex">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold hover:text-white ${
                link.href === "/donate"
                  ? "border border-[#C4963E]/35 bg-[#C4963E]/10 text-[#F3EEE6] hover:bg-[#C4963E]/20"
                  : link.href === "/whats-new"
                    ? "border border-[#F3EEE6]/20 bg-white/[0.06] text-white hover:bg-white/10"
                    : "text-red-100/80 hover:bg-[#A51C30]/25"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setRhinoMenuOpen((current) => !current)}
              aria-expanded={rhinoMenuOpen}
              aria-haspopup="menu"
              className="whitespace-nowrap rounded-full border border-[#C4963E]/35 bg-[#C4963E]/10 px-3 py-2 text-sm font-black text-[#F3EEE6] hover:bg-[#C4963E]/20"
            >
              Rhino Coins {rhinoMenuOpen ? "▲" : "▼"}
            </button>

            {rhinoMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[#C4963E]/25 bg-[#230B12] p-2 shadow-2xl shadow-black/40">
                <div className="mb-2 rounded-xl border border-[#C4963E]/20 bg-[#C4963E]/10 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4963E]">
                    Take control of the game
                  </p>
                </div>

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
            href="/admin/login"
            className="whitespace-nowrap rounded-full bg-[#A51C30] px-4 py-2 text-sm font-black text-white shadow-lg shadow-[#A51C30]/30 hover:bg-[#7F1524]"
          >
            Admin
          </Link>
        </nav>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-[#A51C30]/25 px-4 py-3 md:hidden">
        {[...mainLinks, ...rhinoCoinLinks].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              link.href === "/donate"
                ? "bg-[#C4963E] text-[#16070B]"
                : link.href === "/whats-new"
                  ? "bg-white/10 text-white"
                  : "bg-[#A51C30]/20 text-red-100"
            }`}
          >
            {link.label}
          </Link>
        ))}

        <Link
          href="/admin/login"
          className="whitespace-nowrap rounded-full bg-[#A51C30] px-4 py-2 text-sm font-black text-white"
        >
          Admin
        </Link>
      </nav>
    </header>
  );
}