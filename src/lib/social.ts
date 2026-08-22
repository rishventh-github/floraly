import { STORAGE_KEYS } from "./constants";
import { loadAccounts } from "./auth";
import { getCollectionPoints } from "./collection";
import { loadUserPosts } from "./preferences";
import type { NatureGroup, NaturePost, PostVisibility, PublicAccount } from "./types";

function followingKey(userId: string): string {
  return `${STORAGE_KEYS.following}_${userId}`;
}

export function loadFollowing(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(followingKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function saveFollowing(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(followingKey(userId), JSON.stringify([...new Set(ids)]));
}

export function isFollowing(userId: string, targetId: string): boolean {
  return loadFollowing(userId).includes(targetId);
}

export function followUser(userId: string, targetId: string): string[] {
  if (userId === targetId) return loadFollowing(userId);
  const next = [...new Set([...loadFollowing(userId), targetId])];
  saveFollowing(userId, next);
  return next;
}

export function unfollowUser(userId: string, targetId: string): string[] {
  const next = loadFollowing(userId).filter((id) => id !== targetId);
  saveFollowing(userId, next);
  return next;
}

export function loadGroups(): NatureGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.groups);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NatureGroup[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveGroups(groups: NatureGroup[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
}

export function groupsForUser(userId: string): NatureGroup[] {
  return loadGroups().filter((g) => g.memberIds.includes(userId));
}

export function createGroup(input: {
  name: string;
  ownerId: string;
  memberIds?: string[];
}): NatureGroup {
  const name = input.name.trim().slice(0, 40) || "Nature circle";
  const memberIds = filterToFollowedMembers(
    input.ownerId,
    [input.ownerId, ...(input.memberIds ?? [])]
  );
  const group: NatureGroup = {
    id: `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    ownerId: input.ownerId,
    memberIds,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  saveGroups([group, ...loadGroups()]);
  return group;
}

export function updateGroupMembers(
  groupId: string,
  memberIds: string[]
): NatureGroup | null {
  const groups = loadGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return null;
  const ownerId = groups[idx].ownerId;
  const nextMembers = filterToFollowedMembers(ownerId, memberIds);
  const updated: NatureGroup = { ...groups[idx], memberIds: nextMembers };
  groups[idx] = updated;
  saveGroups(groups);
  return updated;
}

export function renameGroup(groupId: string, name: string): NatureGroup | null {
  const groups = loadGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return null;
  const updated: NatureGroup = {
    ...groups[idx],
    name: name.trim().slice(0, 40) || groups[idx].name,
  };
  groups[idx] = updated;
  saveGroups(groups);
  return updated;
}

export function deleteGroup(groupId: string, requesterId: string): boolean {
  const groups = loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group || group.ownerId !== requesterId) return false;
  saveGroups(groups.filter((g) => g.id !== groupId));
  return true;
}

export function leaveGroup(groupId: string, userId: string): boolean {
  const groups = loadGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx < 0) return false;
  const group = groups[idx];
  if (group.ownerId === userId) {
    // Owner leaving deletes the group.
    saveGroups(groups.filter((g) => g.id !== groupId));
    return true;
  }
  groups[idx] = {
    ...group,
    memberIds: group.memberIds.filter((id) => id !== userId),
  };
  saveGroups(groups);
  return true;
}

export function shareAGroup(userA: string, userB: string): boolean {
  return loadGroups().some(
    (g) => g.memberIds.includes(userA) && g.memberIds.includes(userB)
  );
}

/** Seeded nature-feed author (mock posts). */
export const SEED_KEITHAV_ID = "seed_keithav";

const SEEDED_PUBLIC: PublicAccount[] = [
  { id: SEED_KEITHAV_ID, displayName: "Keithav S." },
  { id: "acct_msjkkqpj", displayName: "rishventh ramoshan" },
  { id: "acct_ms4ag7xh", displayName: "rish1" },
];

export function resolvePublicAccount(userId: string): PublicAccount {
  const acct = loadAccounts().find((a) => a.id === userId);
  if (acct) {
    return {
      id: acct.id,
      displayName: acct.displayName,
      email: acct.email,
    };
  }
  const seeded = SEEDED_PUBLIC.find((s) => s.id === userId);
  if (seeded) return seeded;
  const post = loadUserPosts().find(
    (p) => p.authorId === userId || ensurePostAuthorId(p).authorId === userId
  );
  if (post) {
    return { id: userId, displayName: post.author };
  }
  return { id: userId, displayName: resolveDisplayName(userId) };
}

/** Directory of people this device knows (accounts + reel authors). */
export function listKnownPeople(excludeUserId?: string): PublicAccount[] {
  const byId = new Map<string, PublicAccount>();

  for (const acct of loadAccounts()) {
    byId.set(acct.id, {
      id: acct.id,
      displayName: acct.displayName,
      email: acct.email,
    });
  }

  for (const post of loadUserPosts()) {
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
export function listFollowedPeople(userId: string): PublicAccount[] {
  return loadFollowing(userId)
    .filter((id) => id !== userId)
    .map(resolvePublicAccount)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Mutual follows — you follow them and they follow you. */
export function listMutualPeople(userId: string): PublicAccount[] {
  return loadFollowing(userId)
    .filter((id) => id !== userId && loadFollowing(id).includes(userId))
    .map(resolvePublicAccount)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function filterToFollowedMembers(
  ownerId: string,
  memberIds: string[]
): string[] {
  const following = new Set(loadFollowing(ownerId));
  return [...new Set(memberIds.filter((id) => id === ownerId || following.has(id)))];
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
export function groupNamesForPost(post: NaturePost): string[] {
  const ids = post.visibleToGroupIds?.filter(Boolean) ?? [];
  if (ids.length === 0) return [];
  const groups = loadGroups();
  return ids
    .map((id) => groups.find((g) => g.id === id)?.name)
    .filter((name): name is string => !!name);
}

/** Short badge label for the feed (e.g. "Group · Trail crew"). */
export function privateReelBadgeLabel(post: NaturePost): string {
  const names = groupNamesForPost(post);
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

export function countFollowers(targetId: string): number {
  if (typeof window === "undefined") return 0;
  let n = 0;
  for (const acct of loadAccounts()) {
    if (acct.id === targetId) continue;
    if (loadFollowing(acct.id).includes(targetId)) n += 1;
  }
  return n;
}

export function resolveDisplayName(
  userId: string,
  fallback = "Nature friend"
): string {
  if (userId === SEED_KEITHAV_ID) return "Keithav S.";
  const acct = loadAccounts().find((a) => a.id === userId);
  if (acct) return acct.displayName;
  const post = loadUserPosts().find(
    (p) => ensurePostAuthorId(p).authorId === userId
  );
  if (post) return post.author;
  const seeded = SEEDED_PUBLIC.find((s) => s.id === userId);
  return seeded?.displayName ?? fallback;
}

export function buildUserProfileStats(
  userId: string,
  allPosts: NaturePost[],
  opts?: { collectionPoints?: number }
): UserProfileStats | null {
  if (!userId) return null;
  const displayName = resolveDisplayName(userId);
  const acct = loadAccounts().find((a) => a.id === userId);
  const authored = allPosts.filter(
    (p) => ensurePostAuthorId(p).authorId === userId
  );
  const likesReceived = authored.reduce((sum, p) => sum + (p.likes ?? 0), 0);
  const following = loadFollowing(userId).length;
  const followers = countFollowers(userId);
  const groupCount = loadGroups().filter((g) =>
    g.memberIds.includes(userId)
  ).length;

  let collectionPoints = opts?.collectionPoints ?? 0;
  collectionPoints = Math.max(collectionPoints, getCollectionPoints(userId));

  const initials = displayName
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

/**
 * Circle posts are visible to the author, people the author follows,
 * and anyone who shares a group with the author — unless visibleToGroupIds
 * is set, in which case only members of those selected groups can see it.
 */
export function canViewerSeePost(
  post: NaturePost,
  viewerId: string | null | undefined,
  opts?: {
    authorFollowing?: string[];
    groups?: NatureGroup[];
  }
): boolean {
  const visibility = resolveVisibility(post);
  if (visibility === "public") return true;

  // Circle post with no author id can't be targeted — hide from feed.
  if (!post.authorId) return false;
  if (!viewerId) return false;
  if (post.authorId === viewerId) return true;

  const groups = opts?.groups ?? loadGroups();
  const selected = post.visibleToGroupIds?.filter(Boolean) ?? [];
  if (selected.length > 0) {
    return groups.some(
      (g) =>
        selected.includes(g.id) &&
        g.memberIds.includes(post.authorId!) &&
        g.memberIds.includes(viewerId)
    );
  }

  const following = opts?.authorFollowing ?? loadFollowing(post.authorId);
  if (following.includes(viewerId)) return true;

  return groups.some(
    (g) =>
      g.memberIds.includes(post.authorId!) && g.memberIds.includes(viewerId)
  );
}

export function filterPostsForViewer(
  posts: NaturePost[],
  viewerId: string | null | undefined
): NaturePost[] {
  if (!viewerId) {
    return posts.filter((p) => resolveVisibility(p) === "public");
  }
  const groups = loadGroups();
  const followingCache = new Map<string, string[]>();
  return posts.filter((post) => {
    if (resolveVisibility(post) === "public") return true;
    if (!post.authorId) return false;
    if (post.authorId === viewerId) return true;
    let following = followingCache.get(post.authorId);
    if (!following) {
      following = loadFollowing(post.authorId);
      followingCache.set(post.authorId, following);
    }
    return canViewerSeePost(post, viewerId, {
      authorFollowing: following,
      groups,
    });
  });
}
