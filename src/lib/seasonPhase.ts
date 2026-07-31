export const SEASON_PHASE = {
  year: 2026,

  // The regular season is final and the official playoff experience is live.
  regularSeasonComplete: true,
  playoffSchedulePublished: true,
  playoffBettingOpen: true,
  playoffBracketChallengeOpen: true,

  // World Cup betting has been retired for the rest of the Rhino season.
  worldCupBettingOpen: false,
} as const;

export const REGULAR_SEASON_FUTURES_SLUGS = [
  "regular-season-top",
  "regular-season-bottom",
] as const;

export const PLAYOFF_FUTURES_SLUGS = [
  "tournament-winner",
  "playoff-runner-up",
] as const;

export function isRegularSeasonFuturesSlug(slug?: string | null) {
  return REGULAR_SEASON_FUTURES_SLUGS.includes(
    slug as (typeof REGULAR_SEASON_FUTURES_SLUGS)[number]
  );
}

export function isPlayoffFuturesSlug(slug?: string | null) {
  return PLAYOFF_FUTURES_SLUGS.includes(
    slug as (typeof PLAYOFF_FUTURES_SLUGS)[number]
  );
}
