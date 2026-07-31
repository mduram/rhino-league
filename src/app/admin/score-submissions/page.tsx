import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parsePlayoffScoreGameId } from "@/lib/playoffScoreSubmissions";
import ScoreSubmissionsClient from "./ScoreSubmissionsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScoreSubmissionsPage() {
  const { data: submissions, error: submissionsError } = await supabaseAdmin
    .from("score_submissions")
    .select(`
      id,
      game_id,
      submitting_team_id,
      home_score,
      away_score,
      submitted_by,
      submitter_name,
      submitter_email,
      notes,
      status,
      conflict,
      auto_approved,
      matched_submission_id,
      is_forfeit,
      forfeit_team_id,
      forfeit_note,
      created_at,
      submitting_team:teams!score_submissions_submitting_team_id_fkey(name),
      game:games (
        id,
        scheduled_at,
        location,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const playoffGameIds = [
    ...new Set(
      (submissions || [])
        .map((submission) => parsePlayoffScoreGameId(submission.notes))
        .filter((gameId): gameId is string => Boolean(gameId))
    ),
  ];

  let playoffGamesById: Record<string, any> = {};
  let playoffGamesError: { message: string } | null = null;

  if (playoffGameIds.length > 0) {
    const playoffGamesResult = await supabaseAdmin
      .from("playoff_games")
      .select(`
        id,
        game_number,
        round_label,
        scheduled_at,
        location,
        status,
        home_team:teams!playoff_games_home_team_id_fkey(name),
        away_team:teams!playoff_games_away_team_id_fkey(name)
      `)
      .in("id", playoffGameIds);

    playoffGamesError = playoffGamesResult.error;
    playoffGamesById = Object.fromEntries(
      (playoffGamesResult.data || []).map((game) => [game.id, game])
    );
  }

  const hydratedSubmissions = (submissions || []).map((submission) => {
    const playoffGameId = parsePlayoffScoreGameId(submission.notes);

    return {
      ...submission,
      game_type: playoffGameId ? "playoff" : "regular",
      game: playoffGameId
        ? playoffGamesById[playoffGameId] || null
        : submission.game,
      notes: playoffGameId ? null : submission.notes,
    };
  });

  const error = submissionsError || playoffGamesError;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-orange-400">
          Admin
        </p>

        <h1 className="mb-8 text-4xl font-black">Score Submissions</h1>

        <div className="mb-8 flex flex-wrap gap-3">
          <a
            href="/admin"
            className="rounded-full border border-white/10 px-5 py-3 font-black text-white transition hover:bg-white/10"
          >
            Back to Admin
          </a>

          <a
            href="/admin/login"
            className="rounded-full bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20"
          >
            Admin Login
          </a>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        ) : (
          <ScoreSubmissionsClient submissions={hydratedSubmissions} />
        )}
      </div>
    </main>
  );
}
