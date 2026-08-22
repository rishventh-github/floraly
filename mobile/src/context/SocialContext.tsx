import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DeviceEventEmitter } from "react-native";
import { useAuth } from "./AuthContext";
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
} from "../lib/social";
import type { NatureGroup, PublicAccount } from "../lib/types";

const SOCIAL_EVENT = "floraly-social-changed";

export function emitSocialChanged() {
  DeviceEventEmitter.emit(SOCIAL_EVENT);
}

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
  createGroup: (name: string, memberIds?: string[]) => Promise<NatureGroup | null>;
  setGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  refresh: () => void;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<NatureGroup[]>([]);
  const [people, setPeople] = useState<PublicAccount[]>([]);
  const [followedPeople, setFollowedPeople] = useState<PublicAccount[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
    emitSocialChanged();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setFollowingIds([]);
          setGroups([]);
          setPeople([]);
          setFollowedPeople([]);
        }
        return;
      }
      const [following, allGroups, mutual, followed] = await Promise.all([
        loadFollowing(user.id),
        loadGroups(),
        listMutualPeople(user.id),
        listFollowedPeople(user.id),
      ]);
      if (cancelled) return;
      setFollowingIds(following);
      setGroups(allGroups);
      setPeople(mutual);
      setFollowedPeople(followed);
    })();
    return () => {
      cancelled = true;
    };
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
      void (async () => {
        setFollowingIds(await followUser(user.id, targetId));
        refresh();
      })();
    },
    [user, refresh]
  );

  const unfollow = useCallback(
    (targetId: string) => {
      if (!user) return;
      void (async () => {
        setFollowingIds(await unfollowUser(user.id, targetId));
        refresh();
      })();
    },
    [user, refresh]
  );

  const createGroup = useCallback(
    async (name: string, memberIds?: string[]) => {
      if (!user) return null;
      const group = await createGroupStore({
        name,
        ownerId: user.id,
        memberIds,
      });
      setGroups(await loadGroups());
      refresh();
      return group;
    },
    [user, refresh]
  );

  const setGroupMembers = useCallback(
    async (groupId: string, memberIds: string[]) => {
      await updateGroupMembers(groupId, memberIds);
      setGroups(await loadGroups());
      refresh();
    },
    [refresh]
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      await leaveGroupStore(groupId, user.id);
      setGroups(await loadGroups());
      refresh();
    },
    [user, refresh]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      await deleteGroupStore(groupId, user.id);
      setGroups(await loadGroups());
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
