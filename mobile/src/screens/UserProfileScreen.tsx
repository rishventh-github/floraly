import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useFloraly } from "../context/FloralyContext";
import { useSocial } from "../context/SocialContext";
import { useTheme } from "../context/ThemeContext";
import { Screen } from "../components/Screen";
import {
  buildUserProfileStats,
  canViewerSeePost,
  ensurePostAuthorId,
  loadFollowing,
  loadGroups,
  type UserProfileStats,
} from "../lib/social";
import { isVideoPost, type NaturePost } from "../lib/types";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { allPosts } = useFloraly();
  const { isFollowing, follow, unfollow, refresh } = useSocial();
  const [profile, setProfile] = useState<UserProfileStats | null>(null);
  const [reels, setReels] = useState<NaturePost[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const posts = allPosts.map(ensurePostAuthorId);
      const next = await buildUserProfileStats(userId, posts);
      if (!alive) return;
      setProfile(next);

      const groups = await loadGroups();
      const authored = posts.filter((p) => p.authorId === userId);
      const visible: NaturePost[] = [];
      for (const post of authored) {
        const following = post.authorId
          ? await loadFollowing(post.authorId)
          : [];
        if (
          canViewerSeePost(post, user?.id, {
            authorFollowing: following,
            groups,
          })
        ) {
          visible.push(post);
        }
      }
      if (alive) setReels(visible);
    })();
    return () => {
      alive = false;
    };
  }, [userId, allPosts, user?.id]);

  if (!profile) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  const isSelf = user?.id === userId;
  const following = isFollowing(userId);

  const stats = [
    { label: "Reels", value: profile.reelCount },
    { label: "Followers", value: profile.followers },
    { label: "Following", value: profile.following },
    { label: "Likes", value: profile.likesReceived },
    { label: "Collection", value: profile.collectionPoints },
    { label: "Groups", value: profile.groupCount },
  ];

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {profile.displayName}
              {isSelf ? " (you)" : ""}
            </Text>
            {profile.email ? (
              <Text style={styles.meta}>{profile.email}</Text>
            ) : profile.isSeedProfile ? (
              <Text style={styles.meta}>Nature feed curator</Text>
            ) : null}
          </View>
        </View>

        {!isSelf ? (
          <Pressable
            onPress={() => {
              if (following) void unfollow(userId);
              else void follow(userId);
              void refresh();
            }}
            style={[styles.followBtn, following && styles.followOutline]}
          >
            <Text
              style={[
                styles.followText,
                following && styles.followOutlineText,
              ]}
            >
              {following ? "Following" : "Follow"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={styles.followOutline}
          >
            <Text style={styles.followOutlineText}>
              Edit profile in Settings
            </Text>
          </Pressable>
        )}

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Reels</Text>
        {reels.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBody}>
              No reels you can see yet. Circle posts only show if you follow them
              or share a group.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {reels.map((post) => (
              <Pressable
                key={post.id}
                style={styles.thumb}
                onPress={() =>
                  navigation.navigate("MainTabs", {
                    screen: "Feed",
                  })
                }
              >
                <Image
                  source={{ uri: post.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                {isVideoPost(post) ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Video</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.cream100 },
    content: { padding: spacing.lg, paddingBottom: 40 },
    loading: { padding: spacing.lg, color: colors.stone500 },
    back: { marginBottom: 8 },
    backText: { color: colors.stone500, fontSize: 14 },
    header: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.forest600,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.white, fontWeight: "700", fontSize: 20 },
    name: { fontSize: 22, fontWeight: "700", color: colors.forest800 },
    meta: { marginTop: 4, fontSize: 13, color: colors.stone500 },
    followBtn: {
      marginTop: 16,
      backgroundColor: colors.forest600,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    followText: { color: colors.white, fontWeight: "600", fontSize: 14 },
    followOutline: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    followOutlineText: {
      color: colors.forest800,
      fontWeight: "600",
      fontSize: 14,
    },
    statsGrid: {
      marginTop: 20,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statCard: {
      width: "31%",
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    statValue: { fontSize: 20, fontWeight: "700", color: colors.forest800 },
    statLabel: {
      marginTop: 4,
      fontSize: 10,
      textTransform: "uppercase",
      color: colors.stone500,
      letterSpacing: 0.4,
    },
    section: {
      marginTop: 24,
      fontSize: 18,
      fontWeight: "700",
      color: colors.forest800,
    },
    empty: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    emptyBody: { fontSize: 13, color: colors.stone500 },
    grid: {
      marginTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    thumb: {
      width: "32%",
      aspectRatio: 3 / 4,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.forest950,
      flexGrow: 1,
    },
    badge: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: { color: colors.white, fontSize: 9 },
  });
}
