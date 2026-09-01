import Image from "next/image";
import Link from "next/link";

import GameCard from "@/components/GameCard";
import RulesSection from "@/components/RulesSection";
import SectionTitle from "@/components/SectionTitle";
import SongOfTheDay from "@/components/SongOfTheDay";
import TeamLogo from "@/components/TeamLogo";
import { SEASON_PHASE } from "@/lib/seasonPhase";
import { supabase } from "@/lib/supabase";
import {
  calculateStandings,
  type CalculatedStanding,
  type StandingsGame,
  type StandingsTeam,
} from "@/lib/standings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINNERS_IMAGE_URL =
  "https://dmg5c1valy4me.cloudfront.net/wp-content/uploads/2025/09/05130547/2025_rhino-league_hex.jpg";

function ChampionCard({
  label,
  team,
  accent,
}: {
  label: string;
  team: CalculatedStanding | undefined;
  accent: "gold" | "crimson" | "cream";
}) {
  const accentClasses = {
    gold: "border-[#C4963E]/35 bg-[#C4963E]/10 text-[#D7AA4A]",
    crimson: "border-[#A51C30]/40 bg-[#A51C30]/12 text-red-100",
    cream: "border-[#F3EEE6]/20 bg-[#F3EEE6]/[0.06] text-[#F3EEE6]",
  }[accent];

  return (
    <article className={`rounded-3xl border p-5 ${accentClasses}`}>
      <p className="text-xs font-black uppercase tracking-[0.22em]">
        {label}
      </p>

      {team ? (
        <div className="mt-4 flex items-center gap-3">
          <TeamLogo
            logoUrl={team.logo_url}
            teamName={team.name}
            league={team.league}
            size="md"
          />

          <div className="min-w-0">
            <p className="truncate text-xl font-black text-white">
              {team.name}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {team.standingPoints} seeding pts · {team.wins}-{team.losses}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-lg font-black text-white/65">To be decided</p>
      )}
    </article>
  );
}

export default async function HomePage() {
  const [
    { data: upcomingGames },
    { data: latestScores },
    { data: teams },
    { data: completedGames },
    { data: disqualifiedTeams },
  ] = await Promise.all([
    supabase
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
      .limit(3),
    supabase
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
      .limit(3),
    supabase
      .from("teams")
      .select(
        "id, name, league, logo_url, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
      ),
    supabase
      .from("games")
      .select(
        "home_team_id, away_team_id, home_score, away_score, status, league, is_forfeit, forfeit_team_id"
      )
      .eq("status", "completed"),
    supabase
      .from("teams")
      .select(
        "id, name, league, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
      )
      .eq("playoff_disqualified", true)
      .order("playoff_disqualified_at", {
        ascending: false,
        nullsFirst: false,
      }),
  ]);

  const standings = calculateStandings({
    teams: (teams || []) as StandingsTeam[],
    games: (completedGames || []) as StandingsGame[],
  }).filter((team) => !team.playoffDisqualified);

  const overallLeader = standings[0];
  const competitiveLeader = standings.find(
    (team) => team.league === "competitive"
  );
  const recreationalLeader = standings.find(
    (team) => team.league === "recreational"
  );

  const winnerNoun = SEASON_PHASE.regularSeasonComplete
    ? "Regular-season champions"
    : "Regular-season leaders";

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#A51C30]/35 bg-[#230B12]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur md:p-12">
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
                <Image
                  src={WINNERS_IMAGE_URL}
                  alt="2025 Rhino League winners"
                  width={1200}
                  height={675}
                  priority
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
        </section>

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
                  {[
                    { href: "#rules", label: "Rules" },
                    { href: "#announcements", label: "Announcements" },
                    { href: "/streams", label: "Live Streams" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full bg-[#A51C30]/25 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-[#A51C30]/40 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
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
              </div>
            </div>
          </div>
        </section>

        <section
          id="announcements"
          className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"
        >
          <article className="relative overflow-hidden rounded-[2rem] border border-[#A51C30]/55 bg-[#A51C30]/15 p-6 shadow-2xl shadow-black/30 lg:col-span-2 md:p-7">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#A51C30]/25 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-red-100">
                Important eligibility update
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Harvard ID or prior Rhino League experience required
              </h2>
              <p className="mt-2 max-w-3xl leading-7 text-red-100/70">
                Only players who have a Harvard ID or have played in the Rhino
                League in a previous year are allowed to play.
              </p>
            </div>
          </article>

          <Link
            href="/playoffs"
            className="group relative overflow-hidden rounded-[2rem] border border-[#C4963E]/35 bg-[#C4963E]/10 p-6 shadow-2xl shadow-black/25 transition hover:bg-[#C4963E]/16 lg:col-span-2 md:p-7"
          >
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#C4963E]/15 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
                  {SEASON_PHASE.playoffSchedulePublished
                    ? "Playoffs are live"
                    : "Playoffs incoming"}
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {SEASON_PHASE.playoffSchedulePublished
                    ? "The official 30-team playoff bracket is here"
                    : "The 30-team double-elimination bracket is taking shape"}
                </h2>
                <p className="mt-2 max-w-3xl leading-7 text-red-100/65">
                  {SEASON_PHASE.playoffSchedulePublished
                    ? "Explore the official bracket, check every matchup, and follow the complete playoff schedule."
                    : "Explore the provisional bracket now. Official match times appear once the regular season closes and the schedule is published."}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[#C4963E]/35 bg-black/20 px-5 py-3 font-black text-[#F3EEE6] transition group-hover:bg-[#C4963E]/15">
                View bracket →
              </span>
            </div>
          </Link>
          <article className="relative overflow-hidden rounded-[2rem] border border-[#C4963E]/25 bg-[#230B12]/90 p-6 shadow-2xl shadow-black/30 md:p-8">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C4963E]/12 blur-3xl" />
            <div className="relative">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
                    {SEASON_PHASE.regularSeasonComplete
                      ? "Results are official"
                      : "Awaiting final confirmation"}
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">
                    {winnerNoun}
                  </h2>
                </div>

                <Link
                  href="/standings"
                  className="text-sm font-black text-[#C4963E] hover:text-white"
                >
                  Full standings →
                </Link>
              </div>

              <p className="mt-3 max-w-3xl leading-7 text-white/60">
                {SEASON_PHASE.regularSeasonComplete
                  ? "Congratulations to the overall, competitive, and recreational regular-season winners."
                  : "These are the live leaders. The names lock after the remaining regular-season games are complete."}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <ChampionCard
                  label={SEASON_PHASE.regularSeasonComplete ? "Overall winner" : "Overall leader"}
                  team={overallLeader}
                  accent="gold"
                />
                <ChampionCard
                  label={
                    SEASON_PHASE.regularSeasonComplete
                      ? "Competitive winner"
                      : "Competitive leader"
                  }
                  team={competitiveLeader}
                  accent="crimson"
                />
                <ChampionCard
                  label={
                    SEASON_PHASE.regularSeasonComplete
                      ? "Recreational winner"
                      : "Recreational leader"
                  }
                  team={recreationalLeader}
                  accent="cream"
                />
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-[#A51C30]/45 bg-[#2A0C15]/90 p-6 shadow-2xl shadow-black/30 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-red-100">
              Playoff rules
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              Two reminders. No exceptions.
            </h2>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-[#A51C30]/35 bg-[#A51C30]/12 p-4">
                <p className="text-lg font-black text-white">
                  No playoff reschedules
                </p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Be ready for the published time. Playoff games cannot be
                  moved.
                </p>
              </div>
              <div className="rounded-2xl border border-[#A51C30]/35 bg-[#A51C30]/12 p-4">
                <p className="text-lg font-black text-white">
                  Two-game player minimum
                </p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Only players who appeared in at least two regular-season games
                  are eligible. Each team is responsible for following this rule
                  based on honor and sportsmanship. Teams may submit complaints
                  about opponents to the commissioner for consideration.
                </p>
              </div>
            </div>
          </article>
        </section>

        {disqualifiedTeams && disqualifiedTeams.length > 0 && (
          <section className="mt-7 rounded-[2rem] border border-red-400/25 bg-red-500/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-red-200">
              Playoff eligibility update
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {disqualifiedTeams.map((team) => (
                <p
                  key={team.id}
                  className="rounded-2xl border border-red-300/20 bg-black/15 p-4 text-sm leading-6 text-red-100/75"
                >
                  <span className="font-black text-white">{team.name}</span>
                  {team.playoff_disqualification_reason
                    ? ` — ${team.playoff_disqualification_reason}`
                    : " — Disqualified from playoff eligibility."}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <RulesSection />
          <SongOfTheDay />
        </section>

        <section className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle>Upcoming Games</SectionTitle>
            <div className="grid gap-5">
              {upcomingGames?.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
              {upcomingGames?.length === 0 && (
                <p className="text-white/55">No upcoming games yet.</p>
              )}
            </div>
          </div>

          <div>
            <SectionTitle>Latest Scores</SectionTitle>
            <div className="grid gap-5">
              {latestScores?.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
              {latestScores?.length === 0 && (
                <p className="text-white/55">No completed games yet.</p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
