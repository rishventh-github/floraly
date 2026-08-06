import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../lib/auth";
import type {
  CommunityStatsSnapshot,
  LeaderboardEntry,
} from "../lib/communityTypes";
import { fetchCommunityStats } from "../lib/communityClient";
import { CommunityStatsBar } from "../components/CommunityStatsBar";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/colors";
import { Screen } from "../components/Screen";

type BoardMode = "uploads" | "points";

export function LeaderboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [stats, setStats] = useState<CommunityStatsSnapshot | null>(null);
  const [mode, setMode] = useState<BoardMode>("uploads");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const next = await fetchCommunityStats();
      if (alive) setStats(next);
    };
    void load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const rows: LeaderboardEntry[] = useMemo(() => {
    const list = [...(stats?.leaderboard ?? [])];
    if (mode === "uploads") {
      return list.sort(
        (a, b) =>
          b.uploadCount - a.uploadCount ||
          a.displayName.localeCompare(b.displayName)
      );
    }
    return list.sort(
      (a, b) =>
        (b.collectionPoints ?? 0) - (a.collectionPoints ?? 0) ||
        a.displayName.localeCompare(b.displayName)
    );
  }, [stats, mode]);

  const myRank = user ? rows.findIndex((r) => r.userId === user.id) + 1 : 0;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>
        Switch between top uploaders and top species collectors.
      </Text>

      <View style={{ marginTop: spacing.md }}>
        <CommunityStatsBar />
      </View>

      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setMode("uploads")}
          style={[styles.modeTab, mode === "uploads" && styles.modeActive]}
        >
          <Text
            style={[
              styles.modeText,
              mode === "uploads" && styles.modeTextActive,
            ]}
          >
            Most uploads
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("points")}
          style={[styles.modeTab, mode === "points" && styles.modeActive]}
        >
          <Text
            style={[
              styles.modeText,
              mode === "points" && styles.modeTextActive,
            ]}
          >
            Most points
          </Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {mode === "uploads"
          ? "Ranked by nature pictures shared."
          : "Points from flora/fauna cards: Least Concern = 1 … Extinct = 9."}
      </Text>

      {user && myRank > 0 ? (
        <View style={styles.myRank}>
          <Text style={styles.myRankLabel}>Your rank</Text>
          <Text style={styles.myRankValue}>
            #{myRank} ·{" "}
            {mode === "uploads"
              ? `${rows[myRank - 1]?.uploadCount ?? 0} pics`
              : `${rows[myRank - 1]?.collectionPoints ?? 0} pts`}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        <Text style={styles.listTitle}>
          {mode === "uploads"
            ? "Top nature sharers"
            : "Top species collectors"}
        </Text>
        {rows.length === 0 ? (
          <Text style={styles.empty}>Loading ranks...</Text>
        ) : (
          rows.map((entry, index) => {
            const rank = index + 1;
            const isMe = user?.id === entry.userId;
            const score =
              mode === "uploads"
                ? `${entry.uploadCount} nature ${
                    entry.uploadCount === 1 ? "picture" : "pictures"
                  }`
                : `${entry.collectionPoints ?? 0} collection pts`;
            return (
              <View
                key={entry.userId}
                style={[styles.row, isMe && styles.rowMe]}
              >
                <Text style={styles.rank}>#{rank}</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(entry.displayName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {entry.displayName}
                    {isMe ? " (you)" : ""}
                  </Text>
                  <Text style={styles.rowScore}>{score}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  back: { marginBottom: 8 },
  backText: { color: colors.stone500, fontSize: 14 },
  title: { fontSize: 28, fontWeight: "700", color: colors.forest800 },
  subtitle: { marginTop: 6, fontSize: 13, color: colors.stone600 },
  modeTabs: {
    marginTop: spacing.md,
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  modeTab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeActive: { backgroundColor: colors.forest600 },
  modeText: { fontSize: 13, fontWeight: "600", color: colors.stone600 },
  modeTextActive: { color: colors.white },
  hint: { marginTop: 10, fontSize: 12, color: colors.stone500 },
  myRank: {
    marginTop: spacing.md,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    padding: 14,
  },
  myRankLabel: { color: colors.moss300, fontSize: 13 },
  myRankValue: {
    marginTop: 2,
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  list: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  listTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: "600",
    color: colors.forest800,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone200,
  },
  empty: {
    padding: 28,
    textAlign: "center",
    color: colors.stone500,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone200,
  },
  rowMe: { backgroundColor: colors.moss300 },
  rank: {
    width: 32,
    textAlign: "center",
    fontWeight: "600",
    color: colors.forest700,
    fontSize: 13,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forest600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  rowName: { fontWeight: "600", color: colors.forest800, fontSize: 14 },
  rowScore: { marginTop: 2, fontSize: 12, color: colors.stone500 },
});
