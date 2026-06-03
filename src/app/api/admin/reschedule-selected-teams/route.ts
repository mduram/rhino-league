import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidAdminToken } from "@/lib/adminAuth";

type League = "competitive" | "recreational";

type Team = {
  id: string;
  name: string;
  league: League;
  not_available?: string | null;
  preferred_game_time?: string | null;
  preferred_day_notes?: string | null;
};

type ExistingGame = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  league: League;
  status: string;
  scheduled_at: string | null;
  location: string | null;
  court?: string | null;
  weight?: number | null;
  round_label?: string | null;
  pool_group?: string | null;
};

type CandidateGame = {
  homeTeam: Team;
  awayTeam: Team;
  league: League;
  matchupKey: string;
  repeatNumber: number;
  originalGameId: string;
  originalPoolGroup: string | null;
  originalRoundLabel: string | null;
};

type Slot = {
  date: string;
  hour: number;
  label: string;
  scheduledAt: string;
  dayName: string;
  weekKey: string;
  dateObject: Date;
};

const TIME_SLOTS = [
  { hour: 9, label: "9-10am" },
  { hour: 10, label: "10-11am" },
  { hour: 12, label: "12-1pm" },
  { hour: 15, label: "3-4pm" },
  { hour: 16, label: "4-5pm" },
];

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_BLOCKED_DATES = [
  "2026-06-19",
  "2026-07-03",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function parseDateInput(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const copy = new Date(`${toDateString(date)}T00:00:00`);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMonday(date: Date) {
  const copy = new Date(`${toDateString(date)}T00:00:00`);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getWeekKey(date: Date) {
  return toDateString(getMonday(date));
}

function dayDifference(dateA: Date, dateB: Date) {
  const a = new Date(`${toDateString(dateA)}T00:00:00`).getTime();
  const b = new Date(`${toDateString(dateB)}T00:00:00`).getTime();
  return Math.abs(Math.round((a - b) / 86400000));
}

function buildLocalIso(dateString: string, hour: number) {
  const localDate = new Date(`${dateString}T${pad2(hour)}:00:00`);
  return localDate.toISOString();
}

function normalizeText(value?: string | null) {
  return (value || "").toLowerCase();
}

function textMentionsDay(text: string, dayName: string) {
  const short = dayName.slice(0, 3);
  return text.includes(dayName) || text.includes(short);
}

function textMentionsHour(text: string, hour: number) {
  const hour12 = hour > 12 ? hour - 12 : hour;

  const patterns = [
    `${hour}`,
    `${hour}:00`,
    `${hour12}`,
    `${hour12}:00`,
    `${hour12}am`,
    `${hour12}pm`,
  ];

  if (hour === 9) patterns.push("9-10", "9 to 10", "9am", "9 am");
  if (hour === 10) patterns.push("10-11", "10 to 11", "10am", "10 am");
  if (hour === 12)
    patterns.push("12-1", "12 to 1", "12pm", "12 pm", "noon", "lunch");
  if (hour === 15) patterns.push("3-4", "3 to 4", "3pm", "3 pm");
  if (hour === 16) patterns.push("4-5", "4 to 5", "4pm", "4 pm");

  return patterns.some((pattern) => text.includes(pattern));
}

function textMentionsMorning(text: string) {
  return text.includes("morning") || text.includes("am");
}

function textMentionsAfternoon(text: string) {
  return text.includes("afternoon") || text.includes("pm");
}

function isMorning(hour: number) {
  return hour < 12;
}

function isAfternoon(hour: number) {
  return hour >= 12;
}

function getMatchupKey(teamAId: string, teamBId: string) {
  return [teamAId, teamBId].sort().join("__");
}

function parseBlockedDates(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function slotKeyFromDateAndHour(dateString: string, hour: number) {
  return `${dateString}_${hour}`;
}

function slotKeyFromScheduledAt(scheduledAt: string | null) {
  if (!scheduledAt) return null;

  const date = new Date(scheduledAt);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;

  if (!year || !month || !day || !hour) return null;

  return `${year}-${month}-${day}_${Number(hour)}`;
}

function dateObjectFromScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function preferenceScore(team: Team, slot: Slot) {
  const unavailable = normalizeText(team.not_available);
  const preferredTime = normalizeText(team.preferred_game_time);
  const preferredDay = normalizeText(team.preferred_day_notes);

  let score = 0;
  const notes: string[] = [];

  if (
    textMentionsDay(unavailable, slot.dayName) ||
    textMentionsHour(unavailable, slot.hour) ||
    (textMentionsMorning(unavailable) && isMorning(slot.hour)) ||
    (textMentionsAfternoon(unavailable) && isAfternoon(slot.hour))
  ) {
    score -= 1000;
    notes.push(`${team.name} may be unavailable`);
  }

  if (
    textMentionsHour(preferredTime, slot.hour) ||
    (textMentionsMorning(preferredTime) && isMorning(slot.hour)) ||
    (textMentionsAfternoon(preferredTime) && isAfternoon(slot.hour))
  ) {
    score += 15;
    notes.push(`${team.name} preferred time`);
  }

  if (textMentionsDay(preferredDay, slot.dayName)) {
    const saysNot =
      preferredDay.includes("not") ||
      preferredDay.includes("avoid") ||
      preferredDay.includes("can't") ||
      preferredDay.includes("cannot") ||
      preferredDay.includes("dont") ||
      preferredDay.includes("don't");

    if (saysNot) {
      score -= 700;
      notes.push(`${team.name} may prefer not to play this day`);
    } else {
      score += 10;
      notes.push(`${team.name} preferred day`);
    }
  }

  return { score, notes };
}

function spacingScoreForTeam({
  team,
  slot,
  teamScheduledDates,
  teamGamesByWeek,
  maxGamesPerWeek,
  idealDaysBetweenGames,
  minimumDaysBetweenGames,
}: {
  team: Team;
  slot: Slot;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
  maxGamesPerWeek: number;
  idealDaysBetweenGames: number;
  minimumDaysBetweenGames: number;
}) {
  let score = 0;
  const notes: string[] = [];

  const scheduledDates = teamScheduledDates.get(team.id) || [];

  for (const scheduledDate of scheduledDates) {
    const daysApart = dayDifference(slot.dateObject, scheduledDate);

    if (daysApart === 0) {
      score -= 1000;
      notes.push(`${team.name} already has a game that day`);
    } else if (daysApart < minimumDaysBetweenGames) {
      score -= 700;
      notes.push(
        `${team.name} has less than ${minimumDaysBetweenGames} day between games`
      );
    } else if (daysApart < idealDaysBetweenGames) {
      score -= 150;
      notes.push(`${team.name} has only ${daysApart} day between games`);
    } else if (daysApart === idealDaysBetweenGames) {
      score += 10;
      notes.push(`${team.name} has good rest spacing`);
    } else {
      score += 4;
    }
  }

  const weekMap = teamGamesByWeek.get(team.id) || new Map<string, number>();
  const weekCount = weekMap.get(slot.weekKey) || 0;

  if (weekCount >= maxGamesPerWeek) {
    score -= 1000;
    notes.push(`${team.name} would exceed ${maxGamesPerWeek} games this week`);
  } else if (weekCount === 0) {
    score += 80;
    notes.push(`${team.name} has no game this week`);
  } else if (weekCount === 1) {
    score -= 40;
    notes.push(`${team.name} would reach weekly max soon`);
  }

  return { score, notes };
}

function repeatMatchupSpacingScore({
  game,
  slot,
  matchupScheduledDates,
}: {
  game: CandidateGame;
  slot: Slot;
  matchupScheduledDates: Map<string, Date[]>;
}) {
  let score = 0;
  const notes: string[] = [];

  const previousDates = matchupScheduledDates.get(game.matchupKey) || [];

  for (const previousDate of previousDates) {
    const daysApart = dayDifference(slot.dateObject, previousDate);

    if (game.league === "recreational") {
      score -= 1000;
      notes.push("recreational repeat matchup blocked");
    }

    if (game.league === "competitive") {
      if (daysApart < 7) {
        score -= 700;
        notes.push("competitive repeat matchup too close");
      } else if (daysApart < 14) {
        score -= 180;
        notes.push("competitive repeat matchup within two weeks");
      } else {
        score -= 35;
        notes.push("competitive repeat matchup");
      }
    }
  }

  return { score, notes };
}

function scoreGameSlot({
  game,
  slot,
  teamScheduledDates,
  teamGamesByWeek,
  matchupScheduledDates,
  maxGamesPerWeek,
  idealDaysBetweenGames,
  minimumDaysBetweenGames,
}: {
  game: CandidateGame;
  slot: Slot;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
  matchupScheduledDates: Map<string, Date[]>;
  maxGamesPerWeek: number;
  idealDaysBetweenGames: number;
  minimumDaysBetweenGames: number;
}) {
  let score = 100;
  const notes: string[] = [];

  const homePreference = preferenceScore(game.homeTeam, slot);
  const awayPreference = preferenceScore(game.awayTeam, slot);

  score += homePreference.score;
  score += awayPreference.score;
  notes.push(...homePreference.notes, ...awayPreference.notes);

  const homeSpacing = spacingScoreForTeam({
    team: game.homeTeam,
    slot,
    teamScheduledDates,
    teamGamesByWeek,
    maxGamesPerWeek,
    idealDaysBetweenGames,
    minimumDaysBetweenGames,
  });

  const awaySpacing = spacingScoreForTeam({
    team: game.awayTeam,
    slot,
    teamScheduledDates,
    teamGamesByWeek,
    maxGamesPerWeek,
    idealDaysBetweenGames,
    minimumDaysBetweenGames,
  });

  score += homeSpacing.score;
  score += awaySpacing.score;
  notes.push(...homeSpacing.notes, ...awaySpacing.notes);

  const repeatSpacing = repeatMatchupSpacingScore({
    game,
    slot,
    matchupScheduledDates,
  });

  score += repeatSpacing.score;
  notes.push(...repeatSpacing.notes);

  return { score, notes };
}

function generateSlots({
  startDate,
  endDate,
  blockedDates,
  occupiedSlotKeys,
}: {
  startDate: string;
  endDate: string;
  blockedDates: string[];
  occupiedSlotKeys: Set<string>;
}) {
  const slots: Slot[] = [];
  const blockedDateSet = new Set(blockedDates);
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  let cursor = start;

  while (cursor <= end) {
    const day = cursor.getDay();
    const dayName = DAY_NAMES[day];
    const dateString = toDateString(cursor);
    const isBlockedDate = blockedDateSet.has(dateString);

    if (day >= 1 && day <= 5 && !isBlockedDate) {
      for (const timeSlot of TIME_SLOTS) {
        const fridayAfter4 = day === 5 && timeSlot.hour >= 16;
        const slotKey = slotKeyFromDateAndHour(dateString, timeSlot.hour);

        if (!fridayAfter4 && !occupiedSlotKeys.has(slotKey)) {
          slots.push({
            date: dateString,
            dayName,
            hour: timeSlot.hour,
            label: timeSlot.label,
            scheduledAt: buildLocalIso(dateString, timeSlot.hour),
            weekKey: getWeekKey(cursor),
            dateObject: new Date(`${dateString}T00:00:00`),
          });
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  return slots;
}

function gameWeightForLeague(league: League) {
  return league === "competitive" ? 3 : 1;
}

function addScheduledTeamDate({
  teamId,
  dateObject,
  weekKey,
  teamScheduledDates,
  teamGamesByWeek,
}: {
  teamId: string;
  dateObject: Date;
  weekKey: string;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
}) {
  const dates = teamScheduledDates.get(teamId) || [];
  dates.push(dateObject);
  teamScheduledDates.set(teamId, dates);

  const weekMap = teamGamesByWeek.get(teamId) || new Map<string, number>();
  weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  teamGamesByWeek.set(teamId, weekMap);
}

function addScheduledMatchupDate({
  matchupKey,
  dateObject,
  matchupScheduledDates,
}: {
  matchupKey: string;
  dateObject: Date;
  matchupScheduledDates: Map<string, Date[]>;
}) {
  const dates = matchupScheduledDates.get(matchupKey) || [];
  dates.push(dateObject);
  matchupScheduledDates.set(matchupKey, dates);
}

function isAutoSchedulerGame(game: ExistingGame) {
  const poolGroup = game.pool_group || "";

  return (
    poolGroup.toLowerCase().startsWith("auto scheduled") ||
    poolGroup.toLowerCase().startsWith("auto scheduler")
  );
}

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    selectedTeamIds,
    startDate,
    endDate,
    maxGamesPerWeek,
    idealDaysBetweenGames,
    minimumDaysBetweenGames,
    blockedDates,
    location,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!Array.isArray(selectedTeamIds) || selectedTeamIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one team to reschedule." },
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start date and end date are required." },
      { status: 400 }
    );
  }

  const selectedSet = new Set(selectedTeamIds.map(String));
  const parsedMaxGamesPerWeek = Number(maxGamesPerWeek || 2);
  const parsedIdealDaysBetweenGames = Number(idealDaysBetweenGames || 2);
  const parsedMinimumDaysBetweenGames = Number(minimumDaysBetweenGames || 1);

  const parsedBlockedDates = [
    ...new Set([...DEFAULT_BLOCKED_DATES, ...parseBlockedDates(blockedDates)]),
  ];

  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select(`
      id,
      name,
      league,
      not_available,
      preferred_game_time,
      preferred_day_notes
    `);

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const typedTeams = (teams || []) as Team[];
  const teamById = new Map(typedTeams.map((team) => [team.id, team]));

  const { data: games, error: gamesError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      home_team_id,
      away_team_id,
      league,
      status,
      scheduled_at,
      location,
      court,
      weight,
      round_label,
      pool_group
    `);

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 });
  }

  const existingGames = (games || []) as ExistingGame[];

  const affectedGames = existingGames.filter((game) => {
    const involvesSelectedTeam =
      selectedSet.has(game.home_team_id) || selectedSet.has(game.away_team_id);

    return (
      involvesSelectedTeam &&
      isAutoSchedulerGame(game) &&
      game.status !== "completed"
    );
  });

  if (affectedGames.length === 0) {
    return NextResponse.json({
      success: true,
      rescheduled: 0,
      unscheduled: 0,
      deletedOldGames: 0,
      message:
        "No non-completed auto-scheduled games were found for the selected teams.",
      report: [],
    });
  }

  const affectedIds = affectedGames.map((game) => game.id);
  const affectedIdSet = new Set(affectedIds);

  const lockedGames = existingGames.filter((game) => {
    return !affectedIdSet.has(game.id) && game.scheduled_at;
  });

  const occupiedSlotKeys = new Set<string>();
  const teamScheduledDates = new Map<string, Date[]>();
  const teamGamesByWeek = new Map<string, Map<string, number>>();
  const matchupScheduledDates = new Map<string, Date[]>();

  lockedGames.forEach((game) => {
    if (!game.scheduled_at) return;

    const slotKey = slotKeyFromScheduledAt(game.scheduled_at);
    if (slotKey) occupiedSlotKeys.add(slotKey);

    const dateObject = dateObjectFromScheduledAt(game.scheduled_at);
    const weekKey = getWeekKey(dateObject);
    const matchupKey = getMatchupKey(game.home_team_id, game.away_team_id);

    addScheduledTeamDate({
      teamId: game.home_team_id,
      dateObject,
      weekKey,
      teamScheduledDates,
      teamGamesByWeek,
    });

    addScheduledTeamDate({
      teamId: game.away_team_id,
      dateObject,
      weekKey,
      teamScheduledDates,
      teamGamesByWeek,
    });

    addScheduledMatchupDate({
      matchupKey,
      dateObject,
      matchupScheduledDates,
    });
  });

  const candidateGames: CandidateGame[] = [];

  affectedGames.forEach((game) => {
    const homeTeam = teamById.get(game.home_team_id);
    const awayTeam = teamById.get(game.away_team_id);

    if (!homeTeam || !awayTeam) return;

    candidateGames.push({
      homeTeam,
      awayTeam,
      league: game.league,
      matchupKey: getMatchupKey(game.home_team_id, game.away_team_id),
      repeatNumber: 1,
      originalGameId: game.id,
      originalPoolGroup: game.pool_group || null,
      originalRoundLabel: game.round_label || null,
    });
  });

  const { error: deleteError } = await supabaseAdmin
    .from("games")
    .delete()
    .in("id", affectedIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const availableSlots = generateSlots({
    startDate,
    endDate,
    blockedDates: parsedBlockedDates,
    occupiedSlotKeys,
  });

  const remainingGames = [...candidateGames];
  const scheduledRows: any[] = [];
  const unscheduledRows: any[] = [];
  const report: any[] = [];

  while (remainingGames.length > 0) {
    let bestGameIndex = -1;
    let bestSlotIndex = -1;
    let bestScore = -Infinity;
    let bestNotes: string[] = [];

    for (let gameIndex = 0; gameIndex < remainingGames.length; gameIndex++) {
      const game = remainingGames[gameIndex];

      for (let slotIndex = 0; slotIndex < availableSlots.length; slotIndex++) {
        const slot = availableSlots[slotIndex];

        const scored = scoreGameSlot({
          game,
          slot,
          teamScheduledDates,
          teamGamesByWeek,
          matchupScheduledDates,
          maxGamesPerWeek: parsedMaxGamesPerWeek,
          idealDaysBetweenGames: parsedIdealDaysBetweenGames,
          minimumDaysBetweenGames: parsedMinimumDaysBetweenGames,
        });

        if (scored.score > bestScore) {
          bestScore = scored.score;
          bestGameIndex = gameIndex;
          bestSlotIndex = slotIndex;
          bestNotes = scored.notes;
        }
      }
    }

    if (bestGameIndex < 0 || bestSlotIndex < 0 || bestScore < -500) {
      const game = remainingGames.shift();

      if (game) {
        unscheduledRows.push({
          home_team_id: game.homeTeam.id,
          away_team_id: game.awayTeam.id,
          league: game.league,
          status: "unscheduled",
          scheduled_at: null,
          location: null,
          court: null,
          weight: gameWeightForLeague(game.league),
          round_label: game.originalRoundLabel || "Regular Season",
          pool_group: "Auto Scheduler Could Not Place",
        });

        report.push({
          game: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
          league: game.league,
          status: "unscheduled",
          score: bestScore,
          notes: bestNotes.length
            ? bestNotes
            : ["could not place without breaking constraints"],
        });
      }

      continue;
    }

    const game = remainingGames.splice(bestGameIndex, 1)[0];
    const slot = availableSlots.splice(bestSlotIndex, 1)[0];

    addScheduledTeamDate({
      teamId: game.homeTeam.id,
      dateObject: slot.dateObject,
      weekKey: slot.weekKey,
      teamScheduledDates,
      teamGamesByWeek,
    });

    addScheduledTeamDate({
      teamId: game.awayTeam.id,
      dateObject: slot.dateObject,
      weekKey: slot.weekKey,
      teamScheduledDates,
      teamGamesByWeek,
    });

    addScheduledMatchupDate({
      matchupKey: game.matchupKey,
      dateObject: slot.dateObject,
      matchupScheduledDates,
    });

    occupiedSlotKeys.add(slotKeyFromDateAndHour(slot.date, slot.hour));

    scheduledRows.push({
      home_team_id: game.homeTeam.id,
      away_team_id: game.awayTeam.id,
      league: game.league,
      status: "scheduled",
      scheduled_at: slot.scheduledAt,
      location: location || "Court",
      court: location || "Court",
      weight: gameWeightForLeague(game.league),
      round_label: game.originalRoundLabel || "Regular Season",
      pool_group: game.originalPoolGroup || "Auto Scheduled",
    });

    report.push({
      game: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
      league: game.league,
      status: "rescheduled",
      scheduledAt: slot.scheduledAt,
      slot: `${slot.dayName} ${slot.label}`,
      score: bestScore,
      notes: bestNotes,
    });
  }

  const rowsToInsert = [...scheduledRows, ...unscheduledRows];

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("games")
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    deletedOldGames: affectedIds.length,
    rescheduled: scheduledRows.length,
    unscheduled: unscheduledRows.length,
    selectedTeamIds,
    blockedDates: parsedBlockedDates,
    message: `Rescheduled ${scheduledRows.length} games and left ${unscheduledRows.length} unscheduled.`,
    report,
  });
}