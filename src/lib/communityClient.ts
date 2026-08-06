import type { ReelMusic } from "./types";
import type { CommunityStatsSnapshot } from "./communityTypes";

export type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";

export async function searchMusicTracks(query: string): Promise<ReelMusic[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: ReelMusic[] };
  return data.results ?? [];
}

export async function fetchCommunityStats(): Promise<CommunityStatsSnapshot> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  if (!res.ok) {
    return {
      concurrentUsers: 0,
      totalUsers: 0,
      totalUploads: 0,
      uniqueVisitors: 0,
      totalPageViews: 0,
      leaderboard: [],
    };
  }
  const data = await res.json();
  return {
    ...data,
    uniqueVisitors: data.uniqueVisitors ?? 0,
    totalPageViews: data.totalPageViews ?? 0,
    leaderboard: (data.leaderboard ?? []).map(
      (row: { userId: string; displayName: string; uploadCount: number; collectionPoints?: number }) => ({
        ...row,
        collectionPoints: row.collectionPoints ?? 0,
      })
    ),
  };
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
): Promise<void> {
  try {
    await fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* ignore offline */
  }
}
