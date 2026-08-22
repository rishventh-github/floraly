"use client";

import Link from "next/link";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { NATURE_TAGS } from "@/lib/constants";
import { CommunityStatsBar } from "./CommunityStatsBar";
import { CollectionHint } from "./CollectionHint";
import { useEffect } from "react";
import { postStatsEvent } from "@/lib/communityClient";

const QUICK_ACTIONS = [
  {
    href: "/feed",
    label: "Browse Feed",
    description: "Scroll through nature reels tailored just for you.",
    accent: "bg-forest-600 hover:bg-forest-700 text-white",
  },
  {
    href: "/upload",
    label: "Share a Memory",
    description: "Upload exciting photos from your outdoor adventures",
    accent: "bg-moss-400 hover:bg-moss-500 text-white",
  },
  {
    href: "/people",
    label: "People",
    description: "Follow friends and choose who sees your circle posts.",
    accent: "bg-surface hover:bg-cream-50 text-ink ring-1 ring-stone-200",
  },
  {
    href: "/groups",
    label: "Groups",
    description: "Create private circles for family and trail crews.",
    accent: "bg-surface hover:bg-cream-50 text-ink ring-1 ring-stone-200",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Compete (friendly) with others in the community.",
    accent: "bg-surface hover:bg-cream-50 text-ink ring-1 ring-stone-200",
  },
  {
    href: "/my-reels",
    label: "My Reels",
    description: "View and edit your nature reels.",
    accent: "bg-surface hover:bg-cream-50 text-ink ring-1 ring-stone-200",
  },
  {
    href: "/saved",
    label: "Saved Reels",
    description: "Your favorite nature moments, all in one place.",
    accent: "bg-surface hover:bg-cream-50 text-ink ring-1 ring-stone-200",
  },
];

export function HomePage() {
  const { preferences, savedPosts, myPosts, ready } = useFloraly();
  const { user } = useAuth();

  useEffect(() => {
    if (!ready || !user) return;
    void postStatsEvent({
      type: "sync_uploads",
      userId: user.id,
      displayName: user.displayName,
      count: myPosts.length,
    });
  }, [ready, user, myPosts.length]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-100">
        <div className="text-center">
          <span className="text-4xl">🌿</span>
          <p className="mt-3 font-display text-xl text-ink-muted">Floraly</p>
        </div>
      </div>
    );
  }

  const interestLabels = preferences.selectedTags
    .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label)
    .filter(Boolean);

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-gradient-to-b from-forest-50 to-cream-100 px-6 py-10 pr-28">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌿</span>
            <div>
              <h1 className="font-display text-3xl text-ink">Floraly</h1>
              <p className="text-sm text-stone-500">
                {user ? `Welcome back, ${user.displayName}!` : "Nature memories, shared."}
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-600">
            A calm corner of the internet: scroll real outdoor memories, save your
            favorites, and share your own.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {!preferences.onboardingComplete && (
          <Link
            href="/setup"
            className="mb-6 flex items-center gap-4 rounded-2xl bg-forest-600 p-5 text-white transition-all hover:bg-forest-700"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">Set your nature interests</p>
              <p className="mt-0.5 text-sm text-forest-100">
                Pick what you love so we can personalize your feed
              </p>
            </div>
            <svg className="ml-auto h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <div className="mb-6">
          <CommunityStatsBar />
        </div>

        <CollectionHint />

        <div className="grid gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center gap-4 rounded-2xl p-5 transition-all ${action.accent}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg">{action.label}</p>
                <p className={`mt-0.5 text-sm ${action.href === "/feed" || action.href === "/upload" ? "opacity-80" : "text-stone-500"}`}>
                  {action.description}
                </p>
              </div>
              {action.href === "/saved" && savedPosts.length > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-600">
                  {savedPosts.length}
                </span>
              )}
              {action.href === "/my-reels" && myPosts.length > 0 && (
                <span className="rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium text-ink-muted">
                  {myPosts.length}
                </span>
              )}
              <svg className="h-5 w-5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {preferences.onboardingComplete && interestLabels.length > 0 && (
          <div className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Your interests</h2>
              <Link href="/setup" className="text-sm text-forest-600 hover:underline">
                Edit
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preferences.selectedTags.map((tag) => {
                const info = NATURE_TAGS.find((t) => t.id === tag);
                return (
                  <span
                    key={tag}
                    className={`rounded-full px-3 py-1.5 text-sm ring-1 ${info?.chipClass ?? "bg-forest-50 text-ink-muted ring-forest-100"}`}
                  >
                    {info?.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {savedPosts.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Recently saved</h2>
              <Link href="/saved" className="text-sm text-forest-600 hover:underline">
                See all
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {savedPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/saved/watch?post=${post.id}`}
                  className="aspect-[3/4] overflow-hidden rounded-xl"
                >
                  <img
                    src={post.imageUrl}
                    alt={post.caption ?? "Saved reel"}
                    className="h-full w-full object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
