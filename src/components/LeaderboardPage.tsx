"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/auth";
import type { CommunityStatsSnapshot, LeaderboardEntry } from "@/lib/communityTypes";
import {
  fetchCommunityStats,
  peekCachedCommunityStats,
} from "@/lib/communityClient";
import { CommunityStatsBar } from "./CommunityStatsBar";

function medal(rank: number): string {
  return `#${rank}`;
}

type BoardMode = "uploads" | "points";

export function LeaderboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CommunityStatsSnapshot | null>(
    () => peekCachedCommunityStats()
  );
  const [mode, setMode] = useState<BoardMode>("uploads");
  const [loading, setLoading] = useState(() => !peekCachedCommunityStats());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const next = await fetchCommunityStats();
      if (!alive) return;
      if (next) {
        setStats(next);
        setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 10_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const rows: LeaderboardEntry[] = useMemo(() => {
    const list = [...(stats?.leaderboard ?? [])];
    if (mode === "uploads") {
      return list.sort(
        (a, b) =>
          b.uploadCount - a.uploadCount || a.displayName.localeCompare(b.displayName)
      );
    }
    return list.sort(
      (a, b) =>
        (b.collectionPoints ?? 0) - (a.collectionPoints ?? 0) ||
        a.displayName.localeCompare(b.displayName)
    );
  }, [stats, mode]);

  const myRank = user
    ? rows.findIndex((r) => r.userId === user.id) + 1
    : 0;

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-gradient-to-b from-forest-50 to-cream-100 px-6 py-8 pr-28">
        <div className="mx-auto max-w-lg">
          <Link
            href="/home"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <h1 className="font-display text-3xl text-ink">Leaderboard</h1>
          <p className="mt-2 text-sm text-stone-600">
            Switch between top uploaders and top species collectors.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-6">
        <CommunityStatsBar />

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5 ring-1 ring-stone-200">
          <button
            type="button"
            onClick={() => setMode("uploads")}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "uploads"
                ? "bg-forest-600 text-white"
                : "text-stone-600 hover:bg-cream-50"
            }`}
          >
            Most uploads
          </button>
          <button
            type="button"
            onClick={() => setMode("points")}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "points"
                ? "bg-forest-600 text-white"
                : "text-stone-600 hover:bg-cream-50"
            }`}
          >
            Most points
          </button>
        </div>

        <p className="text-xs text-stone-500">
          {mode === "uploads"
            ? "Ranked by nature pictures shared."
            : "Points from flora/fauna cards: Least Concern = 1 … Extinct = 9."}
        </p>

        {user && myRank > 0 && (
          <div className="rounded-2xl bg-forest-600 px-4 py-3 text-white">
            <p className="text-sm text-forest-100">Your rank</p>
            <p className="font-display text-2xl">
              #{myRank} ·{" "}
              {mode === "uploads"
                ? `${rows[myRank - 1]?.uploadCount ?? 0} pics`
                : `${rows[myRank - 1]?.collectionPoints ?? 0} pts`}
            </p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-stone-200">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-medium text-ink">
              {mode === "uploads" ? "Top nature sharers" : "Top species collectors"}
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              {loading || stats == null
                ? "Loading ranks..."
                : mode === "uploads"
                  ? "No members ranked yet — sign in or share a nature pic to appear here."
                  : "No collection points yet — find species stickers to climb this board."}
            </p>
          ) : (
            <ul>
              {rows.map((entry, index) => {
                const rank = index + 1;
                const isMe = user?.id === entry.userId;
                const score =
                  mode === "uploads"
                    ? `${entry.uploadCount} nature ${entry.uploadCount === 1 ? "picture" : "pictures"}`
                    : `${entry.collectionPoints ?? 0} collection pts`;
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-3 border-b border-stone-100 px-4 py-3 last:border-0 ${
                      isMe ? "bg-moss-50" : ""
                    }`}
                  >
                    <span className="w-8 text-center text-sm font-medium text-ink-muted">
                      {medal(rank)}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-xs font-medium text-white">
                      {getInitials(entry.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {entry.displayName}
                        {isMe ? " (you)" : ""}
                      </p>
                      <p className="text-xs text-stone-500">{score}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="rounded-2xl bg-moss-50 p-4 ring-1 ring-moss-200">
          <p className="text-sm text-ink">
            Share reels to climb the uploads board. Spin the lucky wheel and collect rare
            species stickers to climb the points board.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/upload"
              className="inline-flex rounded-xl bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
            >
              Share a nature pic
            </Link>
            <Link
              href="/saved"
              className="inline-flex rounded-xl bg-surface px-4 py-2 text-sm font-medium text-ink ring-1 ring-stone-200 hover:bg-cream-50"
            >
              View collection
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
