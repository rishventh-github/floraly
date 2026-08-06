import fs from "fs";
import path from "path";
import type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";

export type { CommunityStatsSnapshot, LeaderboardEntry };

interface PresenceRecord {
  userId: string;
  displayName: string;
  lastSeen: number;
}

interface StatsStore {
  knownUserIds: string[];
  uploadCounts: Record<
    string,
    { displayName: string; count: number; collectionPoints: number }
  >;
  seededUploads: number;
  userUploadTotal: number;
  /** Unique visitor fingerprints (localStorage ids from the browser). */
  visitorIds: string[];
  /** Cumulative page views across the web app. */
  totalPageViews: number;
}

const PRESENCE_TTL_MS = 45_000;
const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "community-stats.json");

/** Seeded feed photos count toward total uploads, but not the public leaderboard. */
const SEED_UPLOAD_COUNT = 287;
const HIDDEN_LEADERBOARD_IDS = new Set(["seed_secret_user", "seed_keithav"]);

type GlobalStats = {
  presence: Map<string, PresenceRecord>;
  store: StatsStore;
};

function globalBucket(): GlobalStats {
  const g = globalThis as typeof globalThis & { __floralyStats?: GlobalStats };
  if (!g.__floralyStats) {
    g.__floralyStats = {
      presence: new Map(),
      store: loadStoreFromDisk(),
    };
  }
  return g.__floralyStats;
}

function defaultStore(): StatsStore {
  return {
    knownUserIds: [],
    uploadCounts: {},
    seededUploads: SEED_UPLOAD_COUNT,
    userUploadTotal: 0,
    visitorIds: [],
    totalPageViews: 0,
  };
}

function isHiddenLeaderboardUser(userId: string, displayName?: string): boolean {
  if (HIDDEN_LEADERBOARD_IDS.has(userId)) return true;
  const name = (displayName ?? "").trim().toLowerCase();
  return name === "secret user" || name === "keithav s";
}

function loadStoreFromDisk(): StatsStore {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultStore();
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Partial<StatsStore> & {
      uploadCounts?: Record<
        string,
        { displayName: string; count: number; collectionPoints?: number }
      >;
    };
    const base = defaultStore();
    const mergedCounts: StatsStore["uploadCounts"] = {};
    for (const [id, value] of Object.entries(raw.uploadCounts ?? {})) {
      if (isHiddenLeaderboardUser(id, value.displayName)) continue;
      mergedCounts[id] = {
        displayName: value.displayName,
        count: value.count,
        collectionPoints: value.collectionPoints ?? 0,
      };
    }
    const known = (Array.isArray(raw.knownUserIds) ? raw.knownUserIds : [])
      .filter((id) => !isHiddenLeaderboardUser(id, mergedCounts[id]?.displayName));
    return {
      knownUserIds: Array.from(new Set(known)),
      uploadCounts: mergedCounts,
      seededUploads: typeof raw.seededUploads === "number" ? raw.seededUploads : base.seededUploads,
      userUploadTotal:
        typeof raw.userUploadTotal === "number" ? raw.userUploadTotal : base.userUploadTotal,
      visitorIds: Array.from(
        new Set(Array.isArray(raw.visitorIds) ? raw.visitorIds.filter(Boolean) : [])
      ),
      totalPageViews:
        typeof raw.totalPageViews === "number" ? raw.totalPageViews : base.totalPageViews,
    };
  } catch {
    return defaultStore();
  }
}

function persistStore(store: StatsStore): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    /* ignore disk errors in demo mode */
  }
}

function prunePresence(presence: Map<string, PresenceRecord>): void {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [id, record] of presence) {
    if (record.lastSeen < cutoff) presence.delete(id);
  }
}

function buildLeaderboard(store: StatsStore): LeaderboardEntry[] {
  return Object.entries(store.uploadCounts)
    .filter(([userId, value]) => !isHiddenLeaderboardUser(userId, value.displayName))
    .map(([userId, value]) => ({
      userId,
      displayName: value.displayName,
      uploadCount: value.count,
      collectionPoints: value.collectionPoints ?? 0,
    }))
    .sort((a, b) => b.uploadCount - a.uploadCount || a.displayName.localeCompare(b.displayName));
}

