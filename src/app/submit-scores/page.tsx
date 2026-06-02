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
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name),
      away_team:teams!games_away_team_id_fkey(id, name)
    `)
    .eq("status", "scheduled")
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
      subtitle="Captains can submit scores here. If both teams submit the same score, it becomes official automatically."
    >
      <SubmitScoresClient games={games || []} />
    </PageShell>
  );
}