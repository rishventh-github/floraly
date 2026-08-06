"use client";

import { Suspense } from "react";
import { NatureFeed } from "@/components/NatureFeed";
import { useFloraly } from "@/context/FloralyContext";

function FeedContent() {
  const { ready } = useFloraly();

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center bg-forest-950"
        style={{ height: "calc(100dvh - var(--nav-height))" }}
      >
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return <NatureFeed />;
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center bg-forest-950"
          style={{ height: "calc(100dvh - var(--nav-height))" }}
        >
          <p className="text-white/60">Loading...</p>
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
