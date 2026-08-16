import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";
import { readAccountJson, writeAccountJson } from "./accountStorage";
import type {
  NaturePost,
  NatureTag,
  Region,
  SessionState,
  UserPreferences,
} from "./types";

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
    userId: accountId ?? `anon_${Date.now()}`,
  };
}

export async function loadPreferences(
  accountId: string
): Promise<UserPreferences> {
  try {
    const parsed = await readAccountJson<Partial<UserPreferences> | null>(
      STORAGE_KEYS.preferences,
      accountId,
      null,
      true
    );
    if (!parsed) return getDefaultPreferences(accountId);
    return { ...EMPTY_PREFERENCES, ...parsed, userId: accountId };
  } catch {
    return getDefaultPreferences(accountId);
  }
}

export async function savePreferences(
  prefs: UserPreferences,
  accountId: string
): Promise<void> {
  await writeAccountJson(STORAGE_KEYS.preferences, accountId, {
    ...prefs,
    userId: accountId,
  });
}

export async function loadUserPosts(): Promise<NaturePost[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.posts);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveUserPost(post: NaturePost): Promise<void> {
  const existing = await loadUserPosts();
  const next = [post, ...existing];
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(next));
  } catch {
    let trimmed = next;
    while (trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(trimmed));
        return;
      } catch {
        /* keep trimming */
      }
    }
    throw new Error(
      "This device is out of space for photos. Remove some older reels, then try again."
    );
  }
}

export async function saveAllUserPosts(posts: NaturePost[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
  } catch {
    let trimmed = posts;
    while (trimmed.length > 0) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(trimmed));
        return;
      } catch {
        trimmed = trimmed.slice(0, -1);
      }
    }
    throw new Error(
      "This device is out of space for photos. Remove some older reels, then try again."
    );
  }
}

export async function updateUserPost(
  updated: NaturePost
): Promise<NaturePost | null> {
  const posts = await loadUserPosts();
  const index = posts.findIndex((p) => p.id === updated.id);
  if (index === -1) return null;
  posts[index] = updated;
  await saveAllUserPosts(posts);
  return updated;
}

export async function deleteUserPost(postId: string): Promise<boolean> {
  const posts = await loadUserPosts();
  const filtered = posts.filter((p) => p.id !== postId);
  if (filtered.length === posts.length) return false;
  await saveAllUserPosts(filtered);
  return true;
}

export async function loadFeedSession(): Promise<SessionState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return { viewedTags: [], transitionCounts: {} };
    return JSON.parse(raw);
  } catch {
    return { viewedTags: [], transitionCounts: {} };
  }
}

export async function saveFeedSession(session: SessionState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export async function recordView(tag: NatureTag): Promise<void> {
  const session = await loadFeedSession();
  const prev = session.viewedTags[session.viewedTags.length - 1];
  if (prev) {
    const key = `${prev}->${tag}`;
    session.transitionCounts[key] = (session.transitionCounts[key] ?? 0) + 1;
  }
  session.viewedTags.push(tag);
  await saveFeedSession(session);
}

export async function getFeedShuffleSeed(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.feedShuffleSeed);
    if (existing) return Number(existing) || 1;
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 || 1;
    await AsyncStorage.setItem(STORAGE_KEYS.feedShuffleSeed, String(seed));
    return seed;
  } catch {
    return 1;
  }
}

export async function saveLastFeedPostId(postId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.feedLastPost, postId);
  } catch {
    /* ignore */
  }
}

export async function loadLastFeedPostId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.feedLastPost);
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

export async function completeOnboarding(
  accountId: string,
  tags: NatureTag[],
  region?: Region
): Promise<UserPreferences> {
  const prefs = await loadPreferences(accountId);
  const tagWeights: Partial<Record<NatureTag, number>> = {};
  for (const tag of tags) tagWeights[tag] = 3;
  const regionWeights: Partial<Record<Region, number>> = {};
  if (region) regionWeights[region] = 3;
  const updated: UserPreferences = {
    ...prefs,
    userId: accountId,
    selectedTags: tags,
    region,
    tagWeights: { ...prefs.tagWeights, ...tagWeights },
    regionWeights: { ...prefs.regionWeights, ...regionWeights },
    onboardingComplete: true,
  };
  await savePreferences(updated, accountId);
  return updated;
}
