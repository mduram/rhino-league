"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
import LeagueBadge from "@/components/LeagueBadge";
import { formatLeagueDateTime } from "@/lib/leagueTime";

type FeedTab = "all" | "hot" | "comments" | "photos" | "scores";

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown time";
  return new Date(value).toLocaleString();
}

function typeLabel(type: string) {
  if (type === "comment") return "Comment";
  if (type === "photo") return "Photo";
  if (type === "score") return "Score";
  if (type === "game") return "Match";
  return "Update";
}

function typeEmoji(type: string) {
  if (type === "comment") return "💬";
  if (type === "photo") return "📸";
  if (type === "score") return "🏐";
  if (type === "game") return "🔥";
  return "🦏";
}

function typeStyle(type: string) {
  if (type === "photo") {
    return "border-[#C4963E]/30 bg-[#C4963E]/10 text-[#F3EEE6]";
  }

  if (type === "score") {
    return "border-green-500/25 bg-green-500/10 text-green-300";
  }

  if (type === "comment") {
    return "border-[#A51C30]/30 bg-[#A51C30]/15 text-red-100";
  }

  return "border-[#C4963E]/30 bg-[#C4963E]/10 text-[#F3EEE6]";
}

function heatLabel(heat: number) {
  if (heat >= 40) return "Rhino inferno";
  if (heat >= 20) return "Very hot";
  if (heat >= 8) return "Heating up";
  if (heat > 0) return "Active";
  return "Quiet";
}

export default function WhatsNewClient({
  allItems,
  hotItems,
  featuredItems,
  stats,
}: {
  allItems: any[];
  hotItems: any[];
  featuredItems: any[];
  stats: {
    comments: number;
    todayComments: number;
    photos: number;
    completedGames: number;
    hotItems: number;
  };
}) {
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [search, setSearch] = useState("");

  const tabs: { id: FeedTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "hot", label: "Hot" },
    { id: "comments", label: "Comments" },
    { id: "photos", label: "Photos" },
    { id: "scores", label: "Scores" },
  ];

  const filteredItems = useMemo(() => {
    const source = activeTab === "hot" ? hotItems : allItems;

    return source.filter((item) => {
      const matchesTab =
        activeTab === "all" ||
        activeTab === "hot" ||
        (activeTab === "comments" && item.type === "comment") ||
        (activeTab === "photos" && item.type === "photo") ||
        (activeTab === "scores" && item.type === "score");

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.subtitle?.toLowerCase().includes(query) ||
        item.body?.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, allItems, hotItems, search]);

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#C4963E]/35 bg-[#1A0F08]/95 p-6 shadow-2xl shadow-black/40 md:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C4963E]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#A51C30]/25 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#C4963E]">
              Live Rhino Feed
            </p>

            <h2 className="text-4xl font-black text-white sm:text-5xl">
              What people are talking about
            </h2>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-red-100/70">
              Comments, photos, final scores, poll chaos, and the most active
              Rhino League moments in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Comments" value={String(stats.comments)} />
            <StatCard label="Today" value={String(stats.todayComments)} gold />
            <StatCard label="Photos" value={String(stats.photos)} />
            <StatCard label="Final scores" value={String(stats.completedGames)} />
            <StatCard label="Hot items" value={String(stats.hotItems)} gold />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
              Rhino Radar
            </p>

            <h2 className="text-3xl font-black text-white">
              Hottest right now
            </h2>
          </div>

          <p className="text-sm text-red-100/50">
            Heat = today’s comments + total comments + votes + likes + comment score.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredItems.length === 0 && (
            <p className="rounded-3xl border border-[#C4963E]/25 bg-[#1A0F08]/90 p-5 text-red-100/60">
              Nothing hot yet. Go vote, comment, or upload a photo.
            </p>
          )}

          {featuredItems.map((item, index) => (
            <FeaturedCard key={item.id} item={item} rank={index + 1} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  activeTab === tab.id
                    ? "bg-[#C4963E] text-[#16070B]"
                    : "border border-[#A51C30]/25 bg-black/20 text-red-100 hover:bg-[#A51C30]/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            className="w-full rounded-full border border-[#A51C30]/25 bg-black/30 px-5 py-3 text-white placeholder:text-red-100/35 lg:max-w-sm"
            placeholder="Search teams, comments, photos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-6 grid gap-4">
          {filteredItems.length === 0 && (
            <p className="rounded-2xl border border-[#A51C30]/25 bg-black/20 p-5 text-red-100/60">
              No updates match this view yet.
            </p>
          )}

          {filteredItems.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  gold = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        gold
          ? "border-[#C4963E]/30 bg-[#C4963E]/15"
          : "border-[#A51C30]/25 bg-black/25"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.18em] ${
          gold ? "text-[#C4963E]" : "text-red-100/50"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 text-4xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function FeaturedCard({ item, rank }: { item: any; rank: number }) {
  return (
    <Link
      href={item.href || "/whats-new"}
      className="group relative overflow-hidden rounded-[2rem] border border-[#C4963E]/30 bg-[#1A0F08]/90 p-5 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:bg-[#C4963E]/10"
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="mb-4 h-44 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#C4963E] px-4 py-2 text-sm font-black text-[#16070B]">
          #{rank}
        </span>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${typeStyle(
            item.type
          )}`}
        >
          {typeEmoji(item.type)} {typeLabel(item.type)}
        </span>
      </div>

      <h3 className="text-2xl font-black text-white">
        {item.title}
      </h3>

      {item.subtitle && (
        <p className="mt-2 text-sm font-bold text-red-100/55">
          {item.subtitle}
        </p>
      )}

      {item.body && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-red-100/70">
          {item.body}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-red-100/45">
          {formatDate(item.createdAt)}
        </p>

        <span className="rounded-full border border-[#C4963E]/25 bg-[#C4963E]/10 px-4 py-2 text-sm font-black text-[#F3EEE6]">
          🔥 {item.heat}
        </span>
      </div>
    </Link>
  );
}

function FeedCard({ item }: { item: any }) {
  if (item.type === "score" || item.type === "game") {
    return <GameFeedCard item={item} />;
  }

  if (item.type === "photo") {
    return <PhotoFeedCard item={item} />;
  }

  return <CommentFeedCard item={item} />;
}

function CommentFeedCard({ item }: { item: any }) {
  return (
    <Link
      href={item.href || "/whats-new"}
      className="block rounded-3xl border border-[#A51C30]/25 bg-black/20 p-5 transition hover:bg-[#A51C30]/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${typeStyle(
              item.type
            )}`}
          >
            💬 Comment
          </span>

          <h3 className="mt-3 text-xl font-black text-white">
            {item.subtitle}
          </h3>

          <p className="mt-1 text-sm text-red-100/50">
            On {item.title}
          </p>
        </div>

        <HeatBadge heat={item.heat} />
      </div>

      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-red-100/75">
        {item.body}
      </p>

      <p className="mt-4 text-xs text-red-100/40">
        {formatDate(item.createdAt)}
      </p>
    </Link>
  );
}

function PhotoFeedCard({ item }: { item: any }) {
  return (
    <Link
      href={item.href || "/photos"}
      className="grid gap-4 overflow-hidden rounded-3xl border border-[#C4963E]/25 bg-black/20 p-4 transition hover:bg-[#C4963E]/10 sm:grid-cols-[12rem_1fr_auto] sm:items-center"
    >
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-black/30 sm:h-32">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl">📸</span>
        )}
      </div>

      <div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${typeStyle(
            item.type
          )}`}
        >
          📸 Photo
        </span>

        <h3 className="mt-3 text-xl font-black text-white">
          {item.title}
        </h3>

        <p className="mt-2 text-sm text-red-100/55">
          {Number(item.meta?.likes || 0)} likes ·{" "}
          {Number(item.meta?.commentCount || 0)} comments
          {Number(item.meta?.todayCommentCount || 0) > 0
            ? ` · ${Number(item.meta.todayCommentCount)} today`
            : ""}
        </p>

        <p className="mt-2 text-xs text-red-100/40">
          {formatDate(item.createdAt)}
        </p>
      </div>

      <HeatBadge heat={item.heat} />
    </Link>
  );
}

function GameFeedCard({ item }: { item: any }) {
  const game = item.game;
  const homeTeam = item.meta?.homeTeam;
  const awayTeam = item.meta?.awayTeam;

  return (
    <Link
      href={item.href || "/polls"}
      className="block rounded-3xl border border-[#A51C30]/25 bg-black/20 p-5 transition hover:bg-[#A51C30]/10"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${typeStyle(
              item.type
            )}`}
          >
            {item.type === "score" ? "🏐 Score" : "🔥 Match"}
          </span>

          {game?.league && <LeagueBadge league={game.league} />}
        </div>

        <HeatBadge heat={item.heat} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-3">
          <TeamLogo
            logoUrl={homeTeam?.logo_url || null}
            teamName={homeTeam?.name || "Home"}
            league={game?.league || "competitive"}
            size="sm"
          />

          <p className="font-black text-white">
            {homeTeam?.name || "Home"}
          </p>
        </div>

        <div className="text-left sm:text-center">
          {game?.status === "completed" ? (
            <p className="inline-block rounded-2xl border border-[#C4963E]/30 bg-[#C4963E]/10 px-5 py-3 text-2xl font-black text-white">
              {game.home_score} - {game.away_score}
            </p>
          ) : (
            <p className="inline-block rounded-2xl border border-[#A51C30]/30 bg-black/20 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-100">
              VS
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <p className="font-black text-white sm:text-right">
            {awayTeam?.name || "Away"}
          </p>

          <TeamLogo
            logoUrl={awayTeam?.logo_url || null}
            teamName={awayTeam?.name || "Away"}
            league={game?.league || "competitive"}
            size="sm"
          />
        </div>
      </div>

      {item.body && (
        <p className="mt-4 text-sm leading-6 text-red-100/65">
          {item.body}
        </p>
      )}

      <p className="mt-4 text-sm text-red-100/50">
        {game?.scheduled_at
          ? formatLeagueDateTime(game.scheduled_at)
          : formatDate(item.createdAt)}
      </p>
    </Link>
  );
}

function HeatBadge({ heat }: { heat: number }) {
  return (
    <div className="shrink-0 rounded-2xl border border-[#C4963E]/25 bg-[#C4963E]/10 px-4 py-3 text-center">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F3EEE6]">
        {heatLabel(heat)}
      </p>

      <p className="mt-1 text-2xl font-black text-white">
        🔥 {heat}
      </p>
    </div>
  );
}