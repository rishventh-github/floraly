"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { loadLastFeedPostId } from "@/lib/preferences";
import { isPrivateReel } from "@/lib/social";
import { CurateBar } from "./CurateBar";
import { FeedCard } from "./FeedCard";
import type { NaturePost } from "@/lib/types";

type FeedScope = "all" | "groups";

function sortNewestFirst(posts: NaturePost[]): NaturePost[] {
  return [...posts].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  );
}

export function NatureFeed() {
  const searchParams = useSearchParams();
  const startPostId = searchParams.get("post");
  const { settings } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<FeedScope>("all");

  const {
    posts,
    visiblePosts,
    preferences,
    isLiked,
    toggleLike,
    onPostViewed,
    submitCuratePrompt,
    curateMessage,
    curateLoading,
    clearCurate,
  } = useFloraly();
  const { commentsOpen, setCommentsOpen } = useUI();

  const activeCurateTags =
    preferences.sessionOverrides &&
    preferences.sessionOverrides.expiresAt > Date.now()
      ? preferences.sessionOverrides.tags
      : [];

  const scopedPosts = useMemo(() => {
    if (scope === "all") return posts;
    return sortNewestFirst(visiblePosts.filter((p) => isPrivateReel(p)));
  }, [posts, visiblePosts, scope]);

  useEffect(() => {
    if (scopedPosts.length === 0) return;
    const targetId = startPostId || loadLastFeedPostId();
    if (!targetId) return;
    if (!scopedPosts.some((p) => p.id === targetId)) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector(`[data-post-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [startPostId, scopedPosts]);

  return (
    <div
      className="relative overflow-hidden bg-forest-950"
      style={{ height: "calc(100dvh - var(--nav-height))" }}
    >
      {settings.showCurateBar && (
        <CurateBar
          onSubmit={submitCuratePrompt}
          message={curateMessage}
          loading={curateLoading}
          activeTags={activeCurateTags}
          onClear={clearCurate}
        />
      )}

      {!commentsOpen && (
        <div className="absolute left-0 right-0 top-3 z-20 flex justify-center px-4">
          <div className="inline-flex rounded-full bg-black/45 p-1 backdrop-blur-md ring-1 ring-white/15">
            {(
              [
                ["all", "All"],
                ["groups", "Groups"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setScope(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  scope === id
                    ? "bg-white text-forest-900"
                    : "text-white/75 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide ${
          commentsOpen ? "overflow-hidden" : ""
        }`}
      >
        {scopedPosts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-lg text-white">
              {scope === "groups"
                ? "No group reels yet"
                : activeCurateTags.length > 0
                  ? "No reels match your curation"
                  : "No reels yet"}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {scope === "groups"
                ? "Share a reel to a group, or join a group someone shared with."
                : activeCurateTags.length > 0
                  ? 'Try a broader request like "forests" or "water"'
                  : "Scroll back after sharing something outdoors."}
            </p>
            {activeCurateTags.length > 0 ? (
              <button
                type="button"
                onClick={clearCurate}
                className="mt-6 rounded-xl bg-forest-600 px-5 py-2.5 text-sm text-white hover:bg-forest-700"
              >
                Clear curation
              </button>
            ) : null}
          </div>
        ) : (
          scopedPosts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              isLiked={isLiked(post.id)}
              onLike={() => toggleLike(post.id)}
              onVisible={() => onPostViewed(post)}
              onCommentsOpenChange={setCommentsOpen}
            />
          ))
        )}
      </div>

      {!commentsOpen && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <p className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
            Scroll for more nature
          </p>
        </div>
      )}
    </div>
  );
}
