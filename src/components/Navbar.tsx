import Link from "next/link";

const links = [
  { href: "/schedule", label: "Schedule" },
  { href: "/scores", label: "Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/photos", label: "Photos" },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-2xl shadow-lg shadow-orange-500/25 transition group-hover:scale-105">
            🦏
          </div>

          <div>
            <p className="text-lg font-black leading-none">Rhino League</p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
              Volleyball
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/admin"
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
        >
          Admin
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-full bg-white/[0.06] px-4 py-2 text-sm font-bold text-neutral-300"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}