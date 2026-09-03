import CommentsSection from "@/components/CommentsSection";

const ANNOUNCEMENT_COMMENT_ID = "20260000-0000-4000-8000-000000000001";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#08090C] px-5 py-12 text-[#F5F1EB] sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <article className="border-y border-white/10 py-10 sm:py-14">
          <header className="border-b border-white/10 pb-8 sm:pb-10">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9A45C] sm:text-sm">
              The Rhino League · Official announcement
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-6xl">
              The 2026 season will conclude without a champion
            </h1>
            <p className="mt-5 text-sm text-white/45">September 3, 2026</p>
          </header>

          <div className="space-y-6 py-8 text-base leading-8 text-white/72 sm:py-10 sm:text-lg">
            <p>Dear Rhino League community,</p>

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
              that the player sit out. Taken together, these circumstances mean
              the final result cannot fairly stand.
            </p>

            <div className="rounded-2xl border border-[#C9A45C]/30 bg-[#C9A45C]/[0.07] p-6 text-white/85 sm:p-7">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#D8B873]">
                The decision
              </p>
              <p className="mt-3 leading-8">
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

            <footer className="pt-3">
              <p className="font-semibold text-white">Marc Duque</p>
              <p className="text-sm text-white/45">
                Commissioner, The Rhino League
              </p>
            </footer>
          </div>
        </article>

        <section className="pb-12 pt-7 sm:pb-20 sm:pt-9">
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
