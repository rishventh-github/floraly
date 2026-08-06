"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { loadSettings } from "@/lib/auth";
import { MOCK_POSTS } from "@/lib/mockPosts";
import { rankAndShuffleFeed } from "@/lib/feedAlgorithm";
import { curateFeedPrompt } from "@/lib/curate";
import {
  EMPTY_PREFERENCES,
  completeOnboarding,
  getFeedShuffleSeed,
  toggleLikePost,
  loadPreferences,
  loadSession,
  loadUserPosts,
  recordView,
  saveLastFeedPostId,
  savePreferences,
  saveUserPost,
  updateUserPost,
  deleteUserPost,
} from "@/lib/preferences";
import { postStatsEvent } from "@/lib/communityClient";
import type { NaturePost, NatureTag, Region, UserPreferences } from "@/lib/types";

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
  addPost: (post: Omit<NaturePost, "id" | "likes" | "rank" | "comments" | "createdAt">) => void;
  updatePost: (
    postId: string,
    updates: Partial<
      Pick<NaturePost, "caption" | "tags" | "region" | "imageUrl" | "music" | "speciesSticker">
    >
  ) => void;
  deletePost: (postId: string) => void;
  /** Apply allow-comments preference to all of this author's reels. */
  syncMyPostsCommentsEnabled: (authorId: string, enabled: boolean) => void;
  getMyPost: (postId: string) => NaturePost | undefined;
  isLiked: (postId: string) => boolean;
  ready: boolean;
}

const FloralyContext = createContext<FloralyContextValue | null>(null);

export function FloralyProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const accountId = user?.id ?? null;

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userPosts, setUserPosts] = useState<NaturePost[]>([]);
  const [curateMessage, setCurateMessage] = useState<string | null>(null);
  const [curateLoading, setCurateLoading] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [accountReady, setAccountReady] = useState(false);

  // Reload per-account data whenever the signed-in user changes.
  useEffect(() => {
    if (!authReady) return;
    setUserPosts(loadUserPosts());
    setShuffleSeed(getFeedShuffleSeed());
    setCurateMessage(null);

    if (!accountId) {
      setPreferences({ ...EMPTY_PREFERENCES });
      setAccountReady(true);
      return;
    }

    setPreferences(loadPreferences(accountId));
    setAccountReady(true);
  }, [authReady, accountId]);

  // Keep shared posts in sync with each author's allow-comments setting.
  useEffect(() => {
    if (!accountId || !authReady) return;
    const enabled = loadSettings(accountId).allowComments;
    setUserPosts((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.authorId !== accountId) return p;
        if (p.commentsEnabled === enabled) return p;
        changed = true;
        const updated: NaturePost = { ...p, commentsEnabled: enabled };
        updateUserPost(updated);
        return updated;
      });
      return changed ? next : prev;
    });
  }, [accountId, authReady]);

  const allPosts = useMemo(() => {
    return [...userPosts, ...MOCK_POSTS];
  }, [userPosts]);

  const myPosts = useMemo(() => {
    if (!accountId) return [];
    return userPosts.filter((p) => p.authorId === accountId);
  }, [userPosts, accountId]);

  const posts = useMemo(() => {
    if (!preferences) return MOCK_POSTS;
    const session =
      typeof window === "undefined"
        ? { viewedTags: [], transitionCounts: {} }
        : loadSession();
    return rankAndShuffleFeed(allPosts, preferences, session, shuffleSeed);
    // Keep order stable when liking — likes update tagWeights/likedPostIds and
    // must not reshuffle the visible feed mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit like-side prefs
  }, [
    allPosts,
    shuffleSeed,
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
      const updated = completeOnboarding(accountId, tags, region);
      setPreferences(updated);
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
        savePreferences(updated, accountId);
        return updated;
      });
    },
    [allPosts, accountId]
  );

  const onPostViewed = useCallback((post: NaturePost) => {
    saveLastFeedPostId(post.id);
    if (post.tags[0]) recordView(post.tags[0]);
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
          savePreferences(updated, accountId);
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
      savePreferences(updated, accountId);
      return updated;
    });
  }, [accountId]);

  const addPost = useCallback(
    (post: Omit<NaturePost, "id" | "likes" | "rank" | "comments" | "createdAt">) => {
      const newPost: NaturePost = {
        ...post,
        id: `user_${Date.now()}`,
        likes: 0,
        rank: 0.5,
        comments: [],
        createdAt: new Date().toISOString().split("T")[0],
      };
      saveUserPost(newPost);
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
        Pick<NaturePost, "caption" | "tags" | "region" | "imageUrl" | "music" | "speciesSticker">
      >
    ) => {
      setUserPosts((prev) => {
        const existing = prev.find((p) => p.id === postId);
        if (!existing) return prev;
        const updated: NaturePost = {
          ...existing,
          ...updates,
          caption: updates.caption === "" ? undefined : (updates.caption ?? existing.caption),
        };
        if ("music" in updates) {
          updated.music = updates.music || undefined;
        }
        if ("speciesSticker" in updates) {
          updated.speciesSticker = updates.speciesSticker || undefined;
        }
        updateUserPost(updated);
        return prev.map((p) => (p.id === postId ? updated : p));
      });
    },
    []
  );

  const deletePost = useCallback(
    (postId: string) => {
      deleteUserPost(postId);
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
      if (!accountId) return;
      setPreferences((prev) => {
        if (!prev) return prev;
        if (!prev.likedPostIds.includes(postId)) return prev;
        const updated = {
          ...prev,
          likedPostIds: prev.likedPostIds.filter((id) => id !== postId),
        };
        savePreferences(updated, accountId);
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
          updateUserPost(updated);
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
