import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { useFloraly } from "../context/FloralyContext";
import {
  RISK_LEVELS,
  getRiskMeta,
  getSpeciesById,
  resolveSpeciesCard,
  type SpeciesCard,
} from "../lib/speciesCatalog";
import {
  getCollectionPoints,
  loadCollectedSpeciesIds,
} from "../lib/collection";
import { postStatsEvent } from "../lib/communityClient";
import { NATURE_TAGS, REGIONS, assetUrl } from "../lib/constants";
import { Screen } from "../components/Screen";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/colors";

type SavedTab = "reels" | "collection";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Saved">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function SavedScreen() {
  const navigation = useNavigation<Nav>();
  const { savedPosts, toggleLike, isLiked, ready } = useFloraly();
  const { user } = useAuth();
  const [tab, setTab] = useState<SavedTab>("reels");
  const [collectedIds, setCollectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setCollectedIds([]);
      return;
    }
    void (async () => {
      const ids = await loadCollectedSpeciesIds(user.id);
      setCollectedIds(ids);
      const points = await getCollectionPoints(user.id);
      void postStatsEvent({
        type: "sync_points",
        userId: user.id,
        displayName: user.displayName,
        points,
      });
    })();
  }, [user]);

  const collectedCards = useMemo(
    () =>
      collectedIds
        .map((id) => getSpeciesById(id))
        .filter((c): c is SpeciesCard => !!c),
    [collectedIds]
  );

  const byRisk = useMemo(
    () =>
      RISK_LEVELS.map((level) => ({
        level,
        cards: collectedCards.filter((c) => c.riskLevel === level.id),
      })),
    [collectedCards]
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.subtitle}>
        Loved reels and your flora/fauna collection.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("reels")}
          style={[styles.tab, tab === "reels" && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, tab === "reels" && styles.tabTextActive]}
          >
            Saved reels
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("collection")}
          style={[styles.tab, tab === "collection" && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              tab === "collection" && styles.tabTextActive,
            ]}
          >
            Species collection
          </Text>
        </Pressable>
      </View>

      {tab === "reels" ? (
        savedPosts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No saved reels yet</Text>
            <Text style={styles.muted}>
              Heart reels in the feed and they'll show up here.
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => navigation.navigate("SavedWatch")}
              style={styles.playAll}
            >
              <Text style={styles.playAllText}>Play all</Text>
            </Pressable>
            <View style={styles.grid}>
              {savedPosts.map((post) => {
                const tagLabel = post.tags
                  .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label)
                  .filter(Boolean)
                  .join(" · ");
                const regionLabel = post.region
                  ? REGIONS.find((r) => r.id === post.region)?.label
                  : null;
                const sticker = post.speciesSticker
                  ? resolveSpeciesCard(post.speciesSticker)
                  : null;

                return (
                  <View key={post.id} style={styles.gridItem}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("SavedWatch", { postId: post.id })
                      }
                    >
                      <View style={styles.thumb}>
                        <Image
                          source={{ uri: assetUrl(post.imageUrl) }}
                          style={styles.thumbImg}
                          contentFit="cover"
                        />
                        <View style={styles.thumbOverlay}>
                          <Text style={styles.thumbAuthor}>{post.author}</Text>
                          {post.caption ? (
                            <Text style={styles.thumbCaption} numberOfLines={2}>
                              {post.caption}
                            </Text>
                          ) : null}
                          <Text style={styles.thumbMeta} numberOfLines={1}>
                            {[
                              tagLabel,
                              regionLabel,
                              `${post.likes + (isLiked(post.id) ? 1 : 0)} likes`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </View>
                        {sticker ? (
                          <Image
                            source={{ uri: assetUrl(sticker.imageUrl) }}
                            style={styles.stickerBadge}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleLike(post.id)}
                      style={styles.unsave}
                    >
                      <Text style={styles.unsaveText}>♥</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )
      ) : collectedCards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No species yet</Text>
          <Text style={styles.muted}>
            Find stickers on reels and tap to collect them.
          </Text>
        </View>
      ) : (
        byRisk
          .filter((g) => g.cards.length > 0)
          .map((group) => (
            <View key={group.level.id} style={styles.riskGroup}>
              <Text style={styles.riskTitle}>
                {group.level.label} · {group.level.points} pts each
              </Text>
              <View style={styles.speciesRow}>
                {group.cards.map((card) => (
                  <View key={card.id} style={styles.speciesCard}>
                    <Image
                      source={{ uri: assetUrl(card.imageUrl) }}
                      style={styles.speciesImg}
                      contentFit="cover"
                    />
                    <Text style={styles.speciesName} numberOfLines={1}>
                      {card.name}
                    </Text>
                    <Text style={styles.speciesMeta}>
                      {getRiskMeta(card.riskLevel).shortLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.stone500 },
  tabs: {
    marginTop: spacing.md,
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.forest600 },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.stone600 },
  tabTextActive: { color: colors.white },
  empty: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.forest800,
    marginBottom: 8,
  },
  muted: { fontSize: 13, color: colors.stone500, textAlign: "center" },
  playAll: {
    marginTop: spacing.md,
    alignSelf: "flex-end",
    backgroundColor: colors.forest600,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playAllText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  grid: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: { width: "48%", position: "relative" },
  thumb: {
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.forest950,
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  thumbAuthor: { color: colors.white, fontSize: 12, fontWeight: "600" },
  thumbCaption: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  thumbMeta: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 4 },
  stickerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  unsave: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  unsaveText: { color: colors.white, fontSize: 14 },
  riskGroup: { marginTop: spacing.lg },
  riskTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.forest800,
    marginBottom: 8,
  },
  speciesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  speciesCard: {
    width: "30%",
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  speciesImg: { width: "100%", aspectRatio: 1 },
  speciesName: {
    paddingHorizontal: 6,
    paddingTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: colors.forest800,
  },
  speciesMeta: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    fontSize: 10,
    color: colors.stone500,
  },
});
