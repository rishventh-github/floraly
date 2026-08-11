import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFloraly } from "../context/FloralyContext";
import { useTheme } from "../context/ThemeContext";
import { FeedCard } from "../components/FeedCard";
import { VerticalReelPager } from "../components/VerticalReelPager";
import type { NaturePost } from "../lib/types";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "SavedWatch">;

export function SavedWatchScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const startPostId = route.params?.postId;
  const insets = useSafeAreaInsets();
  const { savedPosts, ready, isLiked, toggleLike, onPostViewed } = useFloraly();

  const ordered = useMemo(() => {
    if (startPostId && savedPosts.some((p) => p.id === startPostId)) {
      return [
        ...savedPosts.filter((p) => p.id === startPostId),
        ...savedPosts.filter((p) => p.id !== startPostId),
      ];
    }
    return savedPosts;
  }, [savedPosts, startPostId]);

  const renderReel = useCallback(
    ({
      item,
      isActive,
      height,
    }: {
      item: NaturePost;
      isActive: boolean;
      height: number;
    }) => (
      <FeedCard
        post={item}
        height={height}
        isActive={isActive}
        isLiked={isLiked(item.id)}
        onLike={() => toggleLike(item.id)}
        onVisible={() => onPostViewed(item)}
      />
    ),
    [isLiked, onPostViewed, toggleLike]
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (ordered.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backPad}>
          <Text style={styles.backDark}>‹ Saved</Text>
        </Pressable>
        <Text style={styles.emptyTitle}>No saved reels</Text>
        <Text style={styles.muted}>
          Heart reels in the feed and they'll show up here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Saved</Text>
        </Pressable>
        <Text style={styles.hint}>Scroll your saved reels</Text>
      </View>
      <VerticalReelPager data={ordered} renderItem={renderReel} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest950 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.cream100,
    padding: spacing.lg,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.forest800,
    marginBottom: 8,
  },
  muted: { fontSize: 14, color: colors.stone500, lineHeight: 20 },
  backPad: { position: "absolute", top: 16, left: 20 },
  backDark: { color: colors.stone500, fontSize: 14 },
  topBar: {
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  hint: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
});
}

