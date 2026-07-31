"use client";

import { useMemo, useState } from "react";
import GameCard from "@/components/GameCard";
import {
  LEAGUE_TIME_ZONE,
  formatLeagueDate,
  getLeagueDateKey,
  getLeagueHour,
} from "@/lib/leagueTime";

const TIME_SLOTS = [
  { label: "9–10am", hour: 9 },
  { label: "10–11am", hour: 10 },
  { label: "12–1pm", hour: 12 },
  { label: "2–3pm", hour: 14 },
  { label: "3–4pm", hour: 15 },
  { label: "4–5pm", hour: 16 },
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function makeUtcDateFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function toDateKeyFromUtcDate(date: Date) {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = makeUtcDateFromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return toDateKeyFromUtcDate(date);
}

function getEasternTodayDateKey() {
  return getLeagueDateKey(new Date());
}

function getMondayDateKey(dateKey: string) {
  const date = makeUtcDateFromDateKey(dateKey);
  const day = date.getUTCDay();

  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);

  return toDateKeyFromUtcDate(date);
}

function formatDateKeyHeader(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const syntheticDate = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T12:00:00Z`
  );

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(syntheticDate);
}

function formatWeekLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const syntheticDate = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T12:00:00Z`
  );

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(syntheticDate);
}

function getGameSlotKey(game: any) {
  if (!game.scheduled_at) return "";

  const dateKey = getLeagueDateKey(game.scheduled_at);
  const hour = getLeagueHour(game.scheduled_at);

  if (!dateKey || hour === null) return "";

  return `${dateKey}_${hour}`;
}

function normalizeTeam(team: any) {
  if (!team) return null;
  return Array.isArray(team) ? team[0] || null : team;
}

function participantName(game: any, side: "home" | "away") {
  const team = normalizeTeam(
    side === "home" ? game.home_team : game.away_team
  );

  if (team?.name) return team.name;

  const source = side === "home" ? game.home_source : game.away_source;
  return source || "TBD";
}

export default function ScheduleCalendar({ games }: { games: any[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  const currentMondayKey = useMemo(() => {
    const easternTodayKey = getEasternTodayDateKey();
    const mondayKey = getMondayDateKey(easternTodayKey);

    return addDaysToDateKey(mondayKey, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4].map((dayOffset) =>
      addDaysToDateKey(currentMondayKey, dayOffset)
    );
  }, [currentMondayKey]);

  const gamesBySlot = useMemo(() => {
    const map = new Map<string, any[]>();

    games.forEach((game) => {
      const key = getGameSlotKey(game);

      if (!key) return;

      const existing = map.get(key) || [];
      existing.push(game);
      map.set(key, existing);
    });

    return map;
  }, [games]);

  return (
    <section className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F3EEE6]">
            Calendar View
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            Week of {formatWeekLabel(currentMondayKey)}
          </h2>

          <p className="mt-2 text-sm text-red-100/55">
            All game times shown in Eastern Time ({LEAGUE_TIME_ZONE}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((value) => value - 1)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            This Week
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((value) => value + 1)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[110px_repeat(5,minmax(140px,1fr))] gap-2">
            <div />

            {weekDays.map((dayKey) => (
              <div
                key={dayKey}
                className="rounded-xl border border-[#A51C30]/20 bg-black/20 p-3 text-center"
              >
                <p className="font-black text-white">
                  {formatDateKeyHeader(dayKey)}
                </p>
              </div>
            ))}

            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.hour}
                className="contents"
              >
                <div className="flex items-center justify-center rounded-xl border border-[#C4963E]/20 bg-[#C4963E]/10 p-3 text-center">
                  <p className="font-black text-[#F3EEE6]">
                    {slot.label}
                  </p>
                </div>

                {weekDays.map((dayKey) => {
                  const dayDate = makeUtcDateFromDateKey(dayKey);
                  const isFriday = dayDate.getUTCDay() === 5;
                  const isFridayPickup = isFriday && slot.hour >= 16;

                  const slotKey = `${dayKey}_${slot.hour}`;
                  const slotGames = gamesBySlot.get(slotKey) || [];

                  if (isFridayPickup && slotGames.length === 0) {
                    return (
                      <div
                        key={slotKey}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        <p className="text-sm font-bold text-red-100/40">
                          Blocked for pickup
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotKey}
                      className="min-h-24 rounded-xl border border-[#A51C30]/15 bg-black/15 p-2"
                    >
                      {slotGames.length === 0 ? (
                        <p className="p-2 text-sm text-red-100/30">
                          Open
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {slotGames.map((game) => (
                            <button
                              key={game.id}
                              type="button"
                              onClick={() => setSelectedGame(game)}
                              className="rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/15 p-3 text-left transition hover:bg-[#A51C30]/25"
                            >
                              {game.game_type === "playoff" && (
                                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#C4963E]">
                                  Playoff G{game.game_number} · {game.round_label}
                                </p>
                              )}
                              <p className="text-sm font-black text-white">
                                {participantName(game, "home")} vs{" "}
                                {participantName(game, "away")}
                              </p>

                              <p className="mt-1 text-xs text-red-100/50">
                                {game.location || "Court"}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedGame && (
        <div className="mt-6 border-t border-[#A51C30]/20 pt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F3EEE6]">
                Selected game
              </p>

              <p className="mt-1 text-sm text-red-100/50">
                {formatLeagueDate(selectedGame.scheduled_at)} · Eastern Time
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 text-sm font-black text-red-100 hover:bg-[#A51C30]/20"
            >
              Close
            </button>
          </div>

          <GameCard
            game={selectedGame}
            showComments={selectedGame.game_type !== "playoff"}
          />
        </div>
      )}
    </section>
  );
}
