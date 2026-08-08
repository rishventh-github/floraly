import fs from "fs";
import path from "path";
import type { CommunityStatsSnapshot, LeaderboardEntry } from "./communityTypes";
import { SEED_UPLOAD_COUNT, SEEDED_MEMBERS } from "./communityStatsSeed";
import {
  loadRemoteStatsJson,
  saveRemoteStatsJson,
} from "./communityStatsRemote";

export type { CommunityStatsSnapshot, LeaderboardEntry };

interface PresenceRecord {
  userId: string;
  displayName: string;
  lastSeen: number;
}

interface MemberCounts {
  displayName: string;
  count: number;
  collectionPoints: number;
}

interface StatsStore {
  knownUserIds: string[];
  uploadCounts: Record<string, MemberCounts>;
  seededUploads: number;
  userUploadTotal: number;
  /** Unique visitor fingerprints (localStorage ids from the browser). */
  visitorIds: string[];
  /** Cumulative page views across the web app. */
  totalPageViews: number;
  /** Floors from hydrated client snapshots (Vercel disk is ephemeral). */
  visitorFloor: number;
  pageViewFloor: number;
}

const PRESENCE_TTL_MS = 90_000;
const MAX_TRACKED_VISITOR_IDS = 5_000;
const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "community-stats.json");
const HIDDEN_LEADERBOARD_IDS = new Set([
  "seed_secret_user",
  "seed_keithav",
  "acct_msdqzpqb", // rish2
  "acct_msdr20bs", // rish3
  "acct_msezhjj8_kg2i", // Rish2
]);

type GlobalStats = {
  presence: Map<string, PresenceRecord>;
  store: StatsStore;
  remoteReady?: Promise<void>;
};

function globalBucket(): GlobalStats {
  const g = globalThis as typeof globalThis & { __floralyStats?: GlobalStats };
  if (!g.__floralyStats) {
    g.__floralyStats = {
      presence: new Map(),
      store: loadStoreFromDisk(),
    };
  } else {
    g.__floralyStats.store = normalizeStore(g.__floralyStats.store);
    if (!(g.__floralyStats.presence instanceof Map)) {
      g.__floralyStats.presence = new Map();
    }
  }
  return g.__floralyStats;
}

function isHiddenLeaderboardUser(userId: string, displayName?: string): boolean {
  if (HIDDEN_LEADERBOARD_IDS.has(userId)) return true;
  const name = (displayName ?? "").trim().toLowerCase();
  return (
    name === "secret user" ||
    name === "keithav s" ||
    name === "rish2" ||
    name === "rish3"
  );
}

function mergeMember(
  a?: MemberCounts,
  b?: MemberCounts
): MemberCounts | undefined {
  if (!a) return b;
  if (!b) return a;
  const preferB =
    b.displayName.trim() &&
    b.displayName.trim().toLowerCase() !== "explorer";
  return {
    displayName: preferB ? b.displayName : a.displayName,
    count: Math.max(a.count || 0, b.count || 0),
    collectionPoints: Math.max(a.collectionPoints || 0, b.collectionPoints || 0),
  };
}

function seedMembers(): Record<string, MemberCounts> {
  const counts: Record<string, MemberCounts> = {};
  for (const member of SEEDED_MEMBERS) {
    if (isHiddenLeaderboardUser(member.userId, member.displayName)) continue;
    counts[member.userId] = {
      displayName: member.displayName,
      count: member.count,
      collectionPoints: member.collectionPoints,
    };
  }
  return counts;
}

function recomputeUserUploadTotal(counts: Record<string, MemberCounts>): number {
  return Object.values(counts).reduce((sum, value) => sum + (value.count || 0), 0);
}

function defaultStore(): StatsStore {
  const uploadCounts = seedMembers();
  return {
    knownUserIds: Object.keys(uploadCounts),
    uploadCounts,
    seededUploads: SEED_UPLOAD_COUNT,
    userUploadTotal: recomputeUserUploadTotal(uploadCounts),
    visitorIds: [],
    totalPageViews: 0,
    visitorFloor: 0,
    pageViewFloor: 0,
  };
}

/** Fill missing fields and always merge baked-in members. */
function normalizeStore(raw: Partial<StatsStore> | null | undefined): StatsStore {
  const base = defaultStore();
  if (!raw || typeof raw !== "object") return base;

  const mergedCounts: Record<string, MemberCounts> = { ...base.uploadCounts };
  for (const [id, value] of Object.entries(raw.uploadCounts ?? {})) {
    if (!value || typeof value !== "object") continue;
    if (isHiddenLeaderboardUser(id, value.displayName)) continue;
    const next = mergeMember(mergedCounts[id], {
      displayName: typeof value.displayName === "string" ? value.displayName : "Explorer",
      count: typeof value.count === "number" ? value.count : 0,
      collectionPoints:
        typeof value.collectionPoints === "number" ? value.collectionPoints : 0,
    });
    if (next) mergedCounts[id] = next;
  }

  const known = new Set<string>([
    ...base.knownUserIds,
    ...(Array.isArray(raw.knownUserIds) ? raw.knownUserIds : []).filter(
      (id): id is string => typeof id === "string" && id.length > 0
    ),
  ]);
  for (const id of [...known]) {
    if (isHiddenLeaderboardUser(id, mergedCounts[id]?.displayName)) {
      known.delete(id);
      delete mergedCounts[id];
    }
  }
  for (const id of Object.keys(mergedCounts)) known.add(id);

  return {
    knownUserIds: Array.from(known),
    uploadCounts: mergedCounts,
    seededUploads:
      typeof raw.seededUploads === "number" ? raw.seededUploads : base.seededUploads,
    userUploadTotal: recomputeUserUploadTotal(mergedCounts),
    visitorIds: Array.from(
      new Set(
        (Array.isArray(raw.visitorIds) ? raw.visitorIds : [])
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    ),
    totalPageViews:
      typeof raw.totalPageViews === "number" ? raw.totalPageViews : base.totalPageViews,
    visitorFloor:
      typeof raw.visitorFloor === "number" ? raw.visitorFloor : base.visitorFloor,
    pageViewFloor:
      typeof raw.pageViewFloor === "number" ? raw.pageViewFloor : base.pageViewFloor,
  };
}

function loadStoreFromDisk(): StatsStore {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultStore();
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Partial<StatsStore>;
    return normalizeStore(raw);
  } catch {
    return defaultStore();
  }
}

function persistStore(store: StatsStore): void {
  const json = JSON.stringify(store, null, 2);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, json);
  } catch {
    /* ignore disk errors in demo / serverless mode */
  }
  void saveRemoteStatsJson(JSON.stringify(store));
}

/** Pull durable Redis snapshot into memory once per cold start (if configured). */
export async function ensureStatsReady(): Promise<void> {
  const bucket = globalBucket();
  if (!bucket.remoteReady) {
    bucket.remoteReady = (async () => {
      const remote = await loadRemoteStatsJson();
      if (!remote) return;
      try {
        const parsed = JSON.parse(remote) as Partial<StatsStore>;
        bucket.store = normalizeStore({
          ...bucket.store,
          ...parsed,
          uploadCounts: {
            ...bucket.store.uploadCounts,
            ...(parsed.uploadCounts ?? {}),
          },
          knownUserIds: [
            ...new Set([
              ...bucket.store.knownUserIds,
              ...(Array.isArray(parsed.knownUserIds) ? parsed.knownUserIds : []),
            ]),
          ],
          visitorIds: [
            ...new Set([
              ...bucket.store.visitorIds,
              ...(Array.isArray(parsed.visitorIds) ? parsed.visitorIds : []),
            ]),
          ],
          visitorFloor: Math.max(
            bucket.store.visitorFloor,
            typeof parsed.visitorFloor === "number" ? parsed.visitorFloor : 0
          ),
          pageViewFloor: Math.max(
            bucket.store.pageViewFloor,
            typeof parsed.pageViewFloor === "number" ? parsed.pageViewFloor : 0
          ),
          totalPageViews: Math.max(
            bucket.store.totalPageViews,
            typeof parsed.totalPageViews === "number" ? parsed.totalPageViews : 0
          ),
        });
      } catch {
        /* ignore bad remote payload */
      }
    })();
  }
  await bucket.remoteReady;
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
    .sort(
      (a, b) =>
        b.uploadCount - a.uploadCount ||
        (b.collectionPoints ?? 0) - (a.collectionPoints ?? 0) ||
        a.displayName.localeCompare(b.displayName)
    );
}

function upsertMember(input: {
  userId: string;
  displayName: string;
  count?: number;
  collectionPoints?: number;
}): void {
  const bucket = globalBucket();
  bucket.store = normalizeStore(bucket.store);
  const store = bucket.store;
  if (!store.knownUserIds.includes(input.userId)) {
    store.knownUserIds.push(input.userId);
  }
  const existing = store.uploadCounts[input.userId];
  store.uploadCounts[input.userId] = {
    displayName: input.displayName || existing?.displayName || "Explorer",
    count: Math.max(existing?.count ?? 0, input.count ?? existing?.count ?? 0),
    collectionPoints: Math.max(
      existing?.collectionPoints ?? 0,
      input.collectionPoints ?? existing?.collectionPoints ?? 0
    ),
  };
  store.userUploadTotal = recomputeUserUploadTotal(store.uploadCounts);
}

export function getCommunityStats(): CommunityStatsSnapshot {
  const bucket = globalBucket();
  const store = normalizeStore(bucket.store);
  bucket.store = store;

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
  const recomputed = recomputeUserUploadTotal(store.uploadCounts);
  if (recomputed !== store.userUploadTotal) {
    store.userUploadTotal = recomputed;
    dirty = true;
  }
  if (dirty) persistStore(store);
  prunePresence(bucket.presence);
  return {
    concurrentUsers: bucket.presence.size,
    totalUsers: store.knownUserIds.length,
    totalUploads: store.seededUploads + store.userUploadTotal,
    uniqueVisitors: Math.max(store.visitorIds.length, store.visitorFloor),
    totalPageViews: Math.max(store.totalPageViews, store.pageViewFloor),
    leaderboard: buildLeaderboard(store),
  };
}

export function heartbeatPresence(input: {
  sessionId: string;
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  upsertMember({ userId: input.userId, displayName: input.displayName });
  const bucket = globalBucket();
  bucket.presence.set(input.sessionId, {
    userId: input.userId,
    displayName: input.displayName,
    lastSeen: Date.now(),
  });
  persistStore(bucket.store);
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
  upsertMember(input);
  persistStore(globalBucket().store);
  return getCommunityStats();
}

export function recordUpload(input: {
  userId: string;
  displayName: string;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  bucket.store = normalizeStore(bucket.store);
  const existing = bucket.store.uploadCounts[input.userId];
  upsertMember({
    userId: input.userId,
    displayName: input.displayName,
    count: (existing?.count ?? 0) + 1,
    collectionPoints: existing?.collectionPoints ?? 0,
  });
  persistStore(bucket.store);
  return getCommunityStats();
}

export function syncUserUploads(input: {
  userId: string;
  displayName: string;
  count: number;
}): CommunityStatsSnapshot {
  upsertMember({
    userId: input.userId,
    displayName: input.displayName,
    count: Math.max(0, Math.floor(input.count)),
  });
  persistStore(globalBucket().store);
  return getCommunityStats();
}

export function recordPageVisit(input: {
  visitorId: string;
  /** Client's last-known unique visitor count (restores floors after cold starts). */
  uniqueVisitorsFloor?: number;
  totalPageViewsFloor?: number;
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  bucket.store = normalizeStore(bucket.store);
  const store = bucket.store;

  if (
    typeof input.uniqueVisitorsFloor === "number" &&
    input.uniqueVisitorsFloor > 0
  ) {
    store.visitorFloor = Math.max(
      store.visitorFloor,
      Math.floor(input.uniqueVisitorsFloor)
    );
  }
  if (
    typeof input.totalPageViewsFloor === "number" &&
    input.totalPageViewsFloor > 0
  ) {
    store.pageViewFloor = Math.max(
      store.pageViewFloor,
      Math.floor(input.totalPageViewsFloor)
    );
  }

  const visitorId = input.visitorId.trim();
  if (visitorId) {
    const isNew = !store.visitorIds.includes(visitorId);
    if (isNew) {
      store.visitorIds.push(visitorId);
      if (store.visitorIds.length > MAX_TRACKED_VISITOR_IDS) {
        store.visitorIds = store.visitorIds.slice(-MAX_TRACKED_VISITOR_IDS);
      }
      // Floor only grows — survives ID list truncation and cold starts.
      store.visitorFloor = Math.max(store.visitorFloor + 1, store.visitorIds.length);
    }
    store.totalPageViews += 1;
    store.pageViewFloor = Math.max(store.pageViewFloor, store.totalPageViews);
    persistStore(store);
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
  upsertMember({
    userId: input.userId,
    displayName: input.displayName,
    collectionPoints: Math.max(0, Math.floor(input.points)),
  });
  persistStore(globalBucket().store);
  return getCommunityStats();
}

export function hydrateFromSnapshot(input: {
  uniqueVisitors?: number;
  totalPageViews?: number;
  leaderboard?: LeaderboardEntry[];
}): CommunityStatsSnapshot {
  const bucket = globalBucket();
  bucket.store = normalizeStore(bucket.store);

  for (const row of input.leaderboard ?? []) {
    if (!row?.userId) continue;
    if (isHiddenLeaderboardUser(row.userId, row.displayName)) continue;
    upsertMember({
      userId: row.userId,
      displayName: row.displayName || "Explorer",
      count: Math.max(0, Math.floor(row.uploadCount ?? 0)),
      collectionPoints: Math.max(0, Math.floor(row.collectionPoints ?? 0)),
    });
  }

  if (typeof input.uniqueVisitors === "number" && input.uniqueVisitors > 0) {
    bucket.store.visitorFloor = Math.max(
      bucket.store.visitorFloor,
      Math.floor(input.uniqueVisitors)
    );
  }
  if (typeof input.totalPageViews === "number" && input.totalPageViews > 0) {
    bucket.store.pageViewFloor = Math.max(
      bucket.store.pageViewFloor,
      Math.floor(input.totalPageViews)
    );
  }

  persistStore(bucket.store);
  return getCommunityStats();
}
