import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import SubmitScoresClient from "./SubmitScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubmitScoresPage() {
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
      league,
      home_team_id,
      away_team_id,
      submitted_score_pending,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
      `)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("playoff_games")
      .select(`
        id,
        game_number,
        round_label,
        scheduled_at,
        location,
        status,
        home_score,
        away_score,
        home_team_id,
        away_team_id,
        home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url, league),
        away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url, league)
      `)
      .eq("status", "scheduled")
      .not("home_team_id", "is", null)
      .not("away_team_id", "is", null)
      .order("scheduled_at", { ascending: true }),
  ]);

  const error = regularGamesResult.error || playoffGamesResult.error;

  if (error) {
    return (
      <PageShell title="Submit Scores">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </PageShell>
    );
  }

  const games = [
    ...(playoffGamesResult.data || []).map((game) => ({
      ...game,
      game_type: "playoff",
      league: "playoff",
      submitted_score_pending: false,
    })),
    ...(regularGamesResult.data || []).map((game) => ({
      ...game,
      game_type: "regular",
    })),
  ].sort((a, b) => {
    const aTime = a.scheduled_at
      ? new Date(a.scheduled_at).getTime()
      : Number.MAX_SAFE_INTEGER;
    const bTime = b.scheduled_at
      ? new Date(b.scheduled_at).getTime()
      : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  return (
    <PageShell
      title="Submit Scores"
      subtitle="Captains can submit regular-season and playoff scores here. Matching submissions from both teams are automatically approved."
    >
      <SubmitScoresClient games={games || []} />
    </PageShell>
  );
}