export function getCommunityStats(): CommunityStatsSnapshot {
  const { presence, store } = globalBucket();
  // Drop legacy seed accounts if they linger in memory from an older process.
  let dirty = false;
  for (const [userId, value] of Object.entries(store.uploadCounts)) {
    if (isHiddenLeaderboardUser(userId, value.displayName)) {
      delete store.uploadCounts[userId];
      dirty = true;
    }
  }
  const nextKnown = store.knownUserIds.filter(
    (id) => !isHiddenLeaderboardUser(id, store.uploadCounts[id]?.displayName)
  );
  if (nextKnown.length !== store.knownUserIds.length) {
    store.knownUserIds = nextKnown;
    dirty = true;
  }
  if (dirty) persistStore(store);
  prunePresence(presence);
  return {
    concurrentUsers: presence.size,
    totalUsers: store.knownUserIds.length,
    totalUploads: store.seededUploads + store.userUploadTotal,
    uniqueVisitors: store.visitorIds.length,
    totalPageViews: store.totalPageViews,
    leaderboard: buildLeaderboard(store),
  };
}

export function heartbeatPresence(input: {
  sessionId: string;
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  bucket.presence.set(input.sessionId, {
    userId: input.userId,
    displayName: input.displayName,
    lastSeen: Date.now(),
  });
  return getCommunityStats();
}

export function clearPresence(sessionId: string): CommunityStatsSnapshot {
  const bucket = globalBucket();
  bucket.presence.delete(sessionId);
  return getCommunityStats();
}

export function recordUserSeen(input: {
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  if (!bucket.store.knownUserIds.includes(input.userId)) {
    bucket.store.knownUserIds.push(input.userId);
  }
  const existing = bucket.store.uploadCounts[input.userId];
  if (!existing) {
    bucket.store.uploadCounts[input.userId] = {
      displayName: input.displayName,
      count: 0,
      collectionPoints: 0,
    };
  } else {
    bucket.store.uploadCounts[input.userId] = {
      ...existing,
      displayName: input.displayName,
      collectionPoints: existing.collectionPoints ?? 0,
    };
  }
  persistStore(bucket.store);
  return getCommunityStats();
}

export function recordUpload(input: {
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  if (!bucket.store.knownUserIds.includes(input.userId)) {
    bucket.store.knownUserIds.push(input.userId);
  }
  const existing = bucket.store.uploadCounts[input.userId];
  bucket.store.uploadCounts[input.userId] = {
    displayName: input.displayName,
    count: (existing?.count ?? 0) + 1,
    collectionPoints: existing?.collectionPoints ?? 0,
  };
  bucket.store.userUploadTotal += 1;
  persistStore(bucket.store);
  return getCommunityStats();
}

export function syncUserUploads(input: {
  userId: string;
  displayName: string;
  count: number;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  const nextCount = Math.max(0, Math.floor(input.count));
  if (!bucket.store.knownUserIds.includes(input.userId)) {
    bucket.store.knownUserIds.push(input.userId);
  }
  const existing = bucket.store.uploadCounts[input.userId];
  const prevCount = existing?.count ?? 0;
  if (nextCount > prevCount) {
    bucket.store.userUploadTotal += nextCount - prevCount;
  } else if (nextCount < prevCount) {
    bucket.store.userUploadTotal = Math.max(
      0,
      bucket.store.userUploadTotal - (prevCount - nextCount)
    );
  }
  bucket.store.uploadCounts[input.userId] = {
    displayName: input.displayName,
    count: nextCount,
    collectionPoints: existing?.collectionPoints ?? 0,
  };
  persistStore(bucket.store);
  return getCommunityStats();
}

export function recordPageVisit(input: {
  visitorId: string;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  const visitorId = input.visitorId.trim();
  if (visitorId) {
    if (!bucket.store.visitorIds.includes(visitorId)) {
      bucket.store.visitorIds.push(visitorId);
    }
    bucket.store.totalPageViews += 1;
    persistStore(bucket.store);
  }
  return getCommunityStats();
}

export function recordJoin(input: {
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  return recordUserSeen(input);
}

export function syncCollectionPoints(input: {
  userId: string;
  displayName: string;
  points: number;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  if (!bucket.store.knownUserIds.includes(input.userId)) {
    bucket.store.knownUserIds.push(input.userId);
  }
  const existing = bucket.store.uploadCounts[input.userId];
  bucket.store.uploadCounts[input.userId] = {
    displayName: input.displayName,
    count: existing?.count ?? 0,
    collectionPoints: Math.max(0, Math.floor(input.points)),
  };
  persistStore(bucket.store);
  return getCommunityStats();
}
