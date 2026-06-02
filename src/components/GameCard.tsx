import Card from "./Card";
import GamePoll from "./GamePoll";
import LeagueBadge from "./LeagueBadge";
import TeamLogo from "./TeamLogo";
import TeamNameLink from "./TeamNameLink";

export default function GameCard({
  game,
  showPoll = false,
}: {
  game: any;
  showPoll?: boolean;
}) {
  const isCompleted = game.status === "completed";
  const isUnscheduled = game.status === "unscheduled";

  const homeName = game.home_team?.name || "Home team";
  const awayName = game.away_team?.name || "Away team";

  const leagueGlow =
    game.league === "competitive" ? "bg-[#C4963E]/20" : "bg-[#A51C30]/30";

  const scoreColor =
    game.league === "competitive"
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
              {new Date(game.scheduled_at).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center gap-3">
            <TeamLogo
              logoUrl={game.home_team?.logo_url}
              teamName={homeName}
              league={game.league}
              size="sm"
            />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/45">
                Home
              </p>
              <TeamNameLink
                team={game.home_team}
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
                team={game.away_team}
                className="mt-1 block text-2xl font-black text-white"
              />
            </div>

            <TeamLogo
              logoUrl={game.away_team?.logo_url}
              teamName={awayName}
              league={game.league}
              size="sm"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          {game.location && (
            <span className="rounded-full bg-black/25 px-3 py-1 text-red-100/80">
              📍 {game.location}
            </span>
          )}

          {game.league && <LeagueBadge league={game.league} />}
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
      </div>
    </Card>
  );
}