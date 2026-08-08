import type { ReelMusic } from "./types";
import type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";
import { EMPTY_STATS_SNAPSHOT, SEED_UPLOAD_COUNT } from "./communityStatsSeed";

export type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";

const STATS_CACHE_KEY = "floraly_community_stats_v1";

export function emptyCommunityStats(): CommunityStatsSnapshot {
  return {
    ...EMPTY_STATS_SNAPSHOT,
    totalUploads: SEED_UPLOAD_COUNT,
    leaderboard: [],
  };
}

function normalizeSnapshot(data: Partial<CommunityStatsSnapshot> | null | undefined): CommunityStatsSnapshot {
  const fallback = emptyCommunityStats();
  if (!data || typeof data !== "object") return fallback;
  return {
    concurrentUsers:
      typeof data.concurrentUsers === "number" ? data.concurrentUsers : 0,
    totalUsers: typeof data.totalUsers === "number" ? data.totalUsers : fallback.totalUsers,
    totalUploads:
      typeof data.totalUploads === "number" ? data.totalUploads : fallback.totalUploads,
    uniqueVisitors:
      typeof data.uniqueVisitors === "number" ? data.uniqueVisitors : 0,
    totalPageViews:
      typeof data.totalPageViews === "number" ? data.totalPageViews : 0,
    leaderboard: Array.isArray(data.leaderboard)
      ? data.leaderboard.map((row) => ({
          userId: String(row?.userId ?? ""),
          displayName: String(row?.displayName ?? "Explorer"),
          uploadCount: Number(row?.uploadCount ?? 0),
          collectionPoints: Number(row?.collectionPoints ?? 0),
        })).filter((row) => row.userId)
      : [],
  };
}

function mergeSnapshots(
  previous: CommunityStatsSnapshot | null | undefined,
  next: CommunityStatsSnapshot
): CommunityStatsSnapshot {
  if (!previous) return next;
  const byId = new Map<string, LeaderboardEntry>();
  for (const row of previous.leaderboard) byId.set(row.userId, row);
  for (const row of next.leaderboard) {
    const existing = byId.get(row.userId);
    if (!existing) {
      byId.set(row.userId, row);
      continue;
    }
    byId.set(row.userId, {
      userId: row.userId,
      displayName: row.displayName || existing.displayName,
      uploadCount: Math.max(existing.uploadCount, row.uploadCount),
      collectionPoints: Math.max(existing.collectionPoints, row.collectionPoints),
    });
  }
  return {
    concurrentUsers: next.concurrentUsers,
    totalUsers: Math.max(previous.totalUsers, next.totalUsers, byId.size),
    totalUploads: Math.max(previous.totalUploads, next.totalUploads, SEED_UPLOAD_COUNT),
    uniqueVisitors: Math.max(previous.uniqueVisitors, next.uniqueVisitors),
    totalPageViews: Math.max(previous.totalPageViews, next.totalPageViews),
    leaderboard: Array.from(byId.values()),
  };
}

function readCachedStats(): CommunityStatsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw) as Partial<CommunityStatsSnapshot>);
  } catch {
    return null;
  }
}

function writeCachedStats(stats: CommunityStatsSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota */
  }
}

export function peekCachedCommunityStats(): CommunityStatsSnapshot | null {
  return readCachedStats();
}

export async function searchMusicTracks(query: string): Promise<ReelMusic[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: ReelMusic[] };
  return data.results ?? [];
}

export async function fetchCommunityStats(): Promise<CommunityStatsSnapshot | null> {
  const cached = readCachedStats();
  try {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return cached;
    const next = normalizeSnapshot(await res.json());
    const merged = mergeSnapshots(cached, next);
    writeCachedStats(merged);
    if (
      cached &&
      (cached.leaderboard.length > next.leaderboard.length ||
        cached.uniqueVisitors > next.uniqueVisitors ||
        cached.totalPageViews > next.totalPageViews)
    ) {
      void postStatsEvent({
        type: "hydrate",
        uniqueVisitors: merged.uniqueVisitors,
        totalPageViews: merged.totalPageViews,
        leaderboard: merged.leaderboard,
      });
    }
    return merged;
  } catch {
    return cached;
  }
}

export function getOrCreatePresenceSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "floraly_presence_session";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export async function postStatsEvent(
  body: Record<string, unknown>
): Promise<CommunityStatsSnapshot | null> {
  try {
    const res = await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const next = normalizeSnapshot(await res.json());
    const merged = mergeSnapshots(readCachedStats(), next);
    writeCachedStats(merged);
    return merged;
  } catch {
    return null;
  }
}
