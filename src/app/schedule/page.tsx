import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import GameCard from "@/components/GameCard";

export default async function SchedulePage() {
  const { data: games, error } = await supabase
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
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at", { ascending: true });

  if (error) {
    return (
      <PageShell title="Schedule">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  const scheduledGames = games || [];

  return (
    <PageShell
      title="Schedule"
      subtitle="Upcoming matches, final scores, and game-by-game voting."
    >
      <div className="grid gap-5">
        {scheduledGames.map((game: any) => (
          <GameCard key={game.id} game={game} showPoll />
        ))}
      </div>

      {scheduledGames.length === 0 && (
        <p className="text-red-100/60">No games have been scheduled yet.</p>
      )}
    </PageShell>
  );
}