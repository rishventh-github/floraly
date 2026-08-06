"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { loadLastFeedPostId } from "@/lib/preferences";
import { CurateBar } from "./CurateBar";
import { FeedCard } from "./FeedCard";

export function NatureFeed() {
  const searchParams = useSearchParams();
  const startPostId = searchParams.get("post");
  const { settings } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    posts,
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

  useEffect(() => {
    if (posts.length === 0) return;
    const targetId = startPostId || loadLastFeedPostId();
    if (!targetId) return;
    if (!posts.some((p) => p.id === targetId)) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector(`[data-post-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [startPostId, posts]);

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

      <div
        ref={scrollRef}
        className={`h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide ${
          commentsOpen ? "overflow-hidden" : ""
        }`}
      >
        {posts.length === 0 && activeCurateTags.length > 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-lg text-white">
              No reels match your curation
            </p>
            <p className="mt-2 text-sm text-white/60">
              Try a broader request like &quot;forests&quot; or &quot;water&quot;
            </p>
            <button
              type="button"
              onClick={clearCurate}
              className="mt-6 rounded-xl bg-forest-600 px-5 py-2.5 text-sm text-white hover:bg-forest-700"
            >
              Clear curation
            </button>
          </div>
        ) : (
          posts.map((post) => (
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
