import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import GameCard from "@/components/GameCard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ScoresPage() {
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
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false });

  if (error) {
    return (
      <PageShell title="Scores">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Scores"
      subtitle="Final results from completed Rhino League games."
    >
      <div className="grid gap-5">
        {games?.map((game: any) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {games?.length === 0 && (
        <p className="text-red-100/60">No completed games yet.</p>
      )}
    </PageShell>
  );
}