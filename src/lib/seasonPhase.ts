export const SEASON_PHASE = {
  year: 2026,

  // Release switches for the playoff handoff. Keep these false until the
  // commissioner is ready to publish the official bracket on Friday.
  regularSeasonComplete: false,
  playoffSchedulePublished: false,
  playoffBettingOpen: false,
  playoffBracketChallengeOpen: false,

  // World Cup betting has been retired for the rest of the Rhino season.
  worldCupBettingOpen: false,
} as const;

export const REGULAR_SEASON_FUTURES_SLUGS = [
  "regular-season-top",
  "regular-season-bottom",
] as const;

export function isRegularSeasonFuturesSlug(slug?: string | null) {
  return REGULAR_SEASON_FUTURES_SLUGS.includes(
    slug as (typeof REGULAR_SEASON_FUTURES_SLUGS)[number]
  );
}
