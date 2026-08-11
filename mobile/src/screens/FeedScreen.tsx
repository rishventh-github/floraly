import { useCallback, useState, useMemo } from "react";
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
import type { NaturePost } from "../lib/types";
import { type AppColors, spacing } from "../theme/colors";
import { FloralyTextInput } from "../components/FloralyTextInput";

export function FeedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { settings } = useAuth();
  const {
    posts,
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

      <VerticalReelPager
        data={posts}
        renderItem={renderReel}
        onActiveChange={onActiveChange}
        listKey={curateMessage ? `curate-${posts.length}` : "feed"}
      />
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
});
}

