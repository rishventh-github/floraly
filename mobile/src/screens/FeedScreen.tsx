import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFloraly } from "../context/FloralyContext";
import { FeedCard } from "../components/FeedCard";
import { VerticalReelPager } from "../components/VerticalReelPager";
import { isPrivateReel } from "../lib/social";
import type { NaturePost } from "../lib/types";
import { type AppColors, spacing } from "../theme/colors";
import { FloralyTextInput } from "../components/FloralyTextInput";

type FeedScope = "all" | "groups";

function sortNewestFirst(posts: NaturePost[]): NaturePost[] {
  return [...posts].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  );
}

export function FeedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { settings } = useAuth();
  const {
    posts,
    visiblePosts,
    ready,
    isLiked,
    toggleLike,
    onPostViewed,
    submitCuratePrompt,
    clearCurate,
    curateMessage,
    curateLoading,
  } = useFloraly();
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<FeedScope>("all");

  const scopedPosts = useMemo(() => {
    if (scope === "all") return posts;
    return sortNewestFirst(visiblePosts.filter((p) => isPrivateReel(p)));
  }, [posts, visiblePosts, scope]);

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

  const onActiveChange = useCallback(
    (item: NaturePost) => {
      onPostViewed(item);
    },
    [onPostViewed]
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.forest600} />
      </View>
    );
  }

  const filterTop = settings.showCurateBar ? undefined : insets.top + 8;

  return (
    <View style={styles.root}>
      {settings.showCurateBar ? (
        <View style={[styles.curateBar, { paddingTop: insets.top + 8 }]}>
          <FloralyTextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder='Curate: "water and forests"'
            placeholderTextColor={colors.stone400}
            style={styles.curateInput}
            onSubmitEditing={() => {
              if (prompt.trim()) void submitCuratePrompt(prompt.trim());
            }}
          />
          <Pressable
            onPress={() => {
              if (prompt.trim()) void submitCuratePrompt(prompt.trim());
            }}
            style={styles.curateBtn}
            disabled={curateLoading}
          >
            <Text style={styles.curateBtnText}>
              {curateLoading ? "..." : "Go"}
            </Text>
          </Pressable>
          {curateMessage ? (
            <Pressable onPress={clearCurate} style={styles.curateMsg}>
              <Text style={styles.curateMsgText}>{curateMessage} · clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.scopeBar,
          filterTop != null ? { top: filterTop } : { top: insets.top + 8 },
          settings.showCurateBar ? { top: insets.top + 56 } : null,
        ]}
      >
        {(
          [
            ["all", "All"],
            ["groups", "Groups"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setScope(id)}
            style={[styles.scopeChip, scope === id && styles.scopeChipOn]}
          >
            <Text
              style={[
                styles.scopeChipText,
                scope === id && styles.scopeChipTextOn,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {scopedPosts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {scope === "groups" ? "No group reels yet" : "No reels yet"}
          </Text>
          <Text style={styles.emptyBody}>
            {scope === "groups"
              ? "Share a reel to a group, or join a group someone shared with."
              : "Share something outdoors to fill the feed."}
          </Text>
        </View>
      ) : (
        <VerticalReelPager
          data={scopedPosts}
          renderItem={renderReel}
          onActiveChange={onActiveChange}
          listKey={`${scope}-${curateMessage ? `curate-${scopedPosts.length}` : "feed"}`}
        />
      )}
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
    curateBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
      paddingHorizontal: spacing.md,
      paddingBottom: 8,
      backgroundColor: "rgba(11,31,20,0.55)",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    curateInput: {
      flex: 1,
      minWidth: 160,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.forest800,
    },
    curateBtn: {
      backgroundColor: colors.moss400,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    curateBtnText: { fontWeight: "700", color: colors.forest950, fontSize: 13 },
    curateMsg: { width: "100%" },
    curateMsgText: { color: colors.moss300, fontSize: 12 },
    scopeBar: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 28,
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
    },
    scopeChip: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    scopeChipOn: {
      backgroundColor: colors.white,
      borderColor: colors.white,
    },
    scopeChipText: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 12,
      fontWeight: "600",
    },
    scopeChipTextOn: { color: colors.forest800 },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    emptyTitle: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    emptyBody: {
      marginTop: 8,
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      textAlign: "center",
    },
  });
}
