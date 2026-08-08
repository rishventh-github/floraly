"use client";

import { useEffect, useState } from "react";
import type { CommunityStatsSnapshot } from "@/lib/communityTypes";
import {
  fetchCommunityStats,
  peekCachedCommunityStats,
} from "@/lib/communityClient";

/** Compact public counters for the landing page. */
export function LandingStats() {
  const [stats, setStats] = useState<CommunityStatsSnapshot | null>(
    () => peekCachedCommunityStats()
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const next = await fetchCommunityStats();
      if (alive && next) setStats(next);
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const visitors = stats?.uniqueVisitors ?? "—";
  const members = stats?.totalUsers ?? "—";
  const views = stats?.totalPageViews ?? "—";

  return (
    <div className="mt-8 grid max-w-md grid-cols-3 gap-2">
      <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm ring-1 ring-white/15">
        <p className="font-display text-2xl text-white">{visitors}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-white/65">
          Visitors
        </p>
      </div>
      <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm ring-1 ring-white/15">
        <p className="font-display text-2xl text-white">{members}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-white/65">
          Joined
        </p>
      </div>
      <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm ring-1 ring-white/15">
        <p className="font-display text-2xl text-white">{views}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-white/65">
          Page views
        </p>
      </div>
    </div>
  );
}
