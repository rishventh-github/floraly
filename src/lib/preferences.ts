import { STORAGE_KEYS } from "./constants";
import { readAccountJson, writeAccountJson } from "./accountStorage";
import type { NaturePost, NatureTag, Region, SessionState, UserPreferences } from "./types";

function generateUserId(): string {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable empty prefs for SSR / first paint - never call Math.random or localStorage here. */
export const EMPTY_PREFERENCES: UserPreferences = {
  userId: "anonymous",
  selectedTags: [],
  tagWeights: {},
  regionWeights: {},
  likedPostIds: [],
  onboardingComplete: false,
};

export function getDefaultPreferences(accountId?: string): UserPreferences {
  return {
    ...EMPTY_PREFERENCES,
    userId: accountId ?? generateUserId(),
  };
}

export function loadPreferences(accountId: string): UserPreferences {
  if (typeof window === "undefined") return { ...EMPTY_PREFERENCES };
  try {
    const parsed = readAccountJson<Partial<UserPreferences> | null>(
      STORAGE_KEYS.preferences,
      accountId,
      null,
      true
    );
    if (!parsed) return getDefaultPreferences(accountId);
    return {
      ...EMPTY_PREFERENCES,
      ...parsed,
      userId: accountId,
    };
  } catch {
    return getDefaultPreferences(accountId);
  }
}

export function savePreferences(prefs: UserPreferences, accountId: string): void {
  if (typeof window === "undefined") return;
  writeAccountJson(STORAGE_KEYS.preferences, accountId, {
    ...prefs,
    userId: accountId,
  });
}

/** Shared community posts from all accounts (visible in the feed). */
export function loadUserPosts(): NaturePost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.posts);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUserPost(post: NaturePost): void {
  if (typeof window === "undefined") return;
  const existing = loadUserPosts();
  localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify([post, ...existing]));
}

export function saveAllUserPosts(posts: NaturePost[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
}

export function updateUserPost(updated: NaturePost): NaturePost | null {
  const posts = loadUserPosts();
  const index = posts.findIndex((p) => p.id === updated.id);
  if (index === -1) return null;
  posts[index] = updated;
  saveAllUserPosts(posts);
  return updated;
}

export function deleteUserPost(postId: string): boolean {
  const posts = loadUserPosts();
  const filtered = posts.filter((p) => p.id !== postId);
  if (filtered.length === posts.length) return false;
  saveAllUserPosts(filtered);
  return true;
}

export function isUserOwnedPost(postId: string): boolean {
  return postId.startsWith("user_");
}

export function loadSession(): SessionState {
  if (typeof window === "undefined") {
    return { viewedTags: [], transitionCounts: {} };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return { viewedTags: [], transitionCounts: {} };
    return JSON.parse(raw);
  } catch {
    return { viewedTags: [], transitionCounts: {} };
  }
}

export function saveSession(session: SessionState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function recordView(tag: NatureTag): void {
  const session = loadSession();
  const prev = session.viewedTags[session.viewedTags.length - 1];
  if (prev) {
    const key = `${prev}->${tag}`;
    session.transitionCounts[key] = (session.transitionCounts[key] ?? 0) + 1;
  }
  session.viewedTags.push(tag);
  saveSession(session);
}

export function getFeedShuffleSeed(): number {
  if (typeof window === "undefined") return 1;
  try {
    const existing = sessionStorage.getItem(STORAGE_KEYS.feedShuffleSeed);
    if (existing) return Number(existing) || 1;
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 || 1;
    sessionStorage.setItem(STORAGE_KEYS.feedShuffleSeed, String(seed));
    return seed;
  } catch {
    return 1;
  }
}

export function saveLastFeedPostId(postId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.feedLastPost, postId);
  } catch {
    /* ignore */
  }
}

export function loadLastFeedPostId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEYS.feedLastPost);
  } catch {
    return null;
  }
}

export function toggleLikePost(
  prefs: UserPreferences,
  post: NaturePost
): UserPreferences {
  const alreadyLiked = prefs.likedPostIds.includes(post.id);

  if (alreadyLiked) {
    return {
      ...prefs,
      likedPostIds: prefs.likedPostIds.filter((id) => id !== post.id),
    };
  }

  const likedPostIds = [...prefs.likedPostIds, post.id];
  const tagWeights = { ...prefs.tagWeights };
  for (const tag of post.tags) {
    tagWeights[tag] = (tagWeights[tag] ?? 0) + 1;
  }

  const regionWeights = { ...prefs.regionWeights };
  if (post.region) {
    regionWeights[post.region] = (regionWeights[post.region] ?? 0) + 1;
  }

  return { ...prefs, likedPostIds, tagWeights, regionWeights };
}

export function completeOnboarding(
  accountId: string,
  tags: NatureTag[],
  region?: Region
): UserPreferences {
  const prefs = loadPreferences(accountId);
  const tagWeights: Partial<Record<NatureTag, number>> = {};
  for (const tag of tags) {
    tagWeights[tag] = 3;
  }
  const regionWeights: Partial<Record<Region, number>> = {};
  if (region) {
    regionWeights[region] = 3;
  }
  const updated: UserPreferences = {
    ...prefs,
    userId: accountId,
    selectedTags: tags,
    region,
    tagWeights: { ...prefs.tagWeights, ...tagWeights },
    regionWeights: { ...prefs.regionWeights, ...regionWeights },
    onboardingComplete: true,
  };
  savePreferences(updated, accountId);
  return updated;
}
