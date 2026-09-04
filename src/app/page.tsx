import { connection } from "next/server";

import SiteShutdownCountdown from "@/components/SiteShutdownCountdown";

const SITE_SHUTDOWN_AT = new Date(
  "2026-09-07T00:00:00-04:00"
).getTime();
const RHINO_COIN_LEADERS = [
  {
    rank: 1,
    name: "Tom Kazansky",
    coins: 4730,
    label: "Gold Rhino",
    style:
      "border-[#C4963E]/65 bg-[linear-gradient(145deg,rgba(196,150,62,0.22),rgba(34,15,5,0.76))] shadow-[#C4963E]/10",
  },
  {
    rank: 2,
    name: "Pete Mitchell",
    coins: 3362,
    label: "Silver Rhino",
    style:
      "border-white/20 bg-[linear-gradient(145deg,rgba(211,215,221,0.13),rgba(20,17,18,0.82))] shadow-white/5",
  },
  {
    rank: 3,
    name: "Nick Bradshaw",
    coins: 3123,
    label: "Bronze Rhino",
    style:
      "border-[#A96743]/45 bg-[linear-gradient(145deg,rgba(169,103,67,0.16),rgba(27,12,8,0.82))] shadow-[#A96743]/10",
  },
] as const;

export default async function HomePage() {
  await connection();

  // This page is request-time rendered so the shutdown happens at the deadline.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();

  if (requestTime >= SITE_SHUTDOWN_AT) {
    return (
      <main
        aria-label="The Rhino League website has closed"
        className="min-h-screen bg-[#020101]"
      />
    );
  }

  return (
    <main className="shelved-site relative min-h-screen overflow-hidden px-5 py-10 text-[#EDE8E5] sm:px-8 sm:py-20">
      <div aria-hidden className="ominous-grain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <article className="ominous-panel relative border border-red-950/70 bg-black/75 px-5 py-9 shadow-2xl shadow-black sm:px-10 sm:py-14 lg:px-14">
          <header className="border-b border-red-950/70 pb-9 sm:pb-12">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="omen-pulse h-2.5 w-2.5 rounded-full bg-[#B1122B] shadow-[0_0_18px_rgba(177,18,43,0.95)]"
              />
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#C43A4E] sm:text-sm">
                The Rhino League · Final notice
              </p>
            </div>

            <h1 className="mt-8 font-serif text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
              The website goes dark
              <span className="mt-2 block text-[#D33A53] drop-shadow-[0_0_22px_rgba(177,18,43,0.38)]">
                Monday.
              </span>
            </h1>
            <p className="mt-7 font-mono text-xs uppercase tracking-[0.18em] text-white/30">
              September 4, 2026 · One last weekend
            </p>
          </header>

          <div className="space-y-9 py-9 text-base leading-8 text-white/68 sm:py-12 sm:text-lg">
            <section className="verdict-panel border border-[#8E1024]/80 p-6 text-white/85 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#E04A61]">
                Final shutdown
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Monday, September 7 at 12:00 AM Eastern
              </h2>
              <p className="mt-4 text-white/60">
                At the start of Monday, this website will be completely gone.
                It will not remain online as an archive.
              </p>
              <SiteShutdownCountdown shutdownAt={SITE_SHUTDOWN_AT} />
            </section>

            <section className="border-l-2 border-[#B1122B] bg-[#35040C]/20 px-5 py-5 sm:px-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D44B61]">
                MCB announcement
              </p>
              <p className="mt-3 font-serif text-xl text-white/90 sm:text-2xl">
                An official MCB announcement will follow separately.
              </p>
            </section>

            <section
              id="rhino-coins"
              className="scroll-mt-8 border border-[#C4963E]/35 bg-[#130B06]/75 p-5 shadow-2xl shadow-black/40 sm:p-8"
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C4963E]">
                One final accounting
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl">
                About those Rhino Coins…
              </h2>
              <p className="mt-4 text-white/60">
                Some of you have been asking what happens to the Rhino Coins.
                First, congratulations to the top three finishers.
              </p>

              <ol className="mt-7 grid gap-3 sm:grid-cols-3 sm:items-end">
                {RHINO_COIN_LEADERS.map((leader) => (
                  <li
                    key={leader.rank}
                    className={`border p-5 shadow-xl ${leader.style} ${
                      leader.rank === 1 ? "sm:-translate-y-3" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-serif text-4xl font-bold leading-none text-white/85">
                        {leader.rank}
                      </span>
                      <span className="text-right font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/35">
                        {leader.label}
                      </span>
                    </div>
                    <p className="mt-7 font-serif text-xl font-semibold leading-tight text-white">
                      {leader.name}
                    </p>
                    <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-[#E6C270]">
                      {leader.coins.toLocaleString("en-US")}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/35">
                      Rhino Coins
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 border-t border-[#C4963E]/20 pt-5 text-center sm:mt-3">
                <p className="font-serif text-xl leading-8 text-white/85 sm:text-2xl">
                  We hope they had fun earning them, because that fun is all
                  they will get in exchange.
                </p>
                <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/30">
                  No cash value · No prizes · No redemption · Just glory
                </p>
              </div>
            </section>

            <section className="border-y border-red-950/70 bg-[#120306]/60 px-5 py-8 sm:px-8 sm:py-10">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D44B61]">
                A final word from Marc
              </p>
              <h2 className="mt-5 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Goodbye, and thank you.
              </h2>
              <div className="mt-6 space-y-5 text-white/65">
                <p>
                  The 2026 season was my final season as commissioner, and this
                  is the last time I will be involved with the Rhino League.
                </p>
                <p>
                  Thank you to everyone who played, organized, argued, cheered,
                  and cared enough to make this strange summer tradition matter.
                  Whatever happened on the court, the league was real because
                  people kept showing up for it.
                </p>
                <p className="font-serif text-xl text-white/90 sm:text-2xl">
                  It has been a privilege to be part of it. Goodbye, and thank
                  you for everything.
                </p>
              </div>

              <footer className="mt-8 border-t border-red-950/60 pt-6">
                <p className="font-serif text-xl font-semibold text-white">
                  Marc Duque
                </p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-white/35">
                  Commissioner, The Rhino League · 2026
                </p>
              </footer>
            </section>
          </div>
        </article>

        <section className="pb-12 pt-7 sm:pb-20 sm:pt-9">
          <div className="border border-red-950/60 bg-black/65 px-5 py-6 text-center shadow-2xl shadow-black sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/40 sm:text-sm">
              Comments on this post have been restricted.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
