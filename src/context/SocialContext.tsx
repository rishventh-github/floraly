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
import {
  createGroup as createGroupStore,
  deleteGroup as deleteGroupStore,
  followUser,
  leaveGroup as leaveGroupStore,
  listFollowedPeople,
  listMutualPeople,
  loadFollowing,
  loadGroups,
  unfollowUser,
  updateGroupMembers,
} from "@/lib/social";
import type { NatureGroup, PublicAccount } from "@/lib/types";

interface SocialContextValue {
  followingIds: string[];
  groups: NatureGroup[];
  myGroups: NatureGroup[];
  /** Mutual follows — shown on People. */
  people: PublicAccount[];
  /** People you follow — used when creating/editing groups. */
  followedPeople: PublicAccount[];
  isFollowing: (targetId: string) => boolean;
  follow: (targetId: string) => void;
  unfollow: (targetId: string) => void;
  createGroup: (name: string, memberIds?: string[]) => NatureGroup | null;
  setGroupMembers: (groupId: string, memberIds: string[]) => void;
  leaveGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  refresh: () => void;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<NatureGroup[]>([]);
  const [people, setPeople] = useState<PublicAccount[]>([]);
  const [followedPeople, setFollowedPeople] = useState<PublicAccount[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("floraly-social-changed"));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowingIds([]);
      setGroups([]);
      setPeople([]);
      setFollowedPeople([]);
      return;
    }
    setFollowingIds(loadFollowing(user.id));
    setGroups(loadGroups());
    setPeople(listMutualPeople(user.id));
    setFollowedPeople(listFollowedPeople(user.id));
  }, [user, tick]);

  const myGroups = useMemo(
    () => (user ? groups.filter((g) => g.memberIds.includes(user.id)) : []),
    [groups, user]
  );

  const isFollowingFn = useCallback(
    (targetId: string) => followingIds.includes(targetId),
    [followingIds]
  );

  const follow = useCallback(
    (targetId: string) => {
      if (!user) return;
      setFollowingIds(followUser(user.id, targetId));
      refresh();
    },
    [user, refresh]
  );

  const unfollow = useCallback(
    (targetId: string) => {
      if (!user) return;
      setFollowingIds(unfollowUser(user.id, targetId));
      refresh();
    },
    [user, refresh]
  );

  const createGroup = useCallback(
    (name: string, memberIds?: string[]) => {
      if (!user) return null;
      const group = createGroupStore({
        name,
        ownerId: user.id,
        memberIds,
      });
      setGroups(loadGroups());
      refresh();
      return group;
    },
    [user, refresh]
  );

  const setGroupMembers = useCallback(
    (groupId: string, memberIds: string[]) => {
      updateGroupMembers(groupId, memberIds);
      setGroups(loadGroups());
      refresh();
    },
    [refresh]
  );

  const leaveGroup = useCallback(
    (groupId: string) => {
      if (!user) return;
      leaveGroupStore(groupId, user.id);
      setGroups(loadGroups());
      refresh();
    },
    [user, refresh]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (!user) return;
      deleteGroupStore(groupId, user.id);
      setGroups(loadGroups());
      refresh();
    },
    [user, refresh]
  );

  const value = useMemo<SocialContextValue>(
    () => ({
      followingIds,
      groups,
      myGroups,
      people,
      followedPeople,
      isFollowing: isFollowingFn,
      follow,
      unfollow,
      createGroup,
      setGroupMembers,
      leaveGroup,
      deleteGroup,
      refresh,
    }),
    [
      followingIds,
      groups,
      myGroups,
      people,
      followedPeople,
      isFollowingFn,
      follow,
      unfollow,
      createGroup,
      setGroupMembers,
      leaveGroup,
      deleteGroup,
      refresh,
    ]
  );

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
