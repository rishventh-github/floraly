"use client";

import { useEffect } from "react";
import {
  peekCachedCommunityStats,
  postStatsEvent,
  type CommunityStatsSnapshot,
} from "@/lib/communityClient";

const VISITOR_KEY = "floraly_visitor_id";
export const STATS_UPDATED_EVENT = "floraly:stats-updated";

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function emitStatsUpdated(stats: CommunityStatsSnapshot) {
  try {
    window.dispatchEvent(
      new CustomEvent(STATS_UPDATED_EVENT, { detail: stats })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Counts each browser as one unique visitor when they open Floraly.
 * Retries on failure so cold starts / flaky networks still register.
 */
export function VisitTracker() {
  useEffect(() => {
    let cancelled = false;
    const visitorId = getOrCreateVisitorId();
    const cached = peekCachedCommunityStats();

    const record = async (attempt = 0): Promise<void> => {
      const stats = await postStatsEvent({
        type: "page_view",
        visitorId,
        uniqueVisitorsFloor: cached?.uniqueVisitors ?? 0,
        totalPageViewsFloor: cached?.totalPageViews ?? 0,
      });
      if (cancelled) return;
      if (stats) {
        emitStatsUpdated(stats);
        return;
      }
      if (attempt < 3) {
        window.setTimeout(() => {
          void record(attempt + 1);
        }, 800 * (attempt + 1));
      }
    };

    void record();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
