import Card from "./Card";
import GamePoll from "./GamePoll";
import LeagueBadge from "./LeagueBadge";
import TeamLogo from "./TeamLogo";
import TeamNameLink from "./TeamNameLink";
import CommentsSection from "./CommentsSection";
import { formatLeagueDateTime } from "@/lib/leagueTime";

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function ParticipantMark({
  team,
  name,
  league,
}: {
  team: any;
  name: string;
  league?: string | null;
}) {
  if (team) {
    return (
      <TeamLogo
        logoUrl={team.logo_url}
        teamName={name}
        league={league}
        size="sm"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C4963E]/35 bg-[#C4963E]/10 text-lg font-black text-[#C4963E]"
      aria-label={`${name} bracket source`}
    >
      ?
    </div>
  );
}

export default function GameCard({
  game,
  showPoll = false,
  showComments = true,
}: {
  game: any;
  showPoll?: boolean;
  showComments?: boolean;
}) {
  const isCompleted = game.status === "completed";
  const isUnscheduled = game.status === "unscheduled";
  const isPlayoff = game.game_type === "playoff" || game.league === "playoff";

  const homeTeam = normalizeTeam(game.home_team);
  const awayTeam = normalizeTeam(game.away_team);

  const homeName = homeTeam?.name || game.home_source || "TBD";
  const awayName = awayTeam?.name || game.away_source || "TBD";

  const leagueGlow =
    isPlayoff
      ? "bg-[#1F8A70]/25"
      : game.league === "competitive"
        ? "bg-[#C4963E]/20"
        : "bg-[#A51C30]/30";

  const scoreColor =
    isPlayoff
      ? "bg-[#1F8A70] text-white shadow-[#1F8A70]/25"
      : game.league === "competitive"
      ? "bg-[#C4963E] text-[#16070B] shadow-[#C4963E]/25"
      : "bg-[#A51C30] text-white shadow-[#A51C30]/25";

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-full ${leagueGlow}`}
      />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              isCompleted
                ? "bg-green-500/15 text-green-300"
                : isUnscheduled
                  ? "bg-neutral-500/15 text-neutral-300"
                  : "bg-[#A51C30]/35 text-red-100"
            }`}
          >
            {isCompleted ? "Final" : isUnscheduled ? "Unscheduled" : "Scheduled"}
          </span>

          {game.scheduled_at && (
            <span className="text-sm font-medium text-red-100/70">
              {formatLeagueDateTime(game.scheduled_at)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center gap-3">
            <ParticipantMark
              team={homeTeam}
              name={homeName}
              league={game.league}
            />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                Home
              </p>

              <TeamNameLink
                team={homeTeam || { name: homeName }}
                className="mt-1 block text-2xl font-black text-white"
              />
            </div>
          </div>

          <div className="text-left sm:text-center">
            {isCompleted ? (
              <p
                className={`inline-block rounded-2xl px-5 py-3 text-3xl font-black shadow-lg ${scoreColor}`}
              >
                {game.home_score} - {game.away_score}
              </p>
            ) : (
              <p className="inline-block rounded-2xl border border-[#A51C30]/30 bg-black/20 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-100">
                VS
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                Away
              </p>

              <TeamNameLink
                team={awayTeam || { name: awayName }}
                className="mt-1 block text-2xl font-black text-white"
              />
            </div>

            <ParticipantMark
              team={awayTeam}
              name={awayName}
              league={game.league}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          {game.location && (
            <span className="rounded-full bg-black/25 px-3 py-1 text-red-100/80">
              📍 {game.location}
            </span>
          )}

          {isPlayoff ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#1F8A70]/60 bg-[#1F8A70]/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#BFF4E7]">
              <span className="h-2 w-2 rounded-full bg-[#1F8A70]" />
              Playoff G{game.game_number}
              {game.round_label ? ` · ${game.round_label}` : ""}
            </span>
          ) : (
            game.league && <LeagueBadge league={game.league} />
          )}
        </div>

        {showPoll && !isCompleted && !isUnscheduled && (
          <GamePoll
            gameId={game.id}
            homeTeamName={homeName}
            awayTeamName={awayName}
            initialHomeVotes={game.home_votes || 0}
            initialAwayVotes={game.away_votes || 0}
          />
        )}

        {showComments && !isUnscheduled && (
          <CommentsSection
            targetType="game"
            targetId={game.id}
            title="Match comments"
          />
        )}
      </div>
    </Card>
  );
}
