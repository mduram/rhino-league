import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import GameCard from "@/components/GameCard";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchedulePage() {
  const [regularGamesResult, playoffGamesResult] = await Promise.all([
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
        submitted_score_pending,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(id, name, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, logo_url)
      `)
      .in("status", ["scheduled", "completed"])
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("playoff_games")
      .select(`
        id,
        game_number,
        bracket,
        round_label,
        scheduled_at,
        location,
        status,
        home_score,
        away_score,
        home_source,
        away_source,
        home_team_id,
        away_team_id,
        home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url, league),
        away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url, league)
      `)
      .in("status", ["pending", "scheduled", "completed"])
      .not("scheduled_at", "is", null)
      .order("scheduled_at", { ascending: true }),
  ]);

  const error = regularGamesResult.error || playoffGamesResult.error;

  if (error) {
    return (
      <PageShell title="Schedule">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  const scheduledGames = [
    ...(regularGamesResult.data || []).map((game) => ({
      ...game,
      game_type: "regular",
    })),
    ...(playoffGamesResult.data || []).map((game) => ({
      ...game,
      game_type: "playoff",
      league: "playoff",
      home_votes: 0,
      away_votes: 0,
      submitted_score_pending: false,
    })),
  ].sort((a, b) => {
    const aTime = a.scheduled_at
      ? new Date(a.scheduled_at).getTime()
      : Number.MIN_SAFE_INTEGER;
    const bTime = b.scheduled_at
      ? new Date(b.scheduled_at).getTime()
      : Number.MIN_SAFE_INTEGER;
    return bTime - aTime;
  });

  return (
    <PageShell
      title="Schedule"
      subtitle="The complete regular-season archive and live playoff schedule. Future playoff matchups update automatically as results advance the bracket."
    >
      <div className="grid gap-8">
        <ScheduleCalendar games={scheduledGames} />

        <section>
          <h2 className="mb-4 text-2xl font-black text-[#F3EEE6]">
            Full Schedule List · Latest First
          </h2>

          <div className="grid gap-5">
            {scheduledGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                showPoll
                showComments
                deferComments
              />
            ))}
          </div>

          {scheduledGames.length === 0 && (
            <p className="text-red-100/60">No games have been scheduled yet.</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
