"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import {
  RISK_LEVELS,
  getRiskMeta,
  getSpeciesById,
  resolveSpeciesCard,
  type SpeciesCard,
} from "@/lib/speciesCatalog";
import {
  getCollectionPoints,
  loadCollectedSpeciesIds,
} from "@/lib/collection";
import { postStatsEvent } from "@/lib/communityClient";
import { SpeciesDetailModal } from "./SpeciesDetailModal";

type SavedTab = "reels" | "collection";

export function SavedReelsPage() {
  const { savedPosts, toggleLike, isLiked, ready } = useFloraly();
  const { user } = useAuth();
  const [tab, setTab] = useState<SavedTab>("reels");
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<SpeciesCard | null>(null);

  useEffect(() => {
    if (!user) {
      setCollectedIds([]);
      return;
    }
    const ids = loadCollectedSpeciesIds(user.id);
    setCollectedIds(ids);
    void postStatsEvent({
      type: "sync_points",
      userId: user.id,
      displayName: user.displayName,
      points: getCollectionPoints(user.id),
    });
  }, [user]);

  const collectedCards = useMemo(
    () =>
      collectedIds
        .map((id) => getSpeciesById(id))
        .filter((c): c is SpeciesCard => !!c),
    [collectedIds]
  );

  const byRisk = useMemo(() => {
    return RISK_LEVELS.map((level) => ({
      level,
      cards: collectedCards.filter((c) => c.riskLevel === level.id),
    }));
  }, [collectedCards]);

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-cream-100"
        style={{ paddingBottom: "var(--nav-height)" }}
      >
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <Link href="/home" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl text-forest-800">Saved</h1>
              <p className="mt-1 text-sm text-stone-500">
                Loved reels and your flora/fauna collection.
              </p>
            </div>
            {tab === "reels" && savedPosts.length > 0 && (
              <Link
                href="/saved/watch"
                className="shrink-0 rounded-xl bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
              >
                Play all
              </Link>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-stone-200">
            <button
              type="button"
              onClick={() => setTab("reels")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                tab === "reels" ? "bg-forest-600 text-white" : "text-stone-600"
              }`}
            >
              Saved reels
            </button>
            <button
              type="button"
              onClick={() => setTab("collection")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                tab === "collection" ? "bg-forest-600 text-white" : "text-stone-600"
              }`}
            >
              Species collection
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        {tab === "reels" ? (
          savedPosts.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-stone-200">
              <h2 className="font-display text-xl text-forest-800">No saved reels yet</h2>
              <p className="mt-2 text-sm text-stone-500">
                When you find a nature moment you love, tap the heart on any reel to save it here.
              </p>
              <Link
                href="/feed"
                className="mt-6 inline-block rounded-2xl bg-forest-600 px-6 py-3 text-sm font-medium text-white hover:bg-forest-700"
              >
                Browse the feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {savedPosts.map((post) => {
                const tagLabel = post.tags
                  .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label)
                  .filter(Boolean)
                  .join(" · ");
                const regionLabel = post.region
                  ? REGIONS.find((r) => r.id === post.region)?.label
                  : null;
                const sticker = post.speciesSticker
                  ? resolveSpeciesCard(post.speciesSticker)
                  : null;
                const glow = sticker
                  ? getRiskMeta(sticker.riskLevel).glowClass
                  : "";

                return (
                  <div key={post.id} className="relative">
                    <Link href={`/saved/watch?post=${post.id}`}>
                      <div
                        className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-forest-900 ${glow}`}
                      >
                        <img
                          src={post.imageUrl}
                          alt={post.caption ?? "Saved reel"}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        {sticker && (
                          <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/95">
                            <img src={sticker.imageUrl} alt={sticker.name} className="h-full w-full object-cover" />
                          </span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs font-medium text-white">{post.author}</p>
                          {post.caption && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-white/80">
                              {post.caption}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-white/60">
                            {[
                              tagLabel,
                              regionLabel,
                              `${post.likes + (isLiked(post.id) ? 1 : 0)} likes`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-rose-500/80"
                      aria-label="Remove from saved"
                    >
                      <svg
                        className="h-4 w-4 text-white"
                        fill={isLiked(post.id) ? "currentColor" : "none"}
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
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-forest-600 px-4 py-3 text-white">
              <p className="text-sm text-forest-100">Collection score</p>
              <p className="font-display text-2xl">
                {user ? getCollectionPoints(user.id) : 0} pts · {collectedCards.length} cards
              </p>
            </div>

            {collectedCards.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-stone-200">
                <h2 className="font-display text-xl text-forest-800">
                  No species cards yet
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  Use the lucky slider when sharing, or tap stickers on reels in the feed to collect
                  flora and fauna across nine risk levels.
                </p>
                <Link
                  href="/feed"
                  className="mt-6 inline-block rounded-2xl bg-forest-600 px-6 py-3 text-sm font-medium text-white hover:bg-forest-700"
                >
                  Hunt for stickers
                </Link>
              </div>
            ) : (
              byRisk.map(({ level, cards }) => (
                <section key={level.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-forest-800">
                      {level.label}
                    </h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${level.badgeClass}`}>
                      {level.points} pts · {cards.length}
                    </span>
                  </div>
                  {cards.length === 0 ? (
                    <p className="rounded-xl bg-white/70 px-3 py-4 text-center text-xs text-stone-400 ring-1 ring-stone-100">
                      None collected yet. Keep scrolling and spinning.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {cards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setDetail(card)}
                          className={`rounded-2xl bg-white p-3 text-center ring-1 ring-stone-100 ${level.glowClass}`}
                        >
                          <div className="mx-auto h-10 w-10 overflow-hidden rounded-lg">
                            <img src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] font-medium text-forest-800">
                            {card.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        )}
      </main>

      {detail && (
        <SpeciesDetailModal
          species={detail}
          onClose={() => setDetail(null)}
          onCollected={(ids) => setCollectedIds(ids)}
        />
      )}
    </div>
  );
}
