import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";
import { loadAccounts } from "./auth";
import { getCollectionPoints } from "./collection";
import { loadUserPosts } from "./preferences";
import type { NatureGroup, NaturePost, PostVisibility, PublicAccount } from "./types";

function followingKey(userId: string): string {
  return `${STORAGE_KEYS.following}_${userId}`;
}

export async function loadFollowing(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(followingKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export async function saveFollowing(userId: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(
    followingKey(userId),
    JSON.stringify([...new Set(ids)])
  );
}

export async function isFollowing(
  userId: string,
  targetId: string
): Promise<boolean> {
  return (await loadFollowing(userId)).includes(targetId);
}

export async function followUser(
  userId: string,
  targetId: string
): Promise<string[]> {
  if (userId === targetId) return loadFollowing(userId);
  const next = [...new Set([...(await loadFollowing(userId)), targetId])];
  await saveFollowing(userId, next);
  return next;
}

export async function unfollowUser(
  userId: string,
  targetId: string
): Promise<string[]> {
  const next = (await loadFollowing(userId)).filter((id) => id !== targetId);
  await saveFollowing(userId, next);
  return next;
}

export async function loadGroups(): Promise<NatureGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.groups);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NatureGroup[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveGroups(groups: NatureGroup[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
}

export async function createGroup(input: {
  name: string;
  ownerId: string;
  memberIds?: string[];
}): Promise<NatureGroup> {
  const name = input.name.trim().slice(0, 40) || "Nature circle";
  const memberIds = await filterToFollowedMembers(input.ownerId, [
    input.ownerId,
    ...(input.memberIds ?? []),
  ]);
  const group: NatureGroup = {
    id: `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    ownerId: input.ownerId,
    memberIds,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  const existing = await loadGroups();
  await saveGroups([group, ...existing]);
  return group;
}

export async function updateGroupMembers(
  groupId: string,
  memberIds: string[]
): Promise<NatureGroup | null> {
  const groups = await loadGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return null;
  const ownerId = groups[idx].ownerId;
  const nextMembers = await filterToFollowedMembers(ownerId, memberIds);
  const updated: NatureGroup = { ...groups[idx], memberIds: nextMembers };
  groups[idx] = updated;
  await saveGroups(groups);
  return updated;
}

export async function deleteGroup(
  groupId: string,
  requesterId: string
): Promise<boolean> {
  const groups = await loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group || group.ownerId !== requesterId) return false;
  await saveGroups(groups.filter((g) => g.id !== groupId));
  return true;
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<boolean> {
  const groups = await loadGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return false;
  const group = groups[idx];
  if (group.ownerId === userId) {
    await saveGroups(groups.filter((g) => g.id !== groupId));
    return true;
  }
  groups[idx] = {
    ...group,
    memberIds: group.memberIds.filter((id) => id !== userId),
  };
  await saveGroups(groups);
  return true;
}

/** Seeded nature-feed author (mock posts). */
export const SEED_KEITHAV_ID = "seed_keithav";

const SEEDED_PUBLIC: PublicAccount[] = [
  { id: SEED_KEITHAV_ID, displayName: "Keithav S." },
  { id: "acct_msjkkqpj", displayName: "rishventh ramoshan" },
  { id: "acct_ms4ag7xh", displayName: "rish1" },
];

export async function resolvePublicAccount(
  userId: string
): Promise<PublicAccount> {
  const acct = (await loadAccounts()).find((a) => a.id === userId);
  if (acct) {
    return {
      id: acct.id,
      displayName: acct.displayName,
      email: acct.email,
    };
  }
  const seeded = SEEDED_PUBLIC.find((s) => s.id === userId);
  if (seeded) return seeded;
  const post = (await loadUserPosts()).find(
    (p) => ensurePostAuthorId(p).authorId === userId
  );
  if (post) {
    return { id: userId, displayName: post.author };
  }
  return {
    id: userId,
    displayName: await resolveDisplayName(userId),
  };
}

export async function listKnownPeople(
  excludeUserId?: string
): Promise<PublicAccount[]> {
  const byId = new Map<string, PublicAccount>();

  for (const acct of await loadAccounts()) {
    byId.set(acct.id, {
      id: acct.id,
      displayName: acct.displayName,
      email: acct.email,
    });
  }

  for (const post of await loadUserPosts()) {
    const withId = ensurePostAuthorId(post);
    if (!withId.authorId) continue;
    if (!byId.has(withId.authorId)) {
      byId.set(withId.authorId, {
        id: withId.authorId,
        displayName: withId.author,
      });
    }
  }

  for (const seeded of SEEDED_PUBLIC) {
    if (!byId.has(seeded.id)) byId.set(seeded.id, seeded);
  }

  const people = [...byId.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
  if (!excludeUserId) return people;
  return people.filter((p) => p.id !== excludeUserId);
}

/** People you follow (for group membership). */
export async function listFollowedPeople(
  userId: string
): Promise<PublicAccount[]> {
  const ids = (await loadFollowing(userId)).filter((id) => id !== userId);
  const people = await Promise.all(ids.map((id) => resolvePublicAccount(id)));
  return people.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Mutual follows — you follow them and they follow you. */
export async function listMutualPeople(
  userId: string
): Promise<PublicAccount[]> {
  const following = await loadFollowing(userId);
  const mutualIds: string[] = [];
  for (const id of following) {
    if (id === userId) continue;
    if ((await loadFollowing(id)).includes(userId)) mutualIds.push(id);
  }
  const people = await Promise.all(
    mutualIds.map((id) => resolvePublicAccount(id))
  );
  return people.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function filterToFollowedMembers(
  ownerId: string,
  memberIds: string[]
): Promise<string[]> {
  const following = new Set(await loadFollowing(ownerId));
  return [
    ...new Set(
      memberIds.filter((id) => id === ownerId || following.has(id))
    ),
  ];
}

export function resolveVisibility(post: NaturePost): PostVisibility {
  return post.visibility === "circle" ? "circle" : "public";
}

/** True when the reel was shared privately (groups / circle), not to everyone. */
export function isPrivateReel(post: NaturePost): boolean {
  if ((post.visibleToGroupIds?.length ?? 0) > 0) return true;
  return resolveVisibility(post) === "circle";
}

/** Display names for groups this reel was sent to (empty if none selected). */
export async function groupNamesForPost(post: NaturePost): Promise<string[]> {
  const ids = post.visibleToGroupIds?.filter(Boolean) ?? [];
  if (ids.length === 0) return [];
  const groups = await loadGroups();
  return ids
    .map((id) => groups.find((g) => g.id === id)?.name)
    .filter((name): name is string => !!name);
}

/** Short badge label for the feed (e.g. "Group · Trail crew"). */
export async function privateReelBadgeLabel(post: NaturePost): Promise<string> {
  const names = await groupNamesForPost(post);
  if (names.length === 1) return `Group · ${names[0]}`;
  if (names.length > 1) return `Groups · ${names.length}`;
  return "Private";
}

export function ensurePostAuthorId(post: NaturePost): NaturePost {
  if (post.authorId) return post;
  if (post.author === "Keithav S.") {
    return { ...post, authorId: SEED_KEITHAV_ID };
  }
  return post;
}

export interface UserProfileStats {
  userId: string;
  displayName: string;
  email?: string;
  initials: string;
  reelCount: number;
  likesReceived: number;
  followers: number;
  following: number;
  collectionPoints: number;
  groupCount: number;
  isSeedProfile: boolean;
}

export async function countFollowers(targetId: string): Promise<number> {
  let n = 0;
  for (const acct of await loadAccounts()) {
    if (acct.id === targetId) continue;
    if ((await loadFollowing(acct.id)).includes(targetId)) n += 1;
  }
  return n;
}

export async function resolveDisplayName(
  userId: string,
  fallback = "Nature friend"
): Promise<string> {
  if (userId === SEED_KEITHAV_ID) return "Keithav S.";
  const acct = (await loadAccounts()).find((a) => a.id === userId);
  if (acct) return acct.displayName;
  const post = (await loadUserPosts()).find(
    (p) => ensurePostAuthorId(p).authorId === userId
  );
  if (post) return post.author;
  const seeded = SEEDED_PUBLIC.find((s) => s.id === userId);
  return seeded?.displayName ?? fallback;
}

export async function buildUserProfileStats(
  userId: string,
  allPosts: NaturePost[],
  opts?: { collectionPoints?: number }
): Promise<UserProfileStats | null> {
  if (!userId) return null;
  const displayName = await resolveDisplayName(userId);
  const acct = (await loadAccounts()).find((a) => a.id === userId);
  const authored = allPosts.filter(
    (p) => ensurePostAuthorId(p).authorId === userId
  );
  const likesReceived = authored.reduce((sum, p) => sum + (p.likes ?? 0), 0);
  const following = (await loadFollowing(userId)).length;
  const followers = await countFollowers(userId);
  const groupCount = (await loadGroups()).filter((g) =>
    g.memberIds.includes(userId)
  ).length;

  const collectionPoints = Math.max(
    opts?.collectionPoints ?? 0,
    await getCollectionPoints(userId)
  );

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return {
    userId,
    displayName,
    email: acct?.email,
    initials,
    reelCount: authored.length,
    likesReceived,
    followers,
    following,
    collectionPoints,
    groupCount,
    isSeedProfile: userId === SEED_KEITHAV_ID,
  };
}

export function canViewerSeePost(
  post: NaturePost,
  viewerId: string | null | undefined,
  opts: {
    authorFollowing: string[];
    groups: NatureGroup[];
  }
): boolean {
  const visibility = resolveVisibility(post);
  if (visibility === "public") return true;
  if (!post.authorId) return false;
  if (!viewerId) return false;
  if (post.authorId === viewerId) return true;

  const selected = post.visibleToGroupIds?.filter(Boolean) ?? [];
  if (selected.length > 0) {
    return opts.groups.some(
      (g) =>
        selected.includes(g.id) &&
        g.memberIds.includes(post.authorId!) &&
        g.memberIds.includes(viewerId)
    );
  }

  if (opts.authorFollowing.includes(viewerId)) return true;
  return opts.groups.some(
    (g) =>
      g.memberIds.includes(post.authorId!) && g.memberIds.includes(viewerId)
  );
}

export async function filterPostsForViewer(
  posts: NaturePost[],
  viewerId: string | null | undefined
): Promise<NaturePost[]> {
  if (!viewerId) {
    return posts.filter((p) => resolveVisibility(p) === "public");
  }
  const groups = await loadGroups();
  const followingCache = new Map<string, string[]>();
  const out: NaturePost[] = [];
  for (const post of posts) {
    if (resolveVisibility(post) === "public") {
      out.push(post);
      continue;
    }
    if (!post.authorId) continue;
    if (post.authorId === viewerId) {
      out.push(post);
      continue;
    }
    let following = followingCache.get(post.authorId);
    if (!following) {
      following = await loadFollowing(post.authorId);
      followingCache.set(post.authorId, following);
    }
    if (
      canViewerSeePost(post, viewerId, {
        authorFollowing: following,
        groups,
      })
    ) {
      out.push(post);
    }
  }
  return out;
}
