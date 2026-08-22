"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { getInitials } from "@/lib/auth";

type PeopleTab = "following" | "mutual";

export default function PeoplePage() {
  const { user } = useAuth();
  const { people, followedPeople, followingIds, unfollow } = useSocial();
  const [tab, setTab] = useState<PeopleTab>("following");

  if (!user) return null;

  const list = tab === "following" ? followedPeople : people;
  const emptyTitle =
    tab === "following" ? "Not following anyone yet" : "No mutual friends yet";
  const emptyBody =
    tab === "following"
      ? "Tap a username on the feed or leaderboard to open their profile and follow them."
      : "Follow someone from their profile, then have them follow you back. Once you both follow each other, they show up here.";

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Link
            href="/home"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            ‹ Home
          </Link>
          <h1 className="font-display text-2xl text-ink">People</h1>
          <p className="mt-1 text-sm text-stone-500">
            Switch between people you follow and friends who follow you back.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-6 py-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/groups"
            className="rounded-xl bg-forest-50 px-3 py-2 font-medium text-forest-700 hover:bg-forest-100"
          >
            Manage groups
          </Link>
          <button
            type="button"
            onClick={() => setTab("following")}
            className={`rounded-xl px-3 py-2 font-medium transition ${
              tab === "following"
                ? "bg-forest-600 text-white"
                : "bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-cream-50"
            }`}
          >
            Following {followingIds.length}
          </button>
          <button
            type="button"
            onClick={() => setTab("mutual")}
            className={`rounded-xl px-3 py-2 font-medium transition ${
              tab === "mutual"
                ? "bg-forest-600 text-white"
                : "bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-cream-50"
            }`}
          >
            Mutual {people.length}
          </button>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-stone-200">
            <p className="font-display text-lg text-ink">{emptyTitle}</p>
            <p className="mt-2 text-sm text-stone-500">{emptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-stone-200"
              >
                <Link
                  href={`/u/${person.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-600 text-sm font-medium text-white">
                    {getInitials(person.displayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink underline decoration-stone-300 underline-offset-2">
                      {person.displayName}
                    </p>
                    {person.email ? (
                      <p className="truncate text-xs text-stone-500">
                        {person.email}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400">
                        {tab === "mutual" ? "Mutual follow" : "Following"}
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => unfollow(person.id)}
                  className="shrink-0 rounded-xl bg-cream-100 px-3 py-2 text-xs font-medium text-ink ring-1 ring-stone-200 hover:bg-cream-50"
                >
                  Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
