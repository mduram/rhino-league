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

type CandidateGame = {
  homeTeam: Team;
  awayTeam: Team;
  league: League;
  matchupKey: string;
  repeatNumber: number;
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
  "2026-06-19", // Juneteenth
  "2026-07-03", // Friday before July 4
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

function daysFromStart(startDate: string, slotDate: Date) {
  return dayDifference(parseDateInput(startDate), slotDate);
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
    score += 120;
    notes.push(`${team.name} has no game this week`);
  } else if (weekCount === 1) {
    score -= 40;
    notes.push(`${team.name} would reach weekly max soon`);
  }

  return { score, notes };
}

function weeklyCoverageScoreForTeam({
  team,
  slot,
  teamScheduledDates,
  teamGamesByWeek,
  teamTotalScheduled,
  startDate,
}: {
  team: Team;
  slot: Slot;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
  teamTotalScheduled: Map<string, number>;
  startDate: string;
}) {
  let score = 0;
  const notes: string[] = [];

  const totalGames = teamTotalScheduled.get(team.id) || 0;
  const weekMap = teamGamesByWeek.get(team.id) || new Map<string, number>();
  const weekCount = weekMap.get(slot.weekKey) || 0;

  if (totalGames === 0) {
    score += 180;
    notes.push(`${team.name} would get first game`);
  }

  if (weekCount === 0) {
    score += 100;
    notes.push(`${team.name} would play this week`);
  }

  const scheduledDates = teamScheduledDates.get(team.id) || [];

  if (scheduledDates.length > 0) {
    const mostRecentGame = scheduledDates
      .slice()
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const daysSinceLastGame = dayDifference(slot.dateObject, mostRecentGame);

    if (daysSinceLastGame >= 5 && daysSinceLastGame <= 9) {
      score += 75;
      notes.push(`${team.name} gets weekly rhythm`);
    }

    if (daysSinceLastGame > 9) {
      score += 120;
      notes.push(`${team.name} has waited a long time`);
    }
  }

  const daysFromLeagueStart = daysFromStart(startDate, slot.dateObject);

  if (totalGames === 0) {
    score -= daysFromLeagueStart * 4;
  } else {
    score -= daysFromLeagueStart * 0.5;
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
  teamTotalScheduled,
  matchupCounts,
  matchupScheduledDates,
  maxGamesPerWeek,
  idealDaysBetweenGames,
  minimumDaysBetweenGames,
  startDate,
}: {
  game: CandidateGame;
  slot: Slot;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
  teamTotalScheduled: Map<string, number>;
  matchupCounts: Map<string, number>;
  matchupScheduledDates: Map<string, Date[]>;
  maxGamesPerWeek: number;
  idealDaysBetweenGames: number;
  minimumDaysBetweenGames: number;
  startDate: string;
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

  const homeWeeklyCoverage = weeklyCoverageScoreForTeam({
    team: game.homeTeam,
    slot,
    teamScheduledDates,
    teamGamesByWeek,
    teamTotalScheduled,
    startDate,
  });

  const awayWeeklyCoverage = weeklyCoverageScoreForTeam({
    team: game.awayTeam,
    slot,
    teamScheduledDates,
    teamGamesByWeek,
    teamTotalScheduled,
    startDate,
  });

  score += homeWeeklyCoverage.score;
  score += awayWeeklyCoverage.score;
  notes.push(...homeWeeklyCoverage.notes, ...awayWeeklyCoverage.notes);

  const repeatSpacing = repeatMatchupSpacingScore({
    game,
    slot,
    matchupScheduledDates,
  });

  score += repeatSpacing.score;
  notes.push(...repeatSpacing.notes);

  const homeTotal = teamTotalScheduled.get(game.homeTeam.id) || 0;
  const awayTotal = teamTotalScheduled.get(game.awayTeam.id) || 0;

  score -= Math.max(homeTotal, awayTotal) * 3;

  const existingMatchupCount = matchupCounts.get(game.matchupKey) || 0;

  if (existingMatchupCount > 0 && game.league === "recreational") {
    score -= 1000;
    notes.push("repeat recreational matchup blocked");
  }

  if (existingMatchupCount > 0 && game.league === "competitive") {
    score -= 35;
    notes.push("repeat competitive matchup");
  }

  return { score, notes };
}

function generateSlots({
  startDate,
  endDate,
  blockedDates,
}: {
  startDate: string;
  endDate: string;
  blockedDates: string[];
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

        if (!fridayAfter4) {
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

function generatePairings(teams: Team[], gamesPerTeam: number, league: League) {
  const pairings: CandidateGame[] = [];
  const teamCounts = new Map<string, number>();
  const matchupRepeatCounts = new Map<string, number>();

  teams.forEach((team) => teamCounts.set(team.id, 0));

  if (teams.length < 2 || gamesPerTeam < 1) {
    return pairings;
  }

  const uniquePairs: CandidateGame[] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const matchupKey = getMatchupKey(teams[i].id, teams[j].id);

      uniquePairs.push({
        homeTeam: teams[i],
        awayTeam: teams[j],
        league,
        matchupKey,
        repeatNumber: 1,
      });
    }
  }

  let availablePairs = [...uniquePairs];

  while (true) {
    const allTeamsReachedTarget = teams.every(
      (team) => (teamCounts.get(team.id) || 0) >= gamesPerTeam
    );

    if (allTeamsReachedTarget) break;

    if (availablePairs.length === 0) {
      if (league === "competitive") {
        availablePairs = uniquePairs.map((pair) => {
          const currentRepeatCount =
            matchupRepeatCounts.get(pair.matchupKey) || 0;

          return {
            ...pair,
            repeatNumber: currentRepeatCount + 1,
          };
        });
      } else {
        break;
      }
    }

    const eligiblePairs = availablePairs
      .filter((pair) => {
        const homeCount = teamCounts.get(pair.homeTeam.id) || 0;
        const awayCount = teamCounts.get(pair.awayTeam.id) || 0;

        return homeCount < gamesPerTeam || awayCount < gamesPerTeam;
      })
      .sort((a, b) => {
        const aHomeCount = teamCounts.get(a.homeTeam.id) || 0;
        const aAwayCount = teamCounts.get(a.awayTeam.id) || 0;
        const bHomeCount = teamCounts.get(b.homeTeam.id) || 0;
        const bAwayCount = teamCounts.get(b.awayTeam.id) || 0;

        const aMax = Math.max(aHomeCount, aAwayCount);
        const bMax = Math.max(bHomeCount, bAwayCount);

        if (aMax !== bMax) return aMax - bMax;

        const aRepeat = matchupRepeatCounts.get(a.matchupKey) || 0;
        const bRepeat = matchupRepeatCounts.get(b.matchupKey) || 0;

        if (aRepeat !== bRepeat) return aRepeat - bRepeat;

        return aHomeCount + aAwayCount - (bHomeCount + bAwayCount);
      });

    if (eligiblePairs.length === 0) break;

    const pair = eligiblePairs[0];

    const homeCount = teamCounts.get(pair.homeTeam.id) || 0;
    const awayCount = teamCounts.get(pair.awayTeam.id) || 0;

    const shouldFlipHomeAway = awayCount > homeCount;

    const finalPair = shouldFlipHomeAway
      ? {
          ...pair,
          homeTeam: pair.awayTeam,
          awayTeam: pair.homeTeam,
        }
      : pair;

    const currentRepeatCount = matchupRepeatCounts.get(pair.matchupKey) || 0;

    pairings.push({
      ...finalPair,
      repeatNumber: currentRepeatCount + 1,
    });

    teamCounts.set(pair.homeTeam.id, homeCount + 1);
    teamCounts.set(pair.awayTeam.id, awayCount + 1);
    matchupRepeatCounts.set(pair.matchupKey, currentRepeatCount + 1);

    const index = availablePairs.findIndex(
      (existingPair) =>
        existingPair.homeTeam.id === pair.homeTeam.id &&
        existingPair.awayTeam.id === pair.awayTeam.id &&
        existingPair.matchupKey === pair.matchupKey
    );

    if (index >= 0) {
      availablePairs.splice(index, 1);
    }
  }

  return pairings;
}

function gameWeightForLeague(league: League) {
  return league === "competitive" ? 3 : 1;
}

function addScheduledTeamDate({
  teamId,
  slot,
  teamScheduledDates,
  teamGamesByWeek,
  teamTotalScheduled,
}: {
  teamId: string;
  slot: Slot;
  teamScheduledDates: Map<string, Date[]>;
  teamGamesByWeek: Map<string, Map<string, number>>;
  teamTotalScheduled: Map<string, number>;
}) {
  const dates = teamScheduledDates.get(teamId) || [];
  dates.push(slot.dateObject);
  teamScheduledDates.set(teamId, dates);

  const weekMap = teamGamesByWeek.get(teamId) || new Map<string, number>();
  weekMap.set(slot.weekKey, (weekMap.get(slot.weekKey) || 0) + 1);
  teamGamesByWeek.set(teamId, weekMap);

  teamTotalScheduled.set(teamId, (teamTotalScheduled.get(teamId) || 0) + 1);
}

function addScheduledMatchupDate({
  matchupKey,
  slot,
  matchupCounts,
  matchupScheduledDates,
}: {
  matchupKey: string;
  slot: Slot;
  matchupCounts: Map<string, number>;
  matchupScheduledDates: Map<string, Date[]>;
}) {
  matchupCounts.set(matchupKey, (matchupCounts.get(matchupKey) || 0) + 1);

  const dates = matchupScheduledDates.get(matchupKey) || [];
  dates.push(slot.dateObject);
  matchupScheduledDates.set(matchupKey, dates);
}

export async function POST(request: Request) {
  const body = await request.json();

  const {
    adminToken,
    startDate,
    endDate,
    competitiveGamesPerTeam,
    recreationalGamesPerTeam,
    location,
    clearExistingUnscheduled,
    clearExistingAutoScheduled,
    maxGamesPerWeek,
    idealDaysBetweenGames,
    minimumDaysBetweenGames,
    blockedDates,
  } = body;

  if (!isValidAdminToken(adminToken)) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start date and end date are required." },
      { status: 400 }
    );
  }

  const compGames = Number(competitiveGamesPerTeam || 0);
  const recGames = Number(recreationalGamesPerTeam || 0);

  const parsedMaxGamesPerWeek = Number(maxGamesPerWeek || 2);
  const parsedIdealDaysBetweenGames = Number(idealDaysBetweenGames || 2);
  const parsedMinimumDaysBetweenGames = Number(minimumDaysBetweenGames || 1);

  const parsedBlockedDates = [
    ...new Set([...DEFAULT_BLOCKED_DATES, ...parseBlockedDates(blockedDates)]),
  ];

  if (compGames < 1 && recGames < 1) {
    return NextResponse.json(
      { error: "At least one games-per-team value must be greater than 0." },
      { status: 400 }
    );
  }

  if (parsedMaxGamesPerWeek < 1) {
    return NextResponse.json(
      { error: "Max games per week must be at least 1." },
      { status: 400 }
    );
  }

  if (clearExistingAutoScheduled) {
    const { data: autoGames, error: findAutoError } = await supabaseAdmin
      .from("games")
      .select("id")
      .in("status", ["scheduled", "unscheduled"])
      .or("pool_group.ilike.Auto Scheduled%,pool_group.ilike.Auto Scheduler%");

    if (findAutoError) {
      return NextResponse.json(
        { error: findAutoError.message },
        { status: 500 }
      );
    }

    const autoGameIds = (autoGames || []).map((game) => game.id);

    if (autoGameIds.length > 0) {
      const { error: deleteAutoError } = await supabaseAdmin
        .from("games")
        .delete()
        .in("id", autoGameIds);

      if (deleteAutoError) {
        return NextResponse.json(
          { error: deleteAutoError.message },
          { status: 500 }
        );
      }
    }
  }

  if (clearExistingUnscheduled) {
    const { error: deleteError } = await supabaseAdmin
      .from("games")
      .delete()
      .eq("status", "unscheduled");

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }
  }

  const { data: teams, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select(`
      id,
      name,
      league,
      not_available,
      preferred_game_time,
      preferred_day_notes
    `)
    .order("league", { ascending: true })
    .order("name", { ascending: true });

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const typedTeams = (teams || []) as Team[];

  const competitiveTeams = typedTeams.filter(
    (team) => team.league === "competitive"
  );

  const recreationalTeams = typedTeams.filter(
    (team) => team.league === "recreational"
  );

  const candidateGames = [
    ...(compGames > 0
      ? generatePairings(competitiveTeams, compGames, "competitive")
      : []),
    ...(recGames > 0
      ? generatePairings(recreationalTeams, recGames, "recreational")
      : []),
  ];

  const slots = generateSlots({
    startDate,
    endDate,
    blockedDates: parsedBlockedDates,
  });

  if (slots.length === 0) {
    return NextResponse.json(
      { error: "No valid slots found in that date range." },
      { status: 400 }
    );
  }

  const availableSlots = [...slots];
  const remainingGames = [...candidateGames];

  const unscheduledGames: CandidateGame[] = [];
  const scheduledRows: any[] = [];
  const report: any[] = [];

  const teamScheduledDates = new Map<string, Date[]>();
  const teamGamesByWeek = new Map<string, Map<string, number>>();
  const teamTotalScheduled = new Map<string, number>();
  const matchupCounts = new Map<string, number>();
  const matchupScheduledDates = new Map<string, Date[]>();

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
          teamTotalScheduled,
          matchupCounts,
          matchupScheduledDates,
          maxGamesPerWeek: parsedMaxGamesPerWeek,
          idealDaysBetweenGames: parsedIdealDaysBetweenGames,
          minimumDaysBetweenGames: parsedMinimumDaysBetweenGames,
          startDate,
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
      unscheduledGames.push(...remainingGames);
      remainingGames.splice(0, remainingGames.length);
      break;
    }

    const game = remainingGames.splice(bestGameIndex, 1)[0];
    const slot = availableSlots.splice(bestSlotIndex, 1)[0];

    addScheduledTeamDate({
      teamId: game.homeTeam.id,
      slot,
      teamScheduledDates,
      teamGamesByWeek,
      teamTotalScheduled,
    });

    addScheduledTeamDate({
      teamId: game.awayTeam.id,
      slot,
      teamScheduledDates,
      teamGamesByWeek,
      teamTotalScheduled,
    });

    addScheduledMatchupDate({
      matchupKey: game.matchupKey,
      slot,
      matchupCounts,
      matchupScheduledDates,
    });

    scheduledRows.push({
      home_team_id: game.homeTeam.id,
      away_team_id: game.awayTeam.id,
      league: game.league,
      status: "scheduled",
      scheduled_at: slot.scheduledAt,
      location: location || "Court",
      court: location || "Court",
      weight: gameWeightForLeague(game.league),
      round_label: "Regular Season",
      pool_group:
        game.repeatNumber > 1
          ? `Auto Scheduled - Repeat Matchup ${game.repeatNumber}`
          : "Auto Scheduled",
    });

    report.push({
      game: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
      league: game.league,
      status: "scheduled",
      scheduledAt: slot.scheduledAt,
      slot: `${slot.dayName} ${slot.label}`,
      score: bestScore,
      repeatNumber: game.repeatNumber,
      notes: bestNotes,
    });
  }

  const unscheduledRows = unscheduledGames.map((game) => ({
    home_team_id: game.homeTeam.id,
    away_team_id: game.awayTeam.id,
    league: game.league,
    status: "unscheduled",
    scheduled_at: null,
    location: null,
    court: null,
    weight: gameWeightForLeague(game.league),
    round_label: "Regular Season",
    pool_group: "Auto Scheduler Could Not Place",
  }));

  for (const game of unscheduledGames) {
    report.push({
      game: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
      league: game.league,
      status: "unscheduled",
      score: null,
      repeatNumber: game.repeatNumber,
      notes: ["could not place without breaking constraints"],
    });
  }

  const rowsToInsert = [...scheduledRows, ...unscheduledRows];

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("games")
      .insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    scheduled: scheduledRows.length,
    unscheduled: unscheduledRows.length,
    totalCandidateGames: candidateGames.length,
    totalSlots: slots.length,
    remainingSlots: availableSlots.length,
    maxGamesPerWeek: parsedMaxGamesPerWeek,
    idealDaysBetweenGames: parsedIdealDaysBetweenGames,
    minimumDaysBetweenGames: parsedMinimumDaysBetweenGames,
    blockedDates: parsedBlockedDates,
    deletedPreviousAutoScheduled: Boolean(clearExistingAutoScheduled),
    report,
  });
}