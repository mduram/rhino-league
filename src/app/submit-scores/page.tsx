import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import SubmitScoresClient from "./SubmitScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      league,
      home_team_id,
      away_team_id,
      submitted_score_pending,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
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
      subtitle="Captains can submit scores here. Matching submissions from both teams are automatically approved."
    >
      <SubmitScoresClient games={games || []} />
    </PageShell>
  );
}