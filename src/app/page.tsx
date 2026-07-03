import Link from "next/link";
import { supabase } from "@/lib/supabase";
import GameCard from "@/components/GameCard";
import SectionTitle from "@/components/SectionTitle";
import SongOfTheDay from "@/components/SongOfTheDay";
import RulesSection from "@/components/RulesSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINNERS_IMAGE_URL =
  "https://dmg5c1valy4me.cloudfront.net/wp-content/uploads/2025/09/05130547/2025_rhino-league_hex.jpg";

export default async function HomePage() {
  const { data: upcomingGames } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(3);

  const { data: latestScores } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(3);

  const { data: disqualifiedTeams } = await supabase
    .from("teams")
    .select(
      "id, name, league, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
    )
    .eq("playoff_disqualified", true)
    .order("playoff_disqualified_at", {
      ascending: false,
      nullsFirst: false,
    });

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#A51C30]/35 bg-[#230B12]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A51C30]/55 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#C4963E]/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-[#F3EEE6]">
                Summer 2026
              </p>

              <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
                The Rhino League
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-red-100/80 sm:text-xl">
                Schedules, scores, standings, polls, photos, betting, and more
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/schedule"
                  className="rounded-full bg-[#A51C30] px-6 py-3 font-black text-white shadow-lg shadow-[#A51C30]/35 transition hover:bg-[#7F1524]"
                >
                  View Schedule
                </Link>

                <Link
                  href="/standings"
                  className="rounded-full border border-[#F3EEE6]/25 bg-white/[0.06] px-6 py-3 font-black text-white transition hover:bg-white/10"
                >
                  League Table
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-[#A51C30]/25 blur-2xl" />

              <div className="relative overflow-hidden rounded-[1.75rem] border border-[#F3EEE6]/20 bg-black/30 shadow-2xl shadow-black/50">
                <img
                  src={WINNERS_IMAGE_URL}
                  alt="2025 Rhino League winners"
                  className="h-72 w-full object-contain sm:h-96 lg:h-[28rem]"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
                    2025 Champions
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    Last year&apos;s winners
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
                About the league
              </p>

              <h2 className="text-3xl font-black text-white">
                Welcome to The Rhino League
              </h2>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-red-100/75">
                The Rhino League is a Harvard volleyball competition bringing
                together recreational and competitive teams for weekly games to
                have fun and make the summer more interesting!
              </p>

              <p className="mt-4 max-w-2xl text-base leading-7 text-red-100/55">
                Check the latest schedule, submit scores, vote in polls, upload
                photos, talk trash in comments, and use Rhino Coins to predict
                games.
              </p>

              <Link
                href="/donate"
                className="mt-6 block max-w-md rounded-3xl border border-[#C4963E]/35 bg-[#C4963E]/15 p-5 transition hover:bg-[#C4963E]/25"
              >
                <p className="text-xl font-black text-white">
                  Support the Rhino League
                </p>

                <p className="mt-2 text-sm leading-6 text-red-100/65">
                  Help with website hosting, court supplies, and commissioner
                  survival.
                </p>
              </Link>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-red-100/55">
                  League info
                </p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="#rules"
                    className="rounded-full bg-[#A51C30]/25 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-[#A51C30]/40 hover:text-white"
                  >
                    Rules
                  </a>

                  <a
                    href="#faqs"
                    className="rounded-full bg-[#A51C30]/25 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-[#A51C30]/40 hover:text-white"
                  >
                    FAQs
                  </a>

                  <a
                    href="#announcements"
                    className="rounded-full bg-[#A51C30]/25 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-[#A51C30]/40 hover:text-white"
                  >
                    Announcements
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
                  Rhino Coins
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/betting"
                    className="rounded-full bg-[#C4963E] px-4 py-2 text-sm font-black text-[#16070B] transition hover:bg-[#D7AA4A]"
                  >
                    Rhino Bets
                  </Link>

                  <Link
                    href="/my-bets"
                    className="rounded-full border border-[#C4963E]/35 bg-black/20 px-4 py-2 text-sm font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
                  >
                    My Bets
                  </Link>

                  <Link
                    href="/leaderboard"
                    className="rounded-full border border-[#C4963E]/35 bg-black/20 px-4 py-2 text-sm font-black text-[#F3EEE6] transition hover:bg-[#C4963E]/20"
                  >
                    Leaderboard
                  </Link>
                </div>

                <p className="mt-4 text-sm leading-6 text-red-100/60">
                  Feel the emotion of the sand at the click of a button. Take
                  control of the game!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div
            id="announcements"
            className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-7 shadow-2xl shadow-black/30"
          >
            <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
              Announcements
            </p>

            <h2 className="text-3xl font-black text-white">
              League updates
            </h2>

            <div className="mt-5 grid gap-4">
              <Link
                href="/betting"
                className="block rounded-2xl border border-[#C4963E]/35 bg-[#C4963E]/10 p-5 transition hover:bg-[#C4963E]/20"
              >
                <p className="text-xl font-black text-white">
                  Rhino Betting is live!!!
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  Create an account, get 100 Rhino Coins, predict match
                  winners, and climb the leaderboard.
                </p>
              </Link>
              <Link

  href="/betting"

  className="group relative block overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 transition hover:bg-emerald-500/20"

>

  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" />

  <div className="relative">

    <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">

      New ⚽

    </p>

    <p className="mt-2 text-xl font-black text-white">

      World Cup betting is live!!!

    </p>

    <p className="mt-2 text-base leading-7 text-red-100/75">

      Use your Rhino Coins to bet on FIFA World Cup games with

      real bookmaker-derived odds. Pick the winner or the draw,

      lock in your price, and climb the Rhino leaderboard.

    </p>

    <div className="mt-4 inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-100 transition group-hover:bg-emerald-400/20">

      Bet on the World Cup →

    </div>

  </div>

</Link>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="text-xl font-black text-white">
                  Important announcements
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  Teams that forfeit without notifying their opponent may be
                  disqualified from playoffs.
                </p>

                {disqualifiedTeams && disqualifiedTeams.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-red-400/25 bg-black/20 p-4">
                    <p className="font-black text-red-100">
                      Current playoff disqualification
                      {disqualifiedTeams.length === 1 ? "" : "s"}:
                    </p>

                    <div className="mt-3 grid gap-2">
                      {disqualifiedTeams.map((team: any) => (
                        <p
                          key={team.id}
                          className="text-sm leading-6 text-red-100/75"
                        >
                          <span className="font-black text-white">
                            {team.name}
                          </span>
                          {team.playoff_disqualification_reason
                            ? ` — ${team.playoff_disqualification_reason}`
                            : " — Disqualified from playoff eligibility."}
                        </p>
                      ))}
                    </div>

                    <Link
                      href="/standings"
                      className="mt-4 inline-flex rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-500/20"
                    >
                      View standings
                    </Link>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-red-100/55">
                    No teams are currently disqualified from playoffs.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  Less important announcements
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  GO SPURS!!!
                </p>
              </div>
            </div>
          </div>

          <div className="lg:max-w-sm lg:justify-self-end">
            <SongOfTheDay />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <RulesSection />

          <div
            id="faqs"
            className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-7 shadow-2xl shadow-black/30"
          >
            <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
              FAQs
            </p>

            <h2 className="text-3xl font-black text-white">
              Frequently asked questions
            </h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  Re-scheduling games
                </p>

                <div className="mt-2 space-y-3 text-base leading-7 text-red-100/75">
                  <p>
                    Try really hard not to! If you need to re-schedule a regular
                    season game:
                  </p>

                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Contact your opposing captain.</li>
                    <li>Find a date that works.</li>
                    <li>Contact mduqueramirez@g.harvard.edu.</li>
                  </ol>

                  <p>
                    You may not re-schedule for 2pm. This time is left open to
                    ensure afternoon games start on time.
                  </p>

                  <p>
                    You may not re-schedule for Friday at/after 4pm. The court
                    is open for pick-up.
                  </p>

                  <p>
                    The only time a game must be re-scheduled is due to weather,
                    such as a lightning storm. If you need to re-schedule because
                    you do not have enough players, then your opponent has the
                    right to refuse and take the win by forfeit... but that
                    would not be very RHINO....
                  </p>

                  <p className="font-black text-[#F3EEE6]">
                    THERE ARE NO RE-SCHEDULES DURING PLAY-OFFS...DON&apos;T ASK.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  How does the scoring work?
                </p>

                <div className="mt-2 space-y-3 text-base leading-7 text-red-100/75">
                  <p>
                    Regular season wins-losses are weighted accordingly for
                    playoff seeding:
                  </p>

                  <ul className="list-disc space-y-1 pl-5">
                    <li>Competitive win = 3 points</li>
                    <li>Competitive loss = -1 point</li>
                    <li>Recreational win = 1 point</li>
                    <li>Recreational loss = -2 points</li>
                    <li>Forfeit = -3 total points</li>
                  </ul>

                  <p>
                    Teams that forfeit without notifying the opposing team may
                    be disqualified from playoffs.
                  </p>

                  <p>
                    Top 32 teams play playoffs. Everyone will make the playoffs
                    this year YAY.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  Who can play?
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  Harvard-affiliated players in your roster. Players need to
                  play at least 2 games in the regular season to be eligible for
                  play-offs. Don&apos;t bring ringers to the play-offs, don&apos;t
                  be lame plz :(
                </p>
              </div>

              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  How do scores get submitted?
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  Captains submit scores through the Submit Scores page. If both
                  teams submit matching scores, the result is automatically
                  approved.
                </p>
              </div>

              <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5">
                <p className="text-xl font-black text-white">
                  Where can I watch games?
                </p>

                <p className="mt-2 text-base leading-7 text-red-100/75">
                  We will advertise streams on the website. They will be here:{" "}
                  <a
                    href="https://m.twitch.tv/harvardrhinocup/home"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-[#F3EEE6] underline decoration-[#A51C30] underline-offset-4 hover:text-white"
                  >
                    Harvard Rhino Cup Twitch
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <SectionTitle>Upcoming Games</SectionTitle>

            <div className="grid gap-5">
              {upcomingGames?.map((game: any) => (
                <GameCard key={game.id} game={game} />
              ))}

              {upcomingGames?.length === 0 && (
                <p className="text-red-100/60">No upcoming games yet.</p>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Latest Scores</SectionTitle>

            <div className="grid gap-5">
              {latestScores?.map((game: any) => (
                <GameCard key={game.id} game={game} />
              ))}

              {latestScores?.length === 0 && (
                <p className="text-red-100/60">No completed games yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}