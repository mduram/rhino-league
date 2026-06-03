export const LEAGUE_TIME_ZONE = "America/New_York";

export function formatLeagueDateTime(value: string | null | undefined) {
  if (!value) return "Time TBD";

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatLeagueTime(value: string | null | undefined) {
  if (!value) return "Time TBD";

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatLeagueDate(value: string | null | undefined) {
  if (!value) return "Date TBD";

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}