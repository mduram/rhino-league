import Link from "next/link";

const links = [
  { href: "/schedule", label: "Schedule" },
  { href: "/scores", label: "Scores" },
  { href: "/submit-scores", label: "Submit Scores" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/photos", label: "Photos" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-2xl">
            🦏
          </div>

          <div>
            <div className="text-lg font-black leading-none">
              Rhino League
            </div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-orange-400">
              Volleyball
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/admin/login"
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white hover:bg-orange-600"
          >
            Admin
          </Link>
        </nav>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-neutral-200"
          >
            {link.label}
          </Link>
        ))}

        <Link
          href="/admin/login"
          className="whitespace-nowrap rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white"
        >
          Admin
        </Link>
      </nav>
    </header>
  );
}