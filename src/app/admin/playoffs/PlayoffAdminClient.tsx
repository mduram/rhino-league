"use client";

import { useEffect, useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import LeagueBadge from "@/components/LeagueBadge";

type Team = {
  id: string;
  name: string;
  league: string;
  logo_url?: string | null;
  playoff_disqualified?: boolean | null;
  playoff_disqualification_reason?: string | null;
  playoff_disqualified_at?: string | null;
};

export default function PlayoffAdminClient({ teams }: { teams: Team[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [teamList, setTeamList] = useState<Team[]>(teams || []);
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [reasonByTeamId, setReasonByTeamId] = useState<Record<string, string>>(
    {}
  );
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAdminToken(localStorage.getItem("rhino_admin_token") || "");

    const initialReasons: Record<string, string> = {};
    teams.forEach((team) => {
      initialReasons[team.id] = team.playoff_disqualification_reason || "";
    });
    setReasonByTeamId(initialReasons);
  }, [teams]);

  const counts = useMemo(() => {
    const disqualified = teamList.filter(
      (team) => team.playoff_disqualified
    ).length;

    return {
      total: teamList.length,
      eligible: teamList.length - disqualified,
      disqualified,
    };
  }, [teamList]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teamList.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        team.league.toLowerCase().includes(query);

      const matchesLeague =
        leagueFilter === "all" || team.league === leagueFilter;

      return matchesSearch && matchesLeague;
    });
  }, [teamList, search, leagueFilter]);

  async function updateTeamDisqualification(team: Team, nextValue: boolean) {
    setMessage("");

    if (!adminToken) {
      setMessage("You are not logged in as admin. Go to /admin/login first.");
      return;
    }

    const reason = reasonByTeamId[team.id] || "";

    if (nextValue && !reason.trim()) {
      const confirmed = window.confirm(
        `Disqualify ${team.name} from playoffs without adding a reason?`
      );

      if (!confirmed) return;
    }

    const confirmed = window.confirm(
      nextValue
        ? `Disqualify ${team.name} from playoffs? This will be shown publicly.`
        : `Restore ${team.name} to playoff eligibility?`
    );

    if (!confirmed) return;

    setBusyTeamId(team.id);

    const res = await fetch("/api/admin/disqualify-team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminToken,
        teamId: team.id,
        playoffDisqualified: nextValue,
        playoffDisqualificationReason: reason,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || `Could not update team. Status: ${res.status}`);
      setBusyTeamId(null);
      return;
    }

    setTeamList((current) =>
      current.map((item) => (item.id === team.id ? data.team : item))
    );

    setReasonByTeamId((current) => ({
      ...current,
      [team.id]: data.team.playoff_disqualification_reason || "",
    }));

    setMessage(data.message || "Team updated.");
    setBusyTeamId(null);
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              Playoff Status
            </h2>

            <p className="mt-2 text-red-100/65">
              Eligible:{" "}
              <span className="font-black text-green-300">
                {counts.eligible}
              </span>{" "}
              · Disqualified:{" "}
              <span className="font-black text-red-300">
                {counts.disqualified}
              </span>{" "}
              · Total teams:{" "}
              <span className="font-black text-white">{counts.total}</span>
            </p>

            {adminToken ? (
              <p className="mt-3 text-sm font-black text-green-300">
                Admin mode active
              </p>
            ) : (
              <p className="mt-3 text-sm font-black text-red-300">
                Not logged in
              </p>
            )}
          </div>

          <div className="grid w-full gap-3 lg:max-w-xl lg:grid-cols-[1fr_auto]">
            <input
              className="rounded-full border border-[#C4963E]/25 bg-black/30 px-5 py-3 text-white placeholder:text-red-100/35"
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-full border border-[#C4963E]/25 bg-black/30 px-5 py-3 text-white"
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
            >
              <option value="all">All leagues</option>
              <option value="competitive">Competitive</option>
              <option value="recreational">Recreational</option>
            </select>
          </div>
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-[#C4963E]/30 bg-[#C4963E]/15 p-4 text-[#F3EEE6]">
            {message}
          </p>
        )}
      </section>

      <section className="grid gap-4">
        {filteredTeams.map((team) => (
          <article
            key={team.id}
            className={`rounded-3xl border p-5 shadow-2xl shadow-black/30 ${
              team.playoff_disqualified
                ? "border-red-500/30 bg-red-950/35"
                : "border-[#A51C30]/25 bg-[#230B12]/85"
            }`}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center">
              <div className="flex items-center gap-4">
                <TeamLogo
                  logoUrl={team.logo_url || null}
                  teamName={team.name}
                  league={team.league}
                  size="md"
                />

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <LeagueBadge league={team.league} />

                    {team.playoff_disqualified ? (
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">
                        Disqualified
                      </span>
                    ) : (
                      <span className="rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-300">
                        Eligible
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white">
                    {team.name}
                  </h3>

                  {team.playoff_disqualified_at && (
                    <p className="mt-1 text-xs text-red-100/45">
                      Disqualified{" "}
                      {new Date(
                        team.playoff_disqualified_at
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-red-100/70">
                  Public reason / note
                </span>

                <input
                  className="rounded-xl border border-[#C4963E]/25 bg-black/30 px-4 py-3 text-white placeholder:text-red-100/35"
                  placeholder="Example: Forfeit without notifying opponent"
                  value={reasonByTeamId[team.id] || ""}
                  onChange={(e) =>
                    setReasonByTeamId((current) => ({
                      ...current,
                      [team.id]: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="flex flex-col gap-3">
                {team.playoff_disqualified ? (
                  <button
                    type="button"
                    disabled={busyTeamId === team.id}
                    onClick={() => updateTeamDisqualification(team, false)}
                    className="rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-500 disabled:opacity-50"
                  >
                    {busyTeamId === team.id
                      ? "Saving..."
                      : "Restore Eligibility"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyTeamId === team.id}
                    onClick={() => updateTeamDisqualification(team, true)}
                    className="rounded-xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {busyTeamId === team.id
                      ? "Saving..."
                      : "Disqualify from Playoffs"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {filteredTeams.length === 0 && (
          <p className="rounded-3xl border border-[#A51C30]/25 bg-[#230B12]/85 p-6 text-red-100/60">
            No teams match your filters.
          </p>
        )}
      </section>
    </div>
  );
}