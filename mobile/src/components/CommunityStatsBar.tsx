import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CommunityStatsSnapshot } from "../lib/communityTypes";
import { fetchCommunityStats } from "../lib/communityClient";
import { colors, spacing } from "../theme/colors";

interface CommunityStatsBarProps {
  onPressLeaderboard?: () => void;
}

export function CommunityStatsBar({ onPressLeaderboard }: CommunityStatsBarProps) {
  const [stats, setStats] = useState<CommunityStatsSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const next = await fetchCommunityStats();
      if (alive) setStats(next);
    };
    void load();
    const id = setInterval(load, 12_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = [
    { label: "Online now", value: stats?.concurrentUsers ?? "-" },
    { label: "Joined", value: stats?.totalUsers ?? "-" },
    { label: "Visitors", value: stats?.uniqueVisitors ?? "-" },
    { label: "Nature pics", value: stats?.totalUploads ?? "-" },
  ];

  return (
    <View style={styles.card}>
      {onPressLeaderboard ? (
        <Pressable onPress={onPressLeaderboard} style={styles.linkRow}>
          <Text style={styles.link}>Leaderboard</Text>
        </Pressable>
      ) : null}
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.cell}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.moss300,
  },
  linkRow: {
    alignItems: "flex-end",
    marginBottom: spacing.sm,
  },
  link: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.forest600,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cell: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.cream50,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.forest800,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.stone500,
    textAlign: "center",
  },
});
