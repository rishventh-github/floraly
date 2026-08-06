import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { loadSettings } from "../lib/auth";
import { MOCK_POSTS } from "../lib/mockPosts";
import { rankAndShuffleFeed } from "../lib/feedAlgorithm";
import { API_BASE_URL, NATURE_TAGS } from "../lib/constants";
import {
  extractTagsFromText,
  getTagLabels,
  normalizeTags,
} from "../lib/natureTaxonomy";
import {
  EMPTY_PREFERENCES,
  completeOnboarding,
  getFeedShuffleSeed,
  toggleLikePost,
  loadPreferences,
  loadFeedSession,
  loadUserPosts,
  recordView,
  saveLastFeedPostId,
  savePreferences,
  saveUserPost,
  updateUserPost,
  deleteUserPost,
} from "../lib/preferences";
import { postStatsEvent } from "../lib/communityClient";
import type { NaturePost, NatureTag, Region, UserPreferences } from "../lib/types";

interface CurateResult {
  tags: NatureTag[];
  explanation: string;
  source: "llm" | "local";
}

function curateLocally(prompt: string): CurateResult {
  const tags = extractTagsFromText(prompt);
  const explanation =
    tags.length === 0
      ? 'Could not match nature categories. Try: "water and forest reels" or "show me wildlife and mountains"'
      : `Showing ${getTagLabels(tags).join(" & ")} reels`;
  return { tags, explanation, source: "local" };
}

