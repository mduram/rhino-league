import CommentsSection from "@/components/CommentsSection";

const ANNOUNCEMENT_COMMENT_ID = "20260000-0000-4000-8000-000000000001";

export default function HomePage() {
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
                The Rhino League · Official ruling
              </p>
            </div>

            <h1 className="mt-8 uppercase">
              <span className="block text-sm font-semibold tracking-[0.25em] text-white/45 sm:text-base">
                The 2026 season ends with
              </span>
              <span className="ominous-title mt-3 block font-serif text-5xl font-black leading-none tracking-[-0.045em] text-[#E7E0DC] sm:text-7xl lg:text-8xl">
                No champion
              </span>
            </h1>
            <p className="mt-7 font-mono text-xs uppercase tracking-[0.18em] text-white/30">
              September 3, 2026 · Final determination
            </p>
          </header>

          <div className="space-y-7 py-9 text-base leading-8 text-white/68 sm:py-12 sm:text-lg">
            <p className="font-serif text-xl text-white/90 sm:text-2xl">
              Dear Rhino League community,
            </p>

            <p>
              After reviewing the eligibility concerns raised following the
              2026 final, we have decided to set aside the result of the match
              and conclude the season without recognizing a champion.
            </p>

            <p>
              The winning team&apos;s roster included multiple players who did
              not comply with the league&apos;s eligibility requirements. One
              player did not have the required Harvard affiliation, while
              another had appeared in only one regular-season game and did not
              meet the two-game minimum for playoff eligibility.
            </p>

            <p>
              The affiliation concern had been raised directly before the
              final, but the information provided at the time was inaccurate.
              This denied the opposing team a fair opportunity to object or ask
              that the player sit out.
            </p>

            <blockquote className="border-l-2 border-[#B1122B] bg-[#35040C]/25 py-3 pl-5 font-serif text-2xl leading-snug text-white/90 sm:pl-7 sm:text-3xl">
              Taken together, these circumstances mean the final result cannot
              fairly stand.
            </blockquote>

            <div className="verdict-panel border border-[#8E1024]/80 p-6 text-white/85 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#E04A61]">
                Final ruling
              </p>
              <p className="mt-4 font-serif text-xl leading-8 text-white sm:text-2xl">
                No champion will be recognized for the 2026 season, and no 2026
                plaque will be added to the Rhino Cup.
              </p>
            </div>

            <p>
              Going forward, the Harvard ID and playoff-eligibility rules will
              be clearly publicized and consistently enforced. Team rosters
              will be verified before the playoffs begin.
            </p>

            <p>
              This decision does not diminish everything the wider Rhino
              community brought to the summer. Thank you to every player,
              organizer, and supporter who made the season possible. The league
              has always depended on good faith, sportsmanship, and trust, and
              those values will guide its return next summer.
            </p>

            <footer className="border-t border-red-950/60 pt-7">
              <p className="font-serif text-xl font-semibold text-white">
                Marc Duque
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-white/35">
                Commissioner, The Rhino League
              </p>
            </footer>
          </div>
        </article>

        <section className="shelved-comments pb-12 pt-7 sm:pb-20 sm:pt-9">
          <CommentsSection
            targetType="game"
            targetId={ANNOUNCEMENT_COMMENT_ID}
            title="Community comments"
            defaultOpen
          />
        </section>
      </div>
    </main>
  );
}
