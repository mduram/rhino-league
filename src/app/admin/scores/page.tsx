import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parsePlayoffScoreGameId } from "@/lib/playoffScoreSubmissions";
import AdminScoresClient from "./AdminScoresClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminScoresPage() {
  const { data: games, error: gamesError } = await supabaseAdmin
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
      home_team_id,
      away_team_id,
      home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url, league),
      away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url, league)
    `)
    .neq("status", "completed")
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  const { data: pendingSubmissions, error: submissionsError } =
    await supabaseAdmin
      .from("score_submissions")
      .select("*")
      .eq("status", "pending")
      .is("game_id", null)
      .like("notes", "rhino:playoff-game:%")
      .order("created_at", { ascending: true });

  const playoffSubmissions = (pendingSubmissions || [])
    .map((submission) => ({
      ...submission,
      game_id: parsePlayoffScoreGameId(submission.notes),
      game_type: "playoff",
    }))
    .filter((submission) => Boolean(submission.game_id));

  const playoffGames = (games || []).map((game) => ({
    ...game,
    game_type: "playoff",
    league: "playoff",
  }));

  if (gamesError || submissionsError) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
            Admin
          </p>

          <h1 className="text-4xl font-black text-white">
            Score Control Center
          </h1>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {gamesError?.message || submissionsError?.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#F3EEE6]">
          Admin
        </p>

        <h1 className="text-4xl font-black text-white">
          Score Control Center
        </h1>

        <p className="mt-3 max-w-3xl text-red-100/70">
          Review playoff score submissions, accept a result, reject a bad
          submission, or manually record a playoff score. Accepted results
          advance the official bracket immediately.
        </p>

        <AdminScoresClient
          games={playoffGames}
          pendingSubmissions={playoffSubmissions}
        />
      </div>
    </main>
  );
}
