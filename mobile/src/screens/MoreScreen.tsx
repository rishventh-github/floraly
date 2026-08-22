import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Screen } from "../components/Screen";
import { getInitials } from "../lib/auth";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "More">,
  NativeStackNavigationProp<RootStackParamList>
>;

const LINKS: {
  label: string;
  description: string;
  route: "Settings" | "MyReels" | "Leaderboard" | "Setup" | "People" | "Groups";
}[] = [
  {
    label: "People",
    description: "Follow friends for circle posts",
    route: "People",
  },
  {
    label: "Groups",
    description: "Private circles for family and friends",
    route: "Groups",
  },
  {
    label: "Settings",
    description: "Account and experience preferences",
    route: "Settings",
  },
  {
    label: "My Reels",
    description: "Your shared nature memory book",
    route: "MyReels",
  },
  {
    label: "Leaderboard",
    description: "Uploads and collection points",
    route: "Leaderboard",
  },
  {
    label: "Setup interests",
    description: "Pick nature tags and region",
    route: "Setup",
  },
];

export function MoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>More</Text>
      {user ? (
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
          </View>
          <View>
            <Text style={styles.name}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable
            key={link.route}
            onPress={() => navigation.navigate(link.route)}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{link.label}</Text>
              <Text style={styles.rowDesc}>{link.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => logout()}
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.forest800,
  },
  profile: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.forest600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  name: { fontWeight: "700", color: colors.forest800, fontSize: 16 },
  email: { marginTop: 2, color: colors.stone500, fontSize: 13 },
  list: { marginTop: spacing.lg, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  rowTitle: { fontWeight: "700", color: colors.forest800, fontSize: 15 },
  rowDesc: { marginTop: 2, fontSize: 12, color: colors.stone500 },
  chevron: { fontSize: 24, color: colors.stone400 },
  logout: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: colors.rose50,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.rose500, fontWeight: "700", fontSize: 14 },
});
}

