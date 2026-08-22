import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useSocial } from "../context/SocialContext";
import { useTheme } from "../context/ThemeContext";
import { Screen } from "../components/Screen";
import { getInitials } from "../lib/auth";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

type PeopleTab = "following" | "mutual";

export function PeopleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { people, followedPeople, followingIds, unfollow } = useSocial();
  const [tab, setTab] = useState<PeopleTab>("following");

  if (!user) return null;

  const list = tab === "following" ? followedPeople : people;
  const emptyTitle =
    tab === "following" ? "Not following anyone yet" : "No mutual friends yet";
  const emptyBody =
    tab === "following"
      ? "Tap a username on the feed or leaderboard to open their profile and follow them."
      : "Follow someone from their profile, then have them follow you back. Once you both follow each other, they show up here.";

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>People</Text>
        <Text style={styles.subtitle}>
          Switch between people you follow and friends who follow you back.
        </Text>

        <View style={styles.metaRow}>
          <Pressable
            onPress={() => navigation.navigate("Groups")}
            style={styles.metaChip}
          >
            <Text style={styles.metaChipText}>Manage groups</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("following")}
            style={[styles.tab, tab === "following" && styles.tabOn]}
          >
            <Text
              style={[styles.tabText, tab === "following" && styles.tabTextOn]}
            >
              Following {followingIds.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("mutual")}
            style={[styles.tab, tab === "mutual" && styles.tabOn]}
          >
            <Text
              style={[styles.tabText, tab === "mutual" && styles.tabTextOn]}
            >
              Mutual {people.length}
            </Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyBody}>{emptyBody}</Text>
          </View>
        ) : (
          list.map((person) => (
            <View key={person.id} style={styles.card}>
              <Pressable
                onPress={() =>
                  navigation.navigate("UserProfile", { userId: person.id })
                }
                style={styles.personLink}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(person.displayName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{person.displayName}</Text>
                  <Text style={styles.email}>
                    {person.email ??
                      (tab === "mutual" ? "Mutual follow" : "Following")}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => unfollow(person.id)}
                style={[styles.btn, styles.btnOutline]}
              >
                <Text style={[styles.btnText, styles.btnOutlineText]}>
                  Unfollow
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.cream100 },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { marginBottom: 8 },
    backText: { color: colors.stone500, fontSize: 14 },
    title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
    subtitle: { marginTop: 4, fontSize: 13, color: colors.stone500 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
    metaChip: {
      backgroundColor: colors.moss300,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    metaChipText: { color: colors.forest700, fontWeight: "600", fontSize: 12 },
    tab: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    tabOn: {
      backgroundColor: colors.forest600,
      borderColor: colors.forest600,
    },
    tabText: { color: colors.stone500, fontSize: 12, fontWeight: "600" },
    tabTextOn: { color: colors.white },
    empty: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    emptyTitle: { fontWeight: "700", fontSize: 16, color: colors.forest800 },
    emptyBody: { marginTop: 6, fontSize: 13, color: colors.stone500 },
    card: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    personLink: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.forest600,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.white, fontWeight: "700", fontSize: 13 },
    name: { fontWeight: "700", color: colors.forest800 },
    email: { fontSize: 12, color: colors.stone500, marginTop: 2 },
    btn: {
      backgroundColor: colors.forest600,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    btnOutline: {
      backgroundColor: colors.cream100,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    btnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
    btnOutlineText: { color: colors.forest800 },
  });
}
