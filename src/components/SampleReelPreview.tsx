"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import { MOCK_POSTS } from "@/lib/mockPosts";
import type { NaturePost } from "@/lib/types";

const SAMPLE_POSTS = MOCK_POSTS.slice(0, 6);

function SampleReelCard({
  post,
  liked,
  onLike,
}: {
  post: NaturePost;
  liked: boolean;
  onLike: () => void;
}) {
  const likeCount = post.likes + (liked ? 1 : 0);
  const tagLabels = post.tags
    .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label ?? t)
    .join(" · ");
  const regionLabel = post.region
    ? REGIONS.find((r) => r.id === post.region)?.label ?? post.region
    : null;

  return (
    <section className="relative h-full w-full shrink-0 snap-start snap-always">
      <img
        src={post.imageUrl}
        alt={post.caption ?? "Sample nature reel"}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />

      <div className="absolute bottom-8 right-4 z-10 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onLike}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Like sample reel"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm ${
              liked ? "bg-rose-500/80" : "bg-black/35"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill={liked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </span>
          <span className="text-[11px] font-medium">{likeCount}</span>
        </button>
        <div className="flex flex-col items-center gap-1 text-white/80">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </span>
          <span className="text-[11px] font-medium">{post.comments.length}</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-16 z-10 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-xs font-medium text-white">
            {post.authorInitial}
          </div>
          <span className="text-sm font-medium text-white">{post.author}</span>
        </div>
        {post.caption && (
          <p className="mt-2 line-clamp-2 text-sm text-white/90">{post.caption}</p>
        )}
        <p className="mt-1.5 text-[11px] text-white/55">
          {regionLabel ? `${tagLabels} · ${regionLabel}` : tagLabels}
        </p>
      </div>
    </section>
  );
}

export function SampleReelPreview() {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const root = document.getElementById("floraly-sample-scroller");
    if (!root) return;
    const onScroll = () => {
      const i = Math.round(root.scrollTop / root.clientHeight);
      setIndex(Math.min(SAMPLE_POSTS.length - 1, Math.max(0, i)));
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-forest-950 shadow-2xl ring-1 ring-white/10">
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
          <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
            Sample feed · try scrolling
          </span>
          <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70 backdrop-blur-md">
            {index + 1} / {SAMPLE_POSTS.length}
          </span>
        </div>

        <div
          id="floraly-sample-scroller"
          className="h-[min(72vh,640px)] snap-y snap-mandatory overflow-y-scroll scrollbar-hide"
        >
          {SAMPLE_POSTS.map((post) => (
            <div key={post.id} className="h-full w-full snap-start snap-always">
              <SampleReelCard
                post={post}
                liked={likedIds.has(post.id)}
                onLike={() => toggleLike(post.id)}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
          <p className="rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/75 backdrop-blur-sm">
            Scroll for more sample reels
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-stone-500">
        This is a preview -{" "}
        <Link href="/login" className="font-medium text-ink-muted underline">
          sign in
        </Link>{" "}
        to open your personal feed, save reels, and share memories.
      </p>
    </div>
  );
}
