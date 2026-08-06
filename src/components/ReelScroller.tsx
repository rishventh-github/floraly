"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFloraly } from "@/context/FloralyContext";
import { useUI } from "@/context/UIContext";
import { FeedCard } from "./FeedCard";
import type { NaturePost } from "@/lib/types";

interface ReelScrollerProps {
  posts: NaturePost[];
  startPostId?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionHref: string;
  emptyActionLabel: string;
  backHref?: string;
  backLabel?: string;
  ownerMode?: boolean;
  hint?: string;
}

export function ReelScroller({
  posts,
  startPostId,
  emptyTitle,
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
  backHref,
  backLabel = "Back",
  ownerMode = false,
  hint = "Scroll through your memories",
}: ReelScrollerProps) {
  const { isLiked, toggleLike, onPostViewed, deletePost } = useFloraly();
  const { commentsOpen, setCommentsOpen } = useUI();
  const scrolledRef = useRef(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!startPostId || scrolledRef.current || posts.length === 0) return;
    const timer = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-post-id="${startPostId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        scrolledRef.current = true;
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [startPostId, posts]);

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deletePost(pendingDeleteId);
    setPendingDeleteId(null);
  };

  if (posts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-cream-100 px-8 text-center"
        style={{ height: "calc(100dvh - var(--nav-height))" }}
      >
        {backHref && (
          <Link
            href={backHref}
            className="absolute left-4 top-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        )}
        <h2 className="mt-4 font-display text-xl text-forest-800">{emptyTitle}</h2>
        <p className="mt-2 max-w-sm text-sm text-stone-500">{emptyDescription}</p>
        <Link
          href={emptyActionHref}
          className="mt-6 inline-block rounded-2xl bg-forest-600 px-6 py-3 text-sm font-medium text-white hover:bg-forest-700"
        >
          {emptyActionLabel}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden bg-forest-950"
      style={{ height: "calc(100dvh - var(--nav-height))" }}
    >
      {backHref && (
        <div className="absolute left-0 right-0 top-0 z-30 px-4 pt-4">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-md hover:bg-black/55"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md">
              {posts.length} {posts.length === 1 ? "reel" : "reels"}
            </span>
          </div>
        </div>
      )}

      <div
        className={`h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide ${
          commentsOpen ? "overflow-hidden" : ""
        }`}
      >
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            isLiked={isLiked(post.id)}
            onLike={() => toggleLike(post.id)}
            onVisible={() => onPostViewed(post)}
            onCommentsOpenChange={setCommentsOpen}
            ownerMode={ownerMode}
            editHref={ownerMode ? `/my-reels/${post.id}/edit` : undefined}
            onDelete={ownerMode ? () => setPendingDeleteId(post.id) : undefined}
          />
        ))}
      </div>

      {!commentsOpen && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <p className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
            {hint}
          </p>
        </div>
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-xl ring-1 ring-stone-200"
          >
            <h2 className="font-display text-xl text-forest-800">Delete this reel?</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              This will permanently remove the reel from your memory book. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700"
              >
                Yes, delete reel
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-forest-800 ring-1 ring-stone-200 hover:bg-cream-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
