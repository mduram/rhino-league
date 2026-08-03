import Link from "next/link";
import { notFound } from "next/navigation";

import GameCard from "@/components/GameCard";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const [regularResult, playoffResult] = await Promise.all([
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
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(id, name, logo_url, league),
        away_team:teams!games_away_team_id_fkey(id, name, logo_url, league)
      `)
      .eq("id", gameId)
      .maybeSingle(),
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
      .eq("id", gameId)
      .maybeSingle(),
  ]);

  if (regularResult.error || playoffResult.error) {
    return (
      <PageShell title="Match">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {regularResult.error?.message || playoffResult.error?.message}
        </div>
      </PageShell>
    );
  }

  const game = regularResult.data
    ? { ...regularResult.data, game_type: "regular" }
    : playoffResult.data
      ? {
          ...playoffResult.data,
          game_type: "playoff",
          league: "playoff",
          home_votes: 0,
          away_votes: 0,
        }
      : null;

  if (!game) notFound();

  return (
    <PageShell
      title="Match"
      subtitle="Match details, poll, and comments—all in one place."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="rounded-full border border-[#A51C30]/30 bg-[#A51C30]/15 px-4 py-2 text-sm font-black text-red-100 hover:bg-[#A51C30]/25"
        >
          ← Full schedule
        </Link>
        {game.game_type === "playoff" && (
          <Link
            href="/playoffs"
            className="rounded-full border border-[#1F8A70]/40 bg-[#1F8A70]/15 px-4 py-2 text-sm font-black text-[#BFF4E7] hover:bg-[#1F8A70]/25"
          >
            Playoff bracket →
          </Link>
        )}
      </div>

      <GameCard
        game={game}
        showPoll
        showComments
        commentsDefaultOpen
      />
    </PageShell>
  );
}
