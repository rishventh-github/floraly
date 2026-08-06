"use client";

import { useFloraly } from "@/context/FloralyContext";
import { ReelScroller } from "./ReelScroller";

export function MyReelsPage() {
  const { myPosts, ready } = useFloraly();

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

  return (
    <ReelScroller
      posts={myPosts}
      ownerMode
      backHref="/home"
      backLabel="Home"
      emptyTitle="No reels yet"
      emptyDescription="Share a photo from your outdoor adventures - your memory book will grow here."
      emptyActionHref="/upload"
      emptyActionLabel="Share your first reel"
      hint="Scroll your memory book"
    />
  );
}
