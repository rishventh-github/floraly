"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CommunityStatsSnapshot } from "@/lib/communityTypes";
import {
  fetchCommunityStats,
  peekCachedCommunityStats,
} from "@/lib/communityClient";
import { STATS_UPDATED_EVENT } from "@/components/VisitTracker";

export function CommunityStatsBar({ compact = false }: { compact?: boolean }) {
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
    const id = window.setInterval(load, 12_000);
    const onStats = (event: Event) => {
      const detail = (event as CustomEvent<CommunityStatsSnapshot>).detail;
      if (detail) setStats(detail);
    };
    window.addEventListener(STATS_UPDATED_EVENT, onStats);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener(STATS_UPDATED_EVENT, onStats);
    };
  }, []);

  const items = [
    {
      label: "Online now",
      value: stats?.concurrentUsers ?? "-",
    },
    {
      label: "Joined",
      value: stats?.totalUsers ?? "-",
    },
    {
      label: "Visitors",
      value: stats?.uniqueVisitors ?? "-",
    },
    {
      label: "Nature pics",
      value: stats?.totalUploads ?? "-",
    },
  ];

  return (
    <div
      className={`rounded-2xl bg-white/80 ring-1 ring-moss-200/70 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="mb-3 flex justify-end">
        <Link
          href="/leaderboard"
          className="text-xs font-medium text-forest-600 hover:text-forest-800"
        >
          Leaderboard
        </Link>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-cream-50 px-2 py-3 text-center ring-1 ring-stone-100"
          >
            <p className="font-display text-xl text-forest-800 sm:text-2xl">
              {item.value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500 sm:text-xs">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
