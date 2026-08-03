import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import GameCard from "@/components/GameCard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ScoresPage() {
  const { data: games, error } = await supabase
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
    .eq("status", "completed")
    .not("scheduled_at", "is", null)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
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
      subtitle="Final results from the 2026 Rhino League playoffs."
    >
      <div className="grid gap-5">
        {games?.map((game: any) => (
          <GameCard
            key={game.id}
            game={{ ...game, game_type: "playoff", league: "playoff" }}
            showComments={false}
          />
        ))}
      </div>

      {games?.length === 0 && (
        <p className="text-red-100/60">No completed playoff games yet.</p>
      )}
    </PageShell>
  );
}
