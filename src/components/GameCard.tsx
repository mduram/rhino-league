import Card from "./Card";
import GamePoll from "./GamePoll";

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

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-orange-500/10" />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              isCompleted
                ? "bg-green-500/15 text-green-300"
                : isUnscheduled
                  ? "bg-neutral-500/15 text-neutral-300"
                  : "bg-orange-500/15 text-orange-300"
            }`}
          >
            {isCompleted ? "Final" : isUnscheduled ? "Unscheduled" : "Scheduled"}
          </span>

          {game.scheduled_at && (
            <span className="text-sm font-medium text-neutral-400">
              {new Date(game.scheduled_at).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Home
            </p>
            <p className="mt-1 text-2xl font-black text-white">{homeName}</p>
          </div>

          <div className="text-left sm:text-center">
            {isCompleted ? (
              <p className="inline-block rounded-2xl bg-orange-500 px-5 py-3 text-3xl font-black text-white shadow-lg shadow-orange-500/20">
                {game.home_score} - {game.away_score}
              </p>
            ) : (
              <p className="inline-block rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black uppercase tracking-wider text-neutral-300">
                VS
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Away
            </p>
            <p className="mt-1 text-2xl font-black text-white">{awayName}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          {game.location && (
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-neutral-300">
              📍 {game.location}
            </span>
          )}

          {game.league && (
            <span className="rounded-full bg-orange-500/15 px-3 py-1 font-bold capitalize text-orange-300">
              {game.league}
            </span>
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
      </div>
    </Card>
  );
}