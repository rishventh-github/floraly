import type { LeaderboardEntry } from "./communityTypes";

/** Baseline community totals used when serverless storage is empty. */
export const SEED_UPLOAD_COUNT = 287;

export interface SeededMember {
  userId: string;
  displayName: string;
  count: number;
  collectionPoints: number;
}

/**
 * Known members baked into the app so leaderboard/join counts survive
 * Vercel cold starts (local .data files do not persist there).
 * Runtime events still merge on top via hydrate + client cache.
 * The nature-feed seed photos are attributed to Keithav S. on the leaderboard.
 */
export const SEEDED_MEMBERS: SeededMember[] = [
  {
    userId: "seed_keithav",
    displayName: "Keithav S.",
    count: SEED_UPLOAD_COUNT,
    collectionPoints: 0,
  },
  {
    userId: "acct_msjkkqpj",
    displayName: "rishventh ramoshan",
    count: 0,
    collectionPoints: 0,
  },
  {
    userId: "acct_ms4ag7xh",
    displayName: "rish1",
    count: 1,
    collectionPoints: 2,
  },
];

export const EMPTY_STATS_SNAPSHOT = {
  concurrentUsers: 0,
  totalUsers: 0,
  totalUploads: SEED_UPLOAD_COUNT,
  uniqueVisitors: 0,
  totalPageViews: 0,
  leaderboard: [] as LeaderboardEntry[],
};
