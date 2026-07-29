export type StandingsTeam = {
  id: string;
  name: string;
  league: string;
  logo_url?: string | null;
  playoff_disqualified?: boolean | null;
  playoff_disqualification_reason?: string | null;
  playoff_disqualified_at?: string | null;
};

export type StandingsGame = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status?: string;
  league: string;
  is_forfeit?: boolean | null;
  forfeit_team_id?: string | null;
};

export type CalculatedStanding = {
  id: string;
  name: string;
  league: string;
  logo_url: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  forfeits: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
  standingPoints: number;
  playoffDisqualified: boolean;
  playoffDisqualificationReason: string;
  playoffDisqualifiedAt: string | null;
};

export function getResultPoints({
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

export function calculateStandings({
  teams,
  games,
}: {
  teams: StandingsTeam[];
  games: StandingsGame[];
}) {
  return teams
    .map((team) => {
      let wins = 0;
      let losses = 0;
      let gamesPlayed = 0;
      let forfeits = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let standingPoints = 0;

      games.forEach((game) => {
        if (game.status && game.status !== "completed") return;

        const isHome = game.home_team_id === team.id;
        const isAway = game.away_team_id === team.id;

        if (!isHome && !isAway) return;

        gamesPlayed += 1;

        const teamScore = Number(isHome ? game.home_score : game.away_score);
        const opponentScore = Number(
          isHome ? game.away_score : game.home_score
        );

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
        logo_url: team.logo_url || null,
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
      } satisfies CalculatedStanding;
    })
    .sort((a, b) => {
      if (a.playoffDisqualified !== b.playoffDisqualified) {
        return a.playoffDisqualified ? 1 : -1;
      }

      if (b.standingPoints !== a.standingPoints) {
        return b.standingPoints - a.standingPoints;
      }

      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.differential !== a.differential) {
        return b.differential - a.differential;
      }

      return a.name.localeCompare(b.name);
    });
}
