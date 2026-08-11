import { useCallback, useMemo } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFloraly } from "../context/FloralyContext";
import { useTheme } from "../context/ThemeContext";
import { FeedCard } from "../components/FeedCard";
import { Screen } from "../components/Screen";
import { VerticalReelPager } from "../components/VerticalReelPager";
import type { NaturePost } from "../lib/types";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

export function MyReelsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { myPosts, ready, isLiked, toggleLike, onPostViewed, deletePost } =
    useFloraly();

  const confirmDelete = useCallback(
    (postId: string) => {
      Alert.alert(
        "Delete reel?",
        "This will permanently remove this reel from your memory book.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deletePost(postId),
          },
        ]
      );
    },
    [deletePost]
  );

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
        ownerMode
        onEdit={() => navigation.navigate("EditReel", { postId: item.id })}
        onDelete={() => confirmDelete(item.id)}
      />
    ),
    [confirmDelete, isLiked, navigation, onPostViewed, toggleLike]
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (myPosts.length === 0) {
    return (
      <Screen style={styles.emptyScreen} edges={["top", "bottom"]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backDark}>‹ Back</Text>
        </Pressable>
        <Text style={styles.emptyTitle}>No reels yet</Text>
        <Text style={styles.muted}>
          Share a photo from your outdoor adventures - your memory book will
          grow here.
        </Text>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hint}>Scroll your memory book</Text>
      </View>
      <VerticalReelPager data={myPosts} renderItem={renderReel} />
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
  emptyScreen: {
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
  back: { marginBottom: spacing.lg },
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

