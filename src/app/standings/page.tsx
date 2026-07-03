import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import LeagueBadge from "@/components/LeagueBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Team = {
  id: string;
  name: string;
  league: string;
  playoff_disqualified?: boolean | null;
  playoff_disqualification_reason?: string | null;
  playoff_disqualified_at?: string | null;
};

type Game = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  league: string;
  weight: number | null;
  is_forfeit?: boolean | null;
  forfeit_team_id?: string | null;
  forfeit_note?: string | null;
};

function getResultPoints({
  league,
  didWin,
  didLose,
}: {
  league: string;
  didWin: boolean;
  didLose: boolean;
}) {
  if (!didWin && !didLose) return 0;

  if (league === "competitive") {
    if (didWin) return 3;
    if (didLose) return -1;
  }

  if (league === "recreational") {
    if (didWin) return 1;
    if (didLose) return -2;
  }

  return 0;
}

export default async function StandingsPage() {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, name, league, playoff_disqualified, playoff_disqualification_reason, playoff_disqualified_at"
    );

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(
      `
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      league,
      weight,
      is_forfeit,
      forfeit_team_id,
      forfeit_note
    `
    )
    .eq("status", "completed");

  if (teamsError || gamesError) {
    return (
      <PageShell title="Standings">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {teamsError?.message || gamesError?.message}
        </div>
      </PageShell>
    );
  }

  const standings = (teams || []).map((team: Team) => {
    let wins = 0;
    let losses = 0;
    let gamesPlayed = 0;
    let forfeits = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let standingPoints = 0;

    (games || []).forEach((game: Game) => {
      const isHome = game.home_team_id === team.id;
      const isAway = game.away_team_id === team.id;

      if (!isHome && !isAway) return;

      gamesPlayed += 1;

      const teamScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;

      pointsFor += teamScore;
      pointsAgainst += opponentScore;

      const didWin = teamScore > opponentScore;
      const didLose = teamScore < opponentScore;
      const didForfeit = Boolean(
        game.is_forfeit && game.forfeit_team_id === team.id
      );

      if (didWin) wins += 1;
      if (didLose) losses += 1;

      if (didForfeit) {
        forfeits += 1;
        standingPoints -= 3;
      } else {
        standingPoints += getResultPoints({
          league: game.league,
          didWin,
          didLose,
        });
      }
    });

    return {
      id: team.id,
      name: team.name,
      league: team.league,
      gamesPlayed,
      wins,
      losses,
      forfeits,
      pointsFor,
      pointsAgainst,
      differential: pointsFor - pointsAgainst,
      standingPoints,
      playoffDisqualified: Boolean(team.playoff_disqualified),
      playoffDisqualificationReason:
        team.playoff_disqualification_reason || "",
      playoffDisqualifiedAt: team.playoff_disqualified_at || null,
    };
  });

  standings.sort((a, b) => {
    if (a.playoffDisqualified !== b.playoffDisqualified) {
      return a.playoffDisqualified ? 1 : -1;
    }

    if (b.standingPoints !== a.standingPoints) {
      return b.standingPoints - a.standingPoints;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    return b.differential - a.differential;
  });

  const disqualifiedTeams = standings.filter(
    (team) => team.playoffDisqualified
  );

  return (
    <PageShell
      title="Standings"
      subtitle="Regular season playoff seeding, standings points, forfeits, and playoff eligibility."
    >
      {disqualifiedTeams.length > 0 && (
        <section className="mb-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-200">
            Playoff eligibility update
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {disqualifiedTeams.length === 1
              ? "1 team has been disqualified from playoffs"
              : `${disqualifiedTeams.length} teams have been disqualified from playoffs`}
          </h2>

          <div className="mt-4 grid gap-3">
            {disqualifiedTeams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl border border-red-500/25 bg-black/20 p-4"
              >
                <p className="font-black text-red-100">{team.name}</p>

                <p className="mt-1 text-sm text-red-100/70">
                  {team.playoffDisqualificationReason ||
                    "Disqualified from playoff eligibility."}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30">
        <p className="font-black text-[#F3EEE6]">
          Regular season playoff seeding:
        </p>

        <ul className="mt-3 grid gap-2 text-sm text-red-100/75 md:grid-cols-2">
          <li>Competitive win = +3 points</li>
          <li>Competitive loss = -1 point</li>
          <li>Recreational win = +1 point</li>
          <li>Recreational loss = -2 points</li>
          <li>Forfeit = -3 total points for forfeiting team</li>
          <li>Playoff-disqualified teams are shown below eligible teams</li>
        </ul>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 shadow-2xl shadow-black/30">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead className="bg-[#C4963E]/15 text-left">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Team</th>
              <th className="p-4">League</th>
              <th className="p-4">Playoffs</th>
              <th className="p-4">GP</th>
              <th className="p-4">W</th>
              <th className="p-4">L</th>
              <th className="p-4">F</th>
              <th className="p-4">Seeding Pts</th>
              <th className="p-4">PF</th>
              <th className="p-4">PA</th>
              <th className="p-4">Diff</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((team, index) => (
              <tr
                key={team.id}
                className={`border-t border-[#C4963E]/15 ${
                  team.playoffDisqualified ? "bg-red-500/10" : ""
                }`}
              >
                <td className="p-4 font-black text-white">
                  {team.playoffDisqualified ? "DQ" : index + 1}
                </td>

                <td className="p-4">
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-black text-white hover:text-[#C4963E]"
                  >
                    {team.name}
                  </Link>

                  {team.playoffDisqualified &&
                    team.playoffDisqualificationReason && (
                      <p className="mt-1 max-w-sm text-xs text-red-100/60">
                        {team.playoffDisqualificationReason}
                      </p>
                    )}
                </td>

                <td className="p-4">
                  <LeagueBadge league={team.league} />
                </td>

                <td className="p-4">
                  {team.playoffDisqualified ? (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">
                      Disqualified
                    </span>
                  ) : (
                    <span className="rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-300">
                      Eligible
                    </span>
                  )}
                </td>

                <td className="p-4">{team.gamesPlayed}</td>
                <td className="p-4">{team.wins}</td>
                <td className="p-4">{team.losses}</td>

                <td className="p-4">
                  {team.forfeits > 0 ? (
                    <span className="rounded-full bg-red-500/20 px-3 py-1 font-black text-red-200">
                      {team.forfeits}
                    </span>
                  ) : (
                    0
                  )}
                </td>

                <td className="p-4 font-black text-[#F3EEE6]">
                  {team.standingPoints}
                </td>

                <td className="p-4">{team.pointsFor}</td>
                <td className="p-4">{team.pointsAgainst}</td>
                <td className="p-4">{team.differential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-red-100/55">
        Current ranking: playoff eligibility first, then seeding points, then
        wins, then score differential. A forfeit is exactly -3 total points for
        the forfeiting team.
      </p>
    </PageShell>
  );
}