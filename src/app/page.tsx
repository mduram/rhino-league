import { connection } from "next/server";

import AnnouncementCountdown from "@/components/AnnouncementCountdown";
import CommentsSection from "@/components/CommentsSection";

const ANNOUNCEMENT_COMMENT_ID = "20260000-0000-4000-8000-000000000001";
const ANNOUNCEMENT_RELEASE_AT = new Date(
  "2026-09-03T20:00:00-04:00"
).getTime();
const NEON_GLYPHS = [
  { letter: "N", x: 58, dash: "108 7 54 5 82 10", offset: 4 },
  { letter: "O", x: 164, dash: "78 6 118 11 47 5", offset: 22 },
  { letter: "C", x: 333, dash: "91 8 42 5 112 10", offset: 11 },
  { letter: "H", x: 439, dash: "62 5 127 9 48 7", offset: 31 },
  { letter: "A", x: 544, dash: "105 9 51 6 75 5", offset: 17 },
  { letter: "M", x: 657, dash: "74 5 96 11 64 7", offset: 39 },
  { letter: "P", x: 773, dash: "117 8 38 5 91 10", offset: 8 },
  { letter: "I", x: 848, dash: "56 6 83 9 45 5", offset: 26 },
  { letter: "O", x: 923, dash: "84 5 109 12 42 6", offset: 14 },
  { letter: "N", x: 1024, dash: "42 24 31 20 48 28", offset: 17 },
];

function BrokenNeonTitle() {
  return (
    <svg
      className="ominous-title mt-3 block w-full overflow-visible"
      viewBox="0 0 1080 190"
      role="img"
      aria-label="No champion"
    >
      <path
        aria-hidden="true"
        className="neon-support-rail"
        d="M 966 8 C 997 7 1033 9 1065 8"
      />
      <path
        aria-hidden="true"
        className="neon-support-rail-highlight"
        d="M 969 5.6 C 998 4.8 1033 6.5 1062 5.7"
      />

      <circle
        aria-hidden="true"
        className="neon-cable-clamp neon-cable-clamp-broken"
        cx="995"
        cy="8"
        r="2.8"
      />
      <circle
        aria-hidden="true"
        className="neon-cable-bolt"
        cx="995"
        cy="8"
        r="0.8"
      />

      <g className="neon-snapped-cable" aria-hidden="true">
        <circle className="neon-cable-clamp" cx="1053" cy="8" r="2.6" />
        <circle className="neon-cable-bolt" cx="1053" cy="8" r="0.8" />
        <path className="neon-cable-shadow" d="M 1053 11 C 1051 19 1056 27 1052 35" />
        <path className="neon-letter-cable" d="M 1053 11 C 1051 19 1056 27 1052 35" />
        <path className="neon-cable-highlight" d="M 1052.5 11 C 1050.5 19 1055.5 27 1051.5 35" />
        <path className="neon-cable-fray" d="M 1052 35 l -2 5 M 1052 35 l 2 4 M 1052 35 l 0.5 5" />
      </g>

      <g className="neon-tube-unlit" aria-hidden="true">
        {NEON_GLYPHS.slice(0, -1).map(({ letter, x }, index) => (
          <text
            key={`${letter}-${index}`}
            x={x}
            y="145"
            textAnchor="middle"
          >
            {letter}
          </text>
        ))}
      </g>

      <g aria-hidden="true">
        {NEON_GLYPHS.slice(0, -1).map(({ letter, x, dash, offset }, index) => (
          <text
            key={`${letter}-${index}`}
            x={x}
            y="145"
            textAnchor="middle"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            className={`neon-tube-lit neon-letter-${index}`}
          >
            {letter}
          </text>
        ))}
      </g>

      <g className="neon-hanging-rig" aria-hidden="true">
        <path
          className="neon-hanging-wire-shadow"
          d="M 995 11 C 997 24 992 42 995 58"
        />
        <path
          className="neon-hanging-wire"
          d="M 995 11 C 997 24 992 42 995 58"
        />
        <path
          className="neon-hanging-wire-highlight"
          d="M 994.45 11 C 996.45 24 991.45 42 994.45 58"
        />
        <circle className="neon-cable-sleeve neon-broken-sleeve" cx="995" cy="58" r="3" />
        <g transform="rotate(10 995 58)">
          <text
            x="1024"
            y="164"
            textAnchor="middle"
            className="neon-tube-unlit"
          >
            N
          </text>
          <text
            x="1024"
            y="164"
            textAnchor="middle"
            strokeDasharray={NEON_GLYPHS[9].dash}
            strokeDashoffset={NEON_GLYPHS[9].offset}
            className="neon-tube-lit neon-letter-9"
          >
            N
          </text>
        </g>
      </g>
    </svg>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  await connection();

  const { preview } = await searchParams;
  const previewValue = Array.isArray(preview) ? preview[0] : preview;
  const isLocalAnnouncementPreview =
    process.env.NODE_ENV === "development" && previewValue === "announcement";

  // This page is explicitly request-time rendered so wall-clock release logic is stable.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  const isAnnouncementReleased =
    isLocalAnnouncementPreview || requestTime >= ANNOUNCEMENT_RELEASE_AT;

  if (!isAnnouncementReleased) {
    return <AnnouncementCountdown releaseAt={ANNOUNCEMENT_RELEASE_AT} />;
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
                The Rhino League · Official ruling
              </p>
            </div>

            <h1 className="mt-8 uppercase">
              <span className="block text-sm font-semibold tracking-[0.25em] text-white/45 sm:text-base">
                The 2026 season ends with
              </span>
              <BrokenNeonTitle />
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
