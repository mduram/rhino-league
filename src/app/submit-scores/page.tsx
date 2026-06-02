import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import SubmitScoresClient from "./SubmitScoresClient";

export default async function SubmitScoresPage() {
  const { data: games, error } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      submitted_score_pending,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .eq("status", "scheduled")
    .eq("submitted_score_pending", false)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return (
      <PageShell title="Submit Scores">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Submit Scores"
      subtitle="Submit a score after a game. Scores are reviewed before becoming official."
    >
      <SubmitScoresClient games={games || []} />
    </PageShell>
  );
}