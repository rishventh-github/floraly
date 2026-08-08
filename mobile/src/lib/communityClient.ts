import { API_BASE_URL, STORAGE_KEYS } from "./constants";
import type { ReelMusic } from "./types";
import type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";

const SEED_UPLOAD_COUNT = 287;
const STATS_CACHE_KEY = "floraly_community_stats_v2";

const HIDDEN_LEADERBOARD_NAMES = new Set(["rish2", "rish3"]);
const HIDDEN_LEADERBOARD_IDS = new Set([
  "acct_msdqzpqb",
  "acct_msdr20bs",
  "acct_msezhjj8_kg2i",
]);

function isHiddenLeaderboardEntry(row: {
  userId?: string;
  displayName?: string;
}): boolean {
  const id = String(row.userId ?? "");
  const name = String(row.displayName ?? "").trim().toLowerCase();
  return HIDDEN_LEADERBOARD_IDS.has(id) || HIDDEN_LEADERBOARD_NAMES.has(name);
}

function api(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function emptyCommunityStats(): CommunityStatsSnapshot {
  return {
    concurrentUsers: 0,
    totalUsers: 0,
    totalUploads: SEED_UPLOAD_COUNT,
    uniqueVisitors: 0,
    totalPageViews: 0,
    leaderboard: [],
  };
}

function normalizeSnapshot(
  data: Partial<CommunityStatsSnapshot> | null | undefined
): CommunityStatsSnapshot {
  const fallback = emptyCommunityStats();
  if (!data || typeof data !== "object") return fallback;
  return {
    concurrentUsers:
      typeof data.concurrentUsers === "number" ? data.concurrentUsers : 0,
    totalUsers:
      typeof data.totalUsers === "number" ? data.totalUsers : fallback.totalUsers,
    totalUploads:
      typeof data.totalUploads === "number"
        ? data.totalUploads
        : fallback.totalUploads,
    uniqueVisitors:
      typeof data.uniqueVisitors === "number" ? data.uniqueVisitors : 0,
    totalPageViews:
      typeof data.totalPageViews === "number" ? data.totalPageViews : 0,
    leaderboard: Array.isArray(data.leaderboard)
      ? data.leaderboard
          .map((row) => ({
            userId: String(row?.userId ?? ""),
            displayName: String(row?.displayName ?? "Explorer"),
            uploadCount: Number(row?.uploadCount ?? 0),
            collectionPoints: Number(row?.collectionPoints ?? 0),
          }))
          .filter((row) => row.userId && !isHiddenLeaderboardEntry(row))
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
      collectionPoints: Math.max(
        existing.collectionPoints,
        row.collectionPoints
      ),
    });
  }
  return {
    concurrentUsers: next.concurrentUsers,
    totalUsers: Math.max(previous.totalUsers, next.totalUsers, byId.size),
    totalUploads: Math.max(
      previous.totalUploads,
      next.totalUploads,
      SEED_UPLOAD_COUNT
    ),
    uniqueVisitors: Math.max(previous.uniqueVisitors, next.uniqueVisitors),
    totalPageViews: Math.max(previous.totalPageViews, next.totalPageViews),
    leaderboard: Array.from(byId.values()),
  };
}

export async function peekCachedCommunityStats(): Promise<CommunityStatsSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw) as Partial<CommunityStatsSnapshot>);
  } catch {
    return null;
  }
}

async function writeCachedStats(stats: CommunityStatsSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

export async function searchMusicTracks(query: string): Promise<ReelMusic[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(api(`/api/music/search?q=${encodeURIComponent(q)}`));
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ReelMusic[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function fetchCommunityStats(): Promise<CommunityStatsSnapshot | null> {
  const cached = await peekCachedCommunityStats();
  try {
    const res = await fetch(api("/api/stats"));
    if (!res.ok) return cached;
    const next = normalizeSnapshot(await res.json());
    const merged = mergeSnapshots(cached, next);
    await writeCachedStats(merged);
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

export async function getOrCreatePresenceSessionId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.presenceSession);
    if (existing) return existing;
    const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.presenceSession, id);
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export async function postStatsEvent(
  body: Record<string, unknown>
): Promise<CommunityStatsSnapshot | null> {
  try {
    const res = await fetch(api("/api/stats"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const next = normalizeSnapshot(await res.json());
    const merged = mergeSnapshots(await peekCachedCommunityStats(), next);
    await writeCachedStats(merged);
    return merged;
  } catch {
    return null;
  }
}

export async function classifyImage(body: {
  imageUrl: string;
  caption?: string;
  filename?: string;
}): Promise<{
  verdict: "approved" | "rejected";
  tags: string[];
  reasons?: string[];
  source?: string;
}> {
  try {
    const res = await fetch(api("/api/classify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { verdict: "approved", tags: [], reasons: ["Could not verify photo."] };
    }
    return await res.json();
  } catch {
    return { verdict: "approved", tags: [], reasons: ["Offline - skipped scan."] };
  }
}
