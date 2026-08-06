import { useEffect } from "react";
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
import { CommunityStatsBar } from "../components/CommunityStatsBar";
import { Screen } from "../components/Screen";
import { NATURE_TAGS, assetUrl } from "../lib/constants";
import { postStatsEvent } from "../lib/communityClient";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/colors";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { preferences, savedPosts, myPosts, ready } = useFloraly();
  const { user } = useAuth();

  useEffect(() => {
    if (!ready || !user) return;
    void postStatsEvent({
      type: "sync_uploads",
      userId: user.id,
      displayName: user.displayName,
      count: myPosts.length,
    });
  }, [ready, user, myPosts.length]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.loadingBrand}>Floraly</Text>
      </View>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.emoji}>🌿</Text>
          <View>
            <Text style={styles.brand}>Floraly</Text>
            <Text style={styles.welcome}>
              {user
                ? `Welcome back, ${user.displayName}!`
                : "Nature memories, shared."}
            </Text>
          </View>
        </View>
        <Text style={styles.tagline}>
          A calm corner to scroll outdoor memories, save favorites, and share
          your own.
        </Text>
      </View>

      {!preferences.onboardingComplete ? (
        <Pressable
          onPress={() => navigation.navigate("Setup")}
          style={styles.setupBanner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.setupTitle}>Set your nature interests</Text>
            <Text style={styles.setupBody}>
              Pick what you love so we can personalize your feed
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      <CommunityStatsBar
        onPressLeaderboard={() => navigation.navigate("Leaderboard")}
      />

      <View style={styles.actions}>
        {[
          {
            label: "Browse Feed",
            description: "Scroll nature reels tailored just for you.",
            onPress: () => navigation.navigate("Feed"),
            primary: true,
          },
          {
            label: "Share a Memory",
            description: "Upload photos from your outdoor adventures.",
            onPress: () => navigation.navigate("Share"),
            moss: true,
          },
          {
            label: "Leaderboard",
            description: "Friendly competition with the community.",
            onPress: () => navigation.navigate("Leaderboard"),
          },
          {
            label: "My Reels",
            description: "View and edit your nature reels.",
            onPress: () => navigation.navigate("MyReels"),
            badge: myPosts.length || undefined,
          },
          {
            label: "Saved Reels",
            description: "Your favorite nature moments.",
            onPress: () => navigation.navigate("Saved"),
            badge: savedPosts.length || undefined,
            badgeRose: true,
          },
        ].map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={[
              styles.actionCard,
              action.primary && styles.actionPrimary,
              action.moss && styles.actionMoss,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.actionLabel,
                  (action.primary || action.moss) && { color: colors.white },
                ]}
              >
                {action.label}
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  (action.primary || action.moss) && {
                    color: "rgba(255,255,255,0.85)",
                  },
                ]}
              >
                {action.description}
              </Text>
            </View>
            {action.badge ? (
              <View
                style={[
                  styles.badge,
                  action.badgeRose ? styles.badgeRose : styles.badgeForest,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    action.badgeRose
                      ? { color: colors.rose500 }
                      : { color: colors.forest700 },
                  ]}
                >
                  {action.badge}
                </Text>
              </View>
            ) : null}
            <Text
              style={[
                styles.chevron,
                (action.primary || action.moss) && { color: colors.white },
              ]}
            >
              ›
            </Text>
          </Pressable>
        ))}
      </View>

      {preferences.onboardingComplete && preferences.selectedTags.length > 0 ? (
        <View style={styles.interests}>
          <View style={styles.interestHeader}>
            <Text style={styles.sectionTitle}>Your interests</Text>
            <Pressable onPress={() => navigation.navigate("Setup")}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {preferences.selectedTags.map((tag) => {
              const info = NATURE_TAGS.find((t) => t.id === tag);
              return (
                <View
                  key={tag}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: info?.color ?? colors.cream50,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: info?.selectedColor ?? colors.forest700,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {info?.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {savedPosts.length > 0 ? (
        <View style={styles.savedSection}>
          <View style={styles.interestHeader}>
            <Text style={styles.sectionTitle}>Recently saved</Text>
            <Pressable onPress={() => navigation.navigate("Saved")}>
              <Text style={styles.editLink}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.savedGrid}>
            {savedPosts.slice(0, 3).map((post) => (
              <Pressable
                key={post.id}
                style={styles.savedThumb}
                onPress={() =>
                  navigation.navigate("SavedWatch", { postId: post.id })
                }
              >
                <Image
                  source={{ uri: assetUrl(post.imageUrl) }}
                  style={styles.savedImg}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { paddingBottom: 40 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
  },
  loadingBrand: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: colors.forest700,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.moss300,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 36 },
  brand: { fontSize: 28, fontWeight: "700", color: colors.forest800 },
  welcome: { fontSize: 13, color: colors.stone500, marginTop: 2 },
  tagline: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    color: colors.stone600,
    maxWidth: 360,
  },
  setupBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupTitle: { color: colors.white, fontWeight: "600", fontSize: 15 },
  setupBody: { marginTop: 2, color: colors.moss300, fontSize: 13 },
  chevron: { fontSize: 28, color: colors.stone400, fontWeight: "300" },
  actions: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  actionPrimary: {
    backgroundColor: colors.forest600,
    borderColor: colors.forest600,
  },
  actionMoss: {
    backgroundColor: colors.moss400,
    borderColor: colors.moss400,
  },
  actionLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.forest800,
  },
  actionDesc: { marginTop: 2, fontSize: 13, color: colors.stone500 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeForest: { backgroundColor: colors.moss300 },
  badgeRose: { backgroundColor: colors.rose50 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  interests: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  interestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.forest800,
  },
  editLink: { fontSize: 13, color: colors.forest600, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  savedSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  savedGrid: { flexDirection: "row", gap: 8, marginTop: 12 },
  savedThumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  savedImg: { width: "100%", height: "100%" },
});
