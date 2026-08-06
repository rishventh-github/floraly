import { API_BASE_URL, STORAGE_KEYS } from "./constants";
import type { ReelMusic } from "./types";
import type { CommunityStatsSnapshot } from "./communityTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";

function api(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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

export async function fetchCommunityStats(): Promise<CommunityStatsSnapshot> {
  try {
    const res = await fetch(api("/api/stats"));
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
        (row: {
          userId: string;
          displayName: string;
          uploadCount: number;
          collectionPoints?: number;
        }) => ({
          ...row,
          collectionPoints: row.collectionPoints ?? 0,
        })
      ),
    };
  } catch {
    return {
      concurrentUsers: 0,
      totalUsers: 0,
      totalUploads: 0,
      uniqueVisitors: 0,
      totalPageViews: 0,
      leaderboard: [],
    };
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
): Promise<void> {
  try {
    await fetch(api("/api/stats"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* offline */
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
