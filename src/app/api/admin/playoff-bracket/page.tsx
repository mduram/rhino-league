import Link from "next/link";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PlayoffBracketAdminClient from "./PlayoffBracketAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayoffBracketAdminPage() {
  const { data: seeds } = await supabaseAdmin
    .from("playoff_seeds")
    .select(
      `
      seed,
      standing_points,
      wins,
      losses,
      differential,
      games_played,
      team:teams!playoff_seeds_team_id_fkey(id, name, league, logo_url)
      `
    )
    .order("seed", { ascending: true });

  const { data: games } = await supabaseAdmin
    .from("playoff_games")
    .select(
      `
      id,
      game_number,
      bracket,
      round_label,
      scheduled_at,
      location,
      status,
      home_seed,
      away_seed,
      home_source,
      away_source,
      home_score,
      away_score,
      home_team:teams!playoff_games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!playoff_games_away_team_id_fkey(id, name, logo_url),
      winner_team:teams!playoff_games_winner_team_id_fkey(id, name, logo_url),
      loser_team:teams!playoff_games_loser_team_id_fkey(id, name, logo_url)
      `
    )
    .order("game_number", { ascending: true });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-black text-[#C4963E] hover:text-[#F3EEE6]"
      >
        ← Admin
      </Link>

      <section className="mt-4 rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/35 md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
          Playoff Admin
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Generate and Review Playoff Bracket
        </h1>

        <p className="mt-3 max-w-3xl leading-7 text-red-100/70">
          Generate the 32-team double-elimination playoff bracket from the
          current standings. This excludes playoff-disqualified teams and creates
          scheduled games from August 3 through August 28.
        </p>
      </section>

      <div className="mt-8">
        <PlayoffBracketAdminClient seeds={seeds || []} games={games || []} />
      </div>
    </main>
  );
}