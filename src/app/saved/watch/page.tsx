"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFloraly } from "@/context/FloralyContext";
import { ReelScroller } from "@/components/ReelScroller";

function SavedWatchContent() {
  const searchParams = useSearchParams();
  const startPostId = searchParams.get("post");
  const { savedPosts, ready } = useFloraly();

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center bg-cream-100"
        style={{ height: "calc(100dvh - var(--nav-height))" }}
      >
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  // Start at the clicked reel, then continue through the rest of saved.
  const ordered =
    startPostId && savedPosts.some((p) => p.id === startPostId)
      ? [
          ...savedPosts.filter((p) => p.id === startPostId),
          ...savedPosts.filter((p) => p.id !== startPostId),
        ]
      : savedPosts;

  return (
    <ReelScroller
      posts={ordered}
      startPostId={startPostId}
      backHref="/saved"
      backLabel="Saved"
      emptyTitle="No saved reels"
      emptyDescription="Heart reels in the feed and they'll show up here as a scrollable collection."
      emptyActionHref="/feed"
      emptyActionLabel="Browse the feed"
      hint="Scroll your saved reels"
    />
  );
}

export default function SavedWatchPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center bg-cream-100"
          style={{ height: "calc(100dvh - var(--nav-height))" }}
        >
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      }
    >
      <SavedWatchContent />
    </Suspense>
  );
}
