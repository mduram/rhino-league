import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-black">
          🦏 Rhino League
        </Link>

        <div className="flex flex-wrap gap-5 text-sm font-bold">
          <Link href="/schedule" className="hover:text-orange-400">
            Schedule
          </Link>

          <Link href="/scores" className="hover:text-orange-400">
            Scores
          </Link>

          <Link href="/standings" className="hover:text-orange-400">
            Standings
          </Link>

          <Link href="/teams" className="hover:text-orange-400">
            Teams
          </Link>

          <Link href="/polls" className="hover:text-orange-400">
            Polls
          </Link>

          <Link href="/photos" className="hover:text-orange-400">
            Photos
          </Link>

        </div>
      </div>
    </nav>
  );
}