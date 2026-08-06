"use client";

import { useEffect } from "react";
import { postStatsEvent } from "@/lib/communityClient";

const VISITOR_KEY = "floraly_visitor_id";

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `vis_${Date.now()}`;
  }
}

/** Records one page view per browser session mount (unique visitors + totals). */
export function VisitTracker() {
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    void postStatsEvent({ type: "page_view", visitorId });
  }, []);

  return null;
}