async function curateFeedPrompt(prompt: string): Promise<CurateResult> {
  const local = curateLocally(prompt);
  try {
    const response = await fetch(`${API_BASE_URL}/api/curate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) return local;
    const data = (await response.json()) as CurateResult;
    const tags = normalizeTags(data.tags ?? []);
    if (tags.length === 0) return local;

    // Prefer categories found in the user's words; never keep LLM extras.
    if (local.tags.length > 0) {
      const localSet = new Set(local.tags);
      const intersection = tags.filter((t) => localSet.has(t));
      if (intersection.length > 0) {
        return {
          tags: intersection,
          explanation:
            data.explanation ||
            `Showing ${getTagLabels(intersection).join(" & ")} reels`,
          source: data.source ?? "llm",
        };
      }
      return local;
    }

    return {
      tags,
      explanation:
        data.explanation || `Showing ${getTagLabels(tags).join(" & ")} reels`,
      source: data.source ?? "llm",
    };
  } catch {
    void NATURE_TAGS;
    return local;
  }
}

interface FloralyContextValue {
  preferences: UserPreferences;
  posts: NaturePost[];
  allPosts: NaturePost[];
  savedPosts: NaturePost[];
  myPosts: NaturePost[];
  curateMessage: string | null;
  setOnboarding: (tags: NatureTag[], region?: Region) => void;
  toggleLike: (postId: string) => void;
  onPostViewed: (post: NaturePost) => void;
  submitCuratePrompt: (prompt: string) => Promise<void>;
  curateLoading: boolean;
  clearCurate: () => void;
  addPost: (
    post: Omit<NaturePost, "id" | "likes" | "rank" | "comments" | "createdAt">
  ) => void;
  updatePost: (
    postId: string,
    updates: Partial<
      Pick<
        NaturePost,
        "caption" | "tags" | "region" | "imageUrl" | "music" | "speciesSticker"
      >
    >
  ) => void;
  deletePost: (postId: string) => void;
  syncMyPostsCommentsEnabled: (authorId: string, enabled: boolean) => void;
  getMyPost: (postId: string) => NaturePost | undefined;
  isLiked: (postId: string) => boolean;
  ready: boolean;
}

const FloralyContext = createContext<FloralyContextValue | null>(null);

export function FloralyProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const accountId = user?.id ?? null;

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userPosts, setUserPosts] = useState<NaturePost[]>([]);
  const [feedSession, setFeedSession] = useState({
    viewedTags: [] as NatureTag[],
    transitionCounts: {} as Record<string, number>,
  });
  const [curateMessage, setCurateMessage] = useState<string | null>(null);
  const [curateLoading, setCurateLoading] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [accountReady, setAccountReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      const [posts, seed, session] = await Promise.all([
        loadUserPosts(),
        getFeedShuffleSeed(),
        loadFeedSession(),
      ]);
      if (cancelled) return;
      setUserPosts(posts);
      setShuffleSeed(seed);
      setFeedSession(session);
      setCurateMessage(null);

      if (!accountId) {
        setPreferences({ ...EMPTY_PREFERENCES });
        setAccountReady(true);
        return;
      }

      const prefs = await loadPreferences(accountId);
      if (cancelled) return;
      setPreferences(prefs);
      setAccountReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, accountId]);

  useEffect(() => {
    if (!accountId || !authReady) return;
    let cancelled = false;
    (async () => {
      const enabled = (await loadSettings(accountId)).allowComments;
      if (cancelled) return;
      setUserPosts((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.authorId !== accountId) return p;
          if (p.commentsEnabled === enabled) return p;
          changed = true;
          const updated: NaturePost = { ...p, commentsEnabled: enabled };
          void updateUserPost(updated);
          return updated;
        });
        return changed ? next : prev;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, authReady]);

  const allPosts = useMemo(() => [...userPosts, ...MOCK_POSTS], [userPosts]);

  const myPosts = useMemo(() => {
    if (!accountId) return [];
    return userPosts.filter((p) => p.authorId === accountId);
  }, [userPosts, accountId]);

  const posts = useMemo(() => {
    if (!preferences) return MOCK_POSTS;
    return rankAndShuffleFeed(allPosts, preferences, feedSession, shuffleSeed);
    // Keep order stable when liking — likes update tagWeights/likedPostIds and
    // must not reshuffle the visible feed mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit like-side prefs
  }, [
    allPosts,
    shuffleSeed,
    feedSession,
    preferences?.selectedTags,
    preferences?.region,
    preferences?.onboardingComplete,
    preferences?.sessionOverrides,
  ]);

  const savedPosts = useMemo(() => {
    if (!preferences) return [];
    return preferences.likedPostIds
      .map((id) => allPosts.find((p) => p.id === id))
      .filter((p): p is NaturePost => p !== undefined);
  }, [preferences, allPosts]);

  const setOnboarding = useCallback(
    (tags: NatureTag[], region?: Region) => {
      if (!accountId) return;
      void (async () => {
        const updated = await completeOnboarding(accountId, tags, region);
        setPreferences(updated);
      })();
    },
    [accountId]
  );

  const toggleLike = useCallback(
    (postId: string) => {
      if (!accountId) return;
      setPreferences((prev) => {
        if (!prev) return prev;
        const post = allPosts.find((p) => p.id === postId);
        if (!post) return prev;
        const updated = toggleLikePost(prev, post);
        void savePreferences(updated, accountId);
        return updated;
      });
    },
    [allPosts, accountId]
  );

  const onPostViewed = useCallback((post: NaturePost) => {
    void saveLastFeedPostId(post.id);
    if (post.tags[0]) {
      void recordView(post.tags[0]).then(() => loadFeedSession()).then(setFeedSession);
    }
  }, []);

  const submitCuratePrompt = useCallback(
    async (prompt: string) => {
      if (!accountId) return;
      setCurateLoading(true);
      try {
        const result = await curateFeedPrompt(prompt);
        setCurateMessage(result.explanation);
        setPreferences((prev) => {
          if (!prev) return prev;
          const updated: UserPreferences = {
            ...prev,
            sessionOverrides:
              result.tags.length > 0
                ? {
                    tags: result.tags,
                    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                    prompt,
                    explanation: result.explanation,
                  }
                : undefined,
          };
          void savePreferences(updated, accountId);
          return updated;
        });
      } finally {
        setCurateLoading(false);
      }
    },
    [accountId]
  );

  const clearCurate = useCallback(() => {
    if (!accountId) return;
    setCurateMessage(null);
    setPreferences((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, sessionOverrides: undefined };
      void savePreferences(updated, accountId);
      return updated;
    });
  }, [accountId]);

  const addPost = useCallback(
    (
      post: Omit<NaturePost, "id" | "likes" | "rank" | "comments" | "createdAt">
    ) => {
      const newPost: NaturePost = {
        ...post,
        id: `user_${Date.now()}`,
        likes: 0,
        rank: 0.5,
        comments: [],
        createdAt: new Date().toISOString().split("T")[0],
      };
      void saveUserPost(newPost);
      setUserPosts((prev) => [newPost, ...prev]);
      if (post.authorId) {
        void postStatsEvent({
          type: "upload",
          userId: post.authorId,
          displayName: post.author,
        });
      }
    },
    []
  );

  const updatePost = useCallback(
    (
      postId: string,
      updates: Partial<
        Pick<
          NaturePost,
          "caption" | "tags" | "region" | "imageUrl" | "music" | "speciesSticker"
        >
      >
    ) => {
      setUserPosts((prev) => {
        const existing = prev.find((p) => p.id === postId);
        if (!existing) return prev;
        const updated: NaturePost = {
          ...existing,
          ...updates,
          caption:
            updates.caption === ""
              ? undefined
              : (updates.caption ?? existing.caption),
        };
        if ("music" in updates) {
          updated.music = updates.music || undefined;
        }
        if ("speciesSticker" in updates) {
          updated.speciesSticker = updates.speciesSticker || undefined;
        }
        void updateUserPost(updated);
        return prev.map((p) => (p.id === postId ? updated : p));
      });
    },
    []
  );

  const deletePost = useCallback(
    (postId: string) => {
      void deleteUserPost(postId);
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
      if (!accountId) return;
      setPreferences((prev) => {
        if (!prev) return prev;
        if (!prev.likedPostIds.includes(postId)) return prev;
        const updated = {
          ...prev,
          likedPostIds: prev.likedPostIds.filter((id) => id !== postId),
        };
        void savePreferences(updated, accountId);
        return updated;
      });
    },
    [accountId]
  );

  const syncMyPostsCommentsEnabled = useCallback(
    (authorId: string, enabled: boolean) => {
      setUserPosts((prev) =>
        prev.map((p) => {
          if (p.authorId !== authorId) return p;
          const updated: NaturePost = { ...p, commentsEnabled: enabled };
          void updateUserPost(updated);
          return updated;
        })
      );
    },
    []
  );

  const getMyPost = useCallback(
    (postId: string) => {
      if (!accountId) return undefined;
      return userPosts.find((p) => p.id === postId && p.authorId === accountId);
    },
    [userPosts, accountId]
  );

  const isLiked = useCallback(
    (postId: string) => preferences?.likedPostIds.includes(postId) ?? false,
    [preferences]
  );

  const value = useMemo<FloralyContextValue>(
    () => ({
      preferences: preferences ?? EMPTY_PREFERENCES,
      posts,
      allPosts,
      savedPosts,
      myPosts,
      curateMessage,
      curateLoading,
      setOnboarding,
      toggleLike,
      onPostViewed,
      submitCuratePrompt,
      clearCurate,
      addPost,
      updatePost,
      deletePost,
      syncMyPostsCommentsEnabled,
      getMyPost,
      isLiked,
      ready: authReady && accountReady && preferences !== null,
    }),
    [
      preferences,
      posts,
      allPosts,
      savedPosts,
      myPosts,
      curateMessage,
      curateLoading,
      setOnboarding,
      toggleLike,
      onPostViewed,
      submitCuratePrompt,
      clearCurate,
      addPost,
      updatePost,
      deletePost,
      syncMyPostsCommentsEnabled,
      getMyPost,
      isLiked,
      authReady,
      accountReady,
    ]
  );

  return (
    <FloralyContext.Provider value={value}>{children}</FloralyContext.Provider>
  );
}

export function useFloraly() {
  const ctx = useContext(FloralyContext);
  if (!ctx) throw new Error("useFloraly must be used within FloralyProvider");
  return ctx;
}
