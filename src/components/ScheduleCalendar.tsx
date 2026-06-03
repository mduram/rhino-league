"use client";

import { useMemo, useState } from "react";
import GameCard from "@/components/GameCard";

const TIME_SLOTS = [
  { label: "9–10am", hour: 9 },
  { label: "10–11am", hour: 10 },
  { label: "12–1pm", hour: 12 },
  { label: "3–4pm", hour: 15 },
  { label: "4–5pm", hour: 16 },
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDayHeader(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getGameSlotKey(game: any) {
  if (!game.scheduled_at) return "";

  const date = new Date(game.scheduled_at);
  const dateKey = toDateKey(date);
  const hour = date.getHours();

  return `${dateKey}_${hour}`;
}

export default function ScheduleCalendar({ games }: { games: any[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  const currentMonday = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4].map((dayOffset) =>
      addDays(currentMonday, dayOffset)
    );
  }, [currentMonday]);

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
    <div className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
            Calendar View
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            Week of {currentMonday.toLocaleDateString()}
          </h2>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setWeekOffset((value) => value - 1)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            Previous
          </button>

          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            This Week
          </button>

          <button
            onClick={() => setWeekOffset((value) => value + 1)}
            className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 font-black text-red-100 hover:bg-[#A51C30]/20"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[110px_repeat(5,1fr)] gap-2">
            <div />

            {weekDays.map((day) => (
              <div
                key={toDateKey(day)}
                className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-3 text-center"
              >
                <p className="font-black text-white">
                  {formatDayHeader(day)}
                </p>
              </div>
            ))}

            {TIME_SLOTS.map((slot) => (
              <div key={slot.hour} className="contents">
                <div className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-3 text-sm font-black text-[#F3EEE6]">
                  {slot.label}
                </div>

                {weekDays.map((day) => {
                  const isFriday = day.getDay() === 5;
                  const isFridayPickup = isFriday && slot.hour >= 16;
                  const slotKey = `${toDateKey(day)}_${slot.hour}`;
                  const slotGames = gamesBySlot.get(slotKey) || [];

                  if (isFridayPickup) {
                    return (
                      <div
                        key={slotKey}
                        className="min-h-28 rounded-2xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-3"
                      >
                        <p className="text-sm font-black text-[#F3EEE6]">
                          Blocked for pickup
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotKey}
                      className="min-h-28 rounded-2xl border border-[#A51C30]/25 bg-black/20 p-3"
                    >
                      {slotGames.length === 0 ? (
                        <p className="text-sm text-red-100/35">
                          Open
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {slotGames.map((game) => (
                            <button
                              key={game.id}
                              onClick={() => setSelectedGame(game)}
                              className="rounded-xl border border-[#A51C30]/30 bg-[#A51C30]/15 p-3 text-left transition hover:bg-[#A51C30]/25"
                            >
                              <p className="font-black text-white">
                                {game.home_team?.name} vs {game.away_team?.name}
                              </p>

                              <p className="mt-1 text-xs text-red-100/60">
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
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-[#F3EEE6]">
              Selected game
            </h3>

            <button
              onClick={() => setSelectedGame(null)}
              className="rounded-full border border-[#A51C30]/30 bg-black/20 px-4 py-2 text-sm font-black text-red-100 hover:bg-[#A51C30]/20"
            >
              Close
            </button>
          </div>

          <GameCard game={selectedGame} showPoll />
        </div>
      )}
    </div>
  );
}