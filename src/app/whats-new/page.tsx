import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PageShell from "@/components/PageShell";
import WhatsNewClient from "./WhatsNewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTeam(team: any) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0] || null;
  return team;
}

function getPhotoUrl(photo: any) {
  return (
    photo.image_url ||
    photo.photo_url ||
    photo.url ||
    photo.public_url ||
    photo.file_url ||
    ""
  );
}

function getPhotoLikes(photo: any) {
  return Number(
    photo.likes ||
      photo.like_count ||
      photo.heart_count ||
      photo.hearts ||
      photo.reactions ||
      0
  );
}

function getPhotoCaption(photo: any) {
  return (
    photo.caption ||
    photo.title ||
    photo.description ||
    "Rhino League photo"
  );
}

function buildTargetKey(targetType: string, targetId: string) {
  return `${targetType}:${targetId}`;
}

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

function formatTargetLabel({
  comment,
  gamesById,
  photosById,
}: {
  comment: any;
  gamesById: Record<string, any>;
  photosById: Record<string, any>;
}) {
  if (comment.target_type === "game") {
    const game = gamesById[comment.target_id];
    const homeTeam = normalizeTeam(game?.home_team);
    const awayTeam = normalizeTeam(game?.away_team);

    if (game) {
      return `${homeTeam?.name || "Home"} vs ${awayTeam?.name || "Away"}`;
    }

    return "Match";
  }

  if (comment.target_type === "photo") {
    const photo = photosById[comment.target_id];

    if (photo) {
      return getPhotoCaption(photo);
    }

    return "Photo";
  }

  return "Rhino League";
}

function sortNewest(items: any[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime()
  );
}

function getFeedPriority(item: any) {
  if (item.type === "score") return 5;
  if (item.type === "game") return 4;
  if (item.type === "photo") return 3;
  if (item.type === "comment") return 2;
  return 1;
}

function uniqueFeedItems(items: any[]) {
  const byCanonicalKey = new Map<string, any>();

  items.forEach((item) => {
    const key = item.canonicalKey || item.id;
    const existing = byCanonicalKey.get(key);

    if (!existing) {
      byCanonicalKey.set(key, item);
      return;
    }

    const itemPriority = getFeedPriority(item);
    const existingPriority = getFeedPriority(existing);

    if (itemPriority > existingPriority) {
      byCanonicalKey.set(key, item);
      return;
    }

    if (itemPriority === existingPriority && Number(item.heat || 0) > Number(existing.heat || 0)) {
      byCanonicalKey.set(key, item);
    }
  });

  return Array.from(byCanonicalKey.values());
}

export default async function WhatsNewPage() {
  const todayIso = startOfTodayIso();

  const { data: comments, error: commentsError } = await supabaseAdmin
    .from("comments")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: photos, error: photosError } = await supabaseAdmin
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: completedGames, error: completedGamesError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      home_team_id,
      away_team_id,
      is_forfeit,
      forfeit_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(80);

  const { data: pollGames, error: pollGamesError } = await supabaseAdmin
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      status,
      home_score,
      away_score,
      home_votes,
      away_votes,
      league,
      home_team_id,
      away_team_id,
      is_forfeit,
      forfeit_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, logo_url)
    `)
    .order("scheduled_at", { ascending: false })
    .limit(200);

  if (commentsError || photosError || completedGamesError || pollGamesError) {
    return (
      <PageShell
        title="What’s New?"
        subtitle="Recent Rhino League activity, comments, photos, scores, and hot items."
      >
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {commentsError?.message ||
            photosError?.message ||
            completedGamesError?.message ||
            pollGamesError?.message}
        </div>
      </PageShell>
    );
  }

  const safeComments = comments || [];
  const safePhotos = photos || [];
  const safeCompletedGames = completedGames || [];
  const safePollGames = pollGames || [];

  const allGamesById = new Map<string, any>();

  [...safeCompletedGames, ...safePollGames].forEach((game: any) => {
    if (!allGamesById.has(game.id)) {
      allGamesById.set(game.id, game);
    }
  });

  const photosById = Object.fromEntries(
    safePhotos.map((photo: any) => [photo.id, photo])
  );

  const gamesById = Object.fromEntries(Array.from(allGamesById.entries()));

  const commentCountsByTarget = safeComments.reduce(
    (acc: Record<string, number>, comment: any) => {
      const key = buildTargetKey(comment.target_type, comment.target_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const todayCommentCountsByTarget = safeComments.reduce(
    (acc: Record<string, number>, comment: any) => {
      const isToday =
        new Date(comment.created_at).getTime() >= new Date(todayIso).getTime();

      if (!isToday) return acc;

      const key = buildTargetKey(comment.target_type, comment.target_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const commentScoreByTarget = safeComments.reduce(
    (acc: Record<string, number>, comment: any) => {
      const key = buildTargetKey(comment.target_type, comment.target_id);
      acc[key] = (acc[key] || 0) + Number(comment.score || 0);
      return acc;
    },
    {}
  );

  const commentItems = safeComments.map((comment: any) => {
    const targetLabel = formatTargetLabel({
      comment,
      gamesById,
      photosById,
    });

    const isToday =
      new Date(comment.created_at).getTime() >= new Date(todayIso).getTime();

    return {
      id: `comment-${comment.id}`,
      canonicalKey: `comment:${comment.id}`,
      type: "comment",
      title: targetLabel,
      subtitle: comment.author_name || "Anonymous Rhino",
      body: comment.body || "",
      createdAt: comment.created_at,
      href:
        comment.target_type === "photo"
          ? "/photos"
          : comment.target_type === "game"
            ? "/polls"
            : "/whats-new",
      heat: Math.max(1, Number(comment.score || 0) + 1 + (isToday ? 4 : 0)),
      meta: {
        score: Number(comment.score || 0),
        targetType: comment.target_type,
        targetId: comment.target_id,
        isToday,
      },
    };
  });

  const photoItems = safePhotos.map((photo: any) => {
    const key = buildTargetKey("photo", photo.id);
    const likes = getPhotoLikes(photo);
    const commentCount = commentCountsByTarget[key] || 0;
    const todayCommentCount = todayCommentCountsByTarget[key] || 0;
    const commentScore = commentScoreByTarget[key] || 0;
    const heat =
      likes * 3 +
      commentCount * 4 +
      todayCommentCount * 8 +
      commentScore;

    return {
      id: `photo-${photo.id}`,
      canonicalKey: `photo:${photo.id}`,
      type: "photo",
      title: getPhotoCaption(photo),
      subtitle: "Photo",
      body: photo.description || photo.caption || "",
      createdAt: photo.created_at,
      href: "/photos",
      heat,
      imageUrl: getPhotoUrl(photo),
      meta: {
        likes,
        commentCount,
        todayCommentCount,
        commentScore,
      },
    };
  });

  const scoreItems = safeCompletedGames.map((game: any) => {
    const homeTeam = normalizeTeam(game.home_team);
    const awayTeam = normalizeTeam(game.away_team);
    const key = buildTargetKey("game", game.id);
    const commentCount = commentCountsByTarget[key] || 0;
    const todayCommentCount = todayCommentCountsByTarget[key] || 0;
    const commentScore = commentScoreByTarget[key] || 0;
    const votes = Number(game.home_votes || 0) + Number(game.away_votes || 0);
    const heat =
      8 +
      votes * 2 +
      commentCount * 4 +
      todayCommentCount * 8 +
      commentScore;

    const forfeitingTeam =
      game.forfeit_team_id === game.home_team_id
        ? homeTeam
        : game.forfeit_team_id === game.away_team_id
          ? awayTeam
          : null;

    return {
      id: `score-${game.id}`,
      canonicalKey: `game:${game.id}`,
      type: "score",
      title: `${homeTeam?.name || "Home"} ${game.home_score} - ${
        game.away_score
      } ${awayTeam?.name || "Away"}`,
      subtitle: `${homeTeam?.name || "Home"} vs ${awayTeam?.name || "Away"}`,
      body: game.is_forfeit
        ? `Forfeit by ${forfeitingTeam?.name || "unknown team"}`
        : "Final score posted",
      createdAt: game.scheduled_at,
      href: "/scores",
      heat,
      game,
      meta: {
        votes,
        commentCount,
        todayCommentCount,
        commentScore,
        homeTeam,
        awayTeam,
        forfeitingTeam,
      },
    };
  });

  const gameEngagementItems = safePollGames
    .filter((game: any) => game.status !== "completed")
    .map((game: any) => {
      const homeTeam = normalizeTeam(game.home_team);
      const awayTeam = normalizeTeam(game.away_team);
      const key = buildTargetKey("game", game.id);
      const votes = Number(game.home_votes || 0) + Number(game.away_votes || 0);
      const commentCount = commentCountsByTarget[key] || 0;
      const todayCommentCount = todayCommentCountsByTarget[key] || 0;
      const commentScore = commentScoreByTarget[key] || 0;
      const heat =
        votes * 2 +
        commentCount * 4 +
        todayCommentCount * 8 +
        commentScore;

      return {
        id: `game-hot-${game.id}`,
        canonicalKey: `game:${game.id}`,
        type: "game",
        title: `${homeTeam?.name || "Home"} vs ${awayTeam?.name || "Away"}`,
        subtitle: "Upcoming match",
        body: "People are voting/commenting on this matchup",
        createdAt: game.scheduled_at,
        href: "/polls",
        heat,
        game,
        meta: {
          votes,
          commentCount,
          todayCommentCount,
          commentScore,
          homeTeam,
          awayTeam,
        },
      };
    });

  const mostCommentedPhotoItems = photoItems
    .filter((item) => Number(item.meta.commentCount || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.meta.commentCount || 0) - Number(a.meta.commentCount || 0)
    )
    .slice(0, 8)
    .map((item) => ({
      ...item,
      id: `most-commented-${item.id}`,
      canonicalKey: item.canonicalKey,
      heat: item.heat + 10,
      subtitle: "Most commented photo",
    }));

  const mostCommentedGameItems = [...scoreItems, ...gameEngagementItems]
    .filter((item) => Number(item.meta.commentCount || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.meta.commentCount || 0) - Number(a.meta.commentCount || 0)
    )
    .slice(0, 8)
    .map((item) => ({
      ...item,
      id: `most-commented-${item.id}`,
      canonicalKey: item.canonicalKey,
      heat: item.heat + 10,
      subtitle:
        item.type === "score"
          ? "Most commented final score"
          : "Most commented match",
    }));

  const allItems = uniqueFeedItems(
    sortNewest([
      ...commentItems,
      ...photoItems,
      ...scoreItems,
    ])
  ).slice(0, 120);

  const hotItems = uniqueFeedItems([
    ...commentItems.filter((item) => item.meta?.isToday),
    ...mostCommentedPhotoItems,
    ...mostCommentedGameItems,
    ...photoItems,
    ...scoreItems,
    ...gameEngagementItems,
  ])
    .filter((item) => item.heat > 0)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 20);

  const featuredItems = hotItems.slice(0, 3);

  const stats = {
    comments: safeComments.length,
    todayComments: commentItems.filter((item) => item.meta?.isToday).length,
    photos: safePhotos.length,
    completedGames: safeCompletedGames.length,
    hotItems: hotItems.length,
  };

  return (
    <PageShell
      title="What’s New?"
      subtitle="The Rhino League live feed: comments, photos, scores, polls, and the stuff people are engaging with most."
    >
      <WhatsNewClient
        allItems={allItems}
        hotItems={hotItems}
        featuredItems={featuredItems}
        stats={stats}
      />
    </PageShell>
  );
}