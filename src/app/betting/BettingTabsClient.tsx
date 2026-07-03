"use client";

import { useState } from "react";
import BettingClient from "./BettingClient";
import WorldCupBettingClient from "@/components/WorldCupBettingClient";

type Tab = "rhino" | "world-cup";

export default function BettingTabsClient() {
  const [activeTab, setActiveTab] =
    useState<Tab>("rhino");

  return (
    <div>
      <div className="mb-8 rounded-[2rem] border border-[#C4963E]/25 bg-[#1A0F08]/90 p-3 shadow-2xl shadow-black/30">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setActiveTab("rhino")
            }
            className={`rounded-2xl px-5 py-4 text-left transition ${
              activeTab === "rhino"
                ? "bg-[#A51C30] text-white shadow-lg shadow-[#A51C30]/25"
                : "bg-black/20 text-red-100/65 hover:bg-[#A51C30]/15"
            }`}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em]">
              Rhino League
            </p>

            <p className="mt-1 text-lg font-black">
              Volleyball Bets 🏐
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("world-cup")
            }
            className={`rounded-2xl px-5 py-4 text-left transition ${
              activeTab === "world-cup"
                ? "bg-[#C4963E] text-[#16070B] shadow-lg shadow-[#C4963E]/20"
                : "bg-black/20 text-red-100/65 hover:bg-[#C4963E]/15"
            }`}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em]">
              FIFA World Cup
            </p>

            <p className="mt-1 text-lg font-black">
              World Cup Bets ⚽
            </p>
          </button>
        </div>
      </div>

      {activeTab === "rhino" ? (
        <BettingClient />
      ) : (
        <WorldCupBettingClient />
      )}
    </div>
  );
}