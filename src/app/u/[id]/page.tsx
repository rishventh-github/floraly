"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFloraly } from "@/context/FloralyContext";
import { useSocial } from "@/context/SocialContext";
import {
  buildUserProfileStats,
  canViewerSeePost,
  ensurePostAuthorId,
  loadFollowing,
  loadGroups,
} from "@/lib/social";
import {
  fetchCommunityStats,
  peekCachedCommunityStats,
} from "@/lib/communityClient";
import { isVideoPost } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams();
  const userId = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const { allPosts } = useFloraly();
  const { isFollowing, follow, unfollow, refresh } = useSocial();
  const [boardPoints, setBoardPoints] = useState(0);

  useEffect(() => {
    const cached = peekCachedCommunityStats();
    const row = cached?.leaderboard.find((r) => r.userId === userId);
    if (row) setBoardPoints(row.collectionPoints ?? 0);

    let alive = true;
    void fetchCommunityStats().then((stats) => {
      if (!alive || !stats) return;
      const next = stats.leaderboard.find((r) => r.userId === userId);
      if (next) setBoardPoints(next.collectionPoints ?? 0);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const profile = useMemo(
    () =>
      buildUserProfileStats(userId, allPosts.map(ensurePostAuthorId), {
        collectionPoints: boardPoints,
      }),
    [userId, allPosts, boardPoints]
  );

  const visibleReels = useMemo(() => {
    const groups = loadGroups();
    const authored = allPosts
      .map(ensurePostAuthorId)
      .filter((p) => p.authorId === userId);
    return authored.filter((post) => {
      const following = post.authorId
        ? loadFollowing(post.authorId)
        : [];
      return canViewerSeePost(post, user?.id, {
        authorFollowing: following,
        groups,
      });
    });
  }, [allPosts, userId, user?.id]);

  if (!profile) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-cream-100 px-6"
        style={{ paddingBottom: "var(--nav-height)" }}
      >
        <p className="text-sm text-stone-500">User not found.</p>
      </div>
    );
  }

  const isSelf = user?.id === userId;
  const following = isFollowing(userId);

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-gradient-to-b from-forest-50 to-cream-100 px-6 py-8 pr-28">
        <div className="mx-auto max-w-lg">
          <Link
            href="/people"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            ‹ People
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-600 text-xl font-medium text-white">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl text-ink">
                {profile.displayName}
                {isSelf ? " (you)" : ""}
              </h1>
              {profile.email ? (
                <p className="truncate text-sm text-stone-500">
                  {profile.email}
                </p>
              ) : profile.isSeedProfile ? (
                <p className="text-sm text-stone-500">
                  Nature feed curator
                </p>
              ) : null}
            </div>
          </div>

          {!isSelf ? (
            <button
              type="button"
              onClick={() => {
                if (following) unfollow(userId);
                else follow(userId);
                refresh();
              }}
              className={`mt-5 w-full rounded-2xl py-3 text-sm font-medium transition ${
                following
                  ? "bg-surface text-ink ring-1 ring-stone-200 hover:bg-cream-50"
                  : "bg-forest-600 text-white hover:bg-forest-700"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          ) : (
            <Link
              href="/settings"
              className="mt-5 block w-full rounded-2xl bg-surface py-3 text-center text-sm font-medium text-ink ring-1 ring-stone-200 hover:bg-cream-50"
            >
              Edit profile in Settings
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-6">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Reels", value: profile.reelCount },
            { label: "Followers", value: profile.followers },
            { label: "Following", value: profile.following },
            { label: "Likes", value: profile.likesReceived },
            { label: "Collection pts", value: profile.collectionPoints },
            { label: "Groups", value: profile.groupCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-surface px-3 py-4 text-center ring-1 ring-stone-200"
            >
              <p className="font-display text-2xl text-ink">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        <h2 className="mt-8 font-display text-lg text-ink">Reels</h2>
        {visibleReels.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface p-5 text-sm text-stone-500 ring-1 ring-stone-200">
            No reels you can see yet. Circle posts only show if you follow them
            or share a group.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {visibleReels.map((post) => (
              <Link
                key={post.id}
                href="/feed"
                className="relative aspect-[3/4] overflow-hidden rounded-xl bg-forest-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {isVideoPost(post) ? (
                  <span className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                    Video
                  </span>
                ) : null}
                {post.visibility === "circle" ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                    Circle
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
