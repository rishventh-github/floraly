import type { NaturePost, NatureTag, SessionState, UserPreferences } from "./types";
import { countMatchingTags, postMatchesTags } from "./sceneClassifier";

function getActiveCurateTags(prefs: UserPreferences): NatureTag[] | null {
  const overrides = prefs.sessionOverrides;
  if (!overrides || overrides.expiresAt <= Date.now()) return null;
  if (overrides.tags.length === 0) return null;
  return overrides.tags;
}

function matchesUserInterests(post: NaturePost, prefs: UserPreferences): boolean {
  if (prefs.selectedTags.length === 0) return true;
  return post.tags.some((tag) => prefs.selectedTags.includes(tag));
}

function tagScore(post: NaturePost, prefs: UserPreferences): number {
  if (post.tags.length === 0) return 0;
  const weights = getEffectiveTagWeights(prefs);
  const total = post.tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
  return total / post.tags.length;
}

function getEffectiveTagWeights(
  prefs: UserPreferences
): Partial<Record<NatureTag, number>> {
  const weights = { ...prefs.tagWeights };
  for (const tag of prefs.selectedTags) {
    weights[tag] = (weights[tag] ?? 0) + 5;
  }
  const overrides = prefs.sessionOverrides;
  if (overrides && overrides.expiresAt > Date.now()) {
    for (const tag of overrides.tags) {
      weights[tag] = (weights[tag] ?? 0) + 10;
    }
  }
  return weights;
}

function regionScore(post: NaturePost, prefs: UserPreferences): number {
  if (!prefs.region) return 0.3;
  if (!post.region) return 0.2;
  if (post.region === prefs.region) return 1;
  return (prefs.regionWeights[post.region] ?? 0) * 0.15;
}

function markovBoost(post: NaturePost, session: SessionState): number {
  const lastTag = session.viewedTags[session.viewedTags.length - 1];
  if (!lastTag) return 0;
  let best = 0;
  for (const tag of post.tags) {
    const key = `${lastTag}->${tag}`;
    const count = session.transitionCounts[key] ?? 0;
    if (count > best) best = count;
  }
  return Math.min(best * 0.2, 1);
}

function scorePost(
  post: NaturePost,
  prefs: UserPreferences,
  session: SessionState,
  curateTags: NatureTag[] | null
): number {
  const matchCount = curateTags ? countMatchingTags(post.tags, curateTags) : 0;
  const curateBoost = curateTags ? matchCount * 2 : 0;
  const interestBoost = matchesUserInterests(post, prefs) ? 1.5 : 0;

  return (
    curateBoost +
    interestBoost +
    0.45 * tagScore(post, prefs) +
    0.25 * regionScore(post, prefs) +
    0.2 * post.rank +
    0.1 * markovBoost(post, session)
  );
}

function rankCuratedFeed(
  posts: NaturePost[],
  curateTags: NatureTag[],
  prefs: UserPreferences,
  session: SessionState
): NaturePost[] {
  const matching = posts.filter((post) => postMatchesTags(post.tags, curateTags));

  return matching
    .map((post) => ({
      post,
      score: scorePost(post, prefs, session, curateTags),
      matches: countMatchingTags(post.tags, curateTags),
    }))
    .sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      return b.score - a.score;
    })
    .map((item) => item.post);
}

/**
 * Tailor the feed to onboarding interests:
 * - ~80% posts that match selected nature tags
 * - ~20% light exploration outside those tags
 * Never dump the full catalog after ranking.
 */
export function rankFeed(
  posts: NaturePost[],
  prefs: UserPreferences,
  session: SessionState
): NaturePost[] {
  const curateTags = getActiveCurateTags(prefs);

  if (curateTags) {
    // Strict mode: only posts in the requested categories — never mix others in.
    return rankCuratedFeed(posts, curateTags, prefs, session);
  }

  const hasInterests = prefs.selectedTags.length > 0;

  if (!hasInterests) {
    return [...posts].sort(
      (a, b) =>
        scorePost(b, prefs, session, null) - scorePost(a, prefs, session, null)
    );
  }

  const matching = posts.filter((p) => matchesUserInterests(p, prefs));
  const other = posts.filter((p) => !matchesUserInterests(p, prefs));

  matching.sort(
    (a, b) =>
      scorePost(b, prefs, session, null) - scorePost(a, prefs, session, null)
  );
  other.sort(
    (a, b) =>
      scorePost(b, prefs, session, null) - scorePost(a, prefs, session, null)
  );

  // If nothing matches interests, fall back to ranked full list (better than empty)
  if (matching.length === 0) {
    return [...posts].sort(
      (a, b) =>
        scorePost(b, prefs, session, null) - scorePost(a, prefs, session, null)
    );
  }

  const result: NaturePost[] = [];
  let mi = 0;
  let oi = 0;

  while (mi < matching.length || oi < other.length) {
    // 4 interest posts, then 1 exploration
    for (let i = 0; i < 4 && mi < matching.length; i++) {
      result.push(matching[mi++]);
    }
    if (oi < other.length) {
      result.push(other[oi++]);
    }
    if (mi >= matching.length) {
      // Only a little exploration after interests are exhausted - not the whole catalog
      const exploreBudget = Math.min(2, other.length - oi);
      for (let i = 0; i < exploreBudget; i++) {
        result.push(other[oi++]);
      }
      break;
    }
  }

  return result;
}

/** Deterministic shuffle so order is stable within a browser session. */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function rankAndShuffleFeed(
  posts: NaturePost[],
  prefs: UserPreferences,
  session: SessionState,
  shuffleSeed: number
): NaturePost[] {
  return shuffleWithSeed(rankFeed(posts, prefs, session), shuffleSeed);
}
