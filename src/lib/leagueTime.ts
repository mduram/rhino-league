export const LEAGUE_TIME_ZONE = "America/New_York";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

function getLeagueDateParts(
  value: string | Date | null | undefined
): DateParts | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
    weekday: getPart("weekday"),
  };
}

export function formatLeagueDateTime(
  value: string | Date | null | undefined
) {
  if (!value) return "Time TBD";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatLeagueTime(
  value: string | Date | null | undefined
) {
  if (!value) return "Time TBD";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatLeagueDate(
  value: string | Date | null | undefined
) {
  if (!value) return "Date TBD";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatLeagueLongDate(
  value: string | Date | null | undefined
) {
  if (!value) return "Date TBD";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getLeagueDateKey(
  value: string | Date | null | undefined
) {
  const parts = getLeagueDateParts(value);

  if (!parts) return "";

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function getLeagueHour(
  value: string | Date | null | undefined
) {
  const parts = getLeagueDateParts(value);
  return parts?.hour ?? null;
}

export function getLeagueMinute(
  value: string | Date | null | undefined
) {
  const parts = getLeagueDateParts(value);
  return parts?.minute ?? null;
}

export function getLeagueWeekday(
  value: string | Date | null | undefined
) {
  const parts = getLeagueDateParts(value);
  return parts?.weekday || "";
}