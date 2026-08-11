import { useMemo } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";

type Props = NativeStackScreenProps<AuthStackParamList, "Landing">;

const PILLARS = [
  {
    title: "Real outdoor memories",
    body: "Scroll nature reels from real trails, coasts, and campfires.",
  },
  {
    title: "Curate your calm",
    body: "Tell Floraly what you want: water, forests, wildlife. Your feed listens.",
  },
  {
    title: "Safe by design",
    body: "AI-generated and off-topic uploads are filtered so the community stays outdoors.",
  },
];

export function LandingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1800&q=80",
        }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, spacing.md) + 8,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandEmoji}>🌿</Text>
              <Text style={styles.brand}>Floraly</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate("Login", { mode: "login" })}
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostText}>Sign back in</Text>
            </Pressable>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Floraly</Text>
            <Text style={styles.tagline}>
              Join the community of nature enthusiasts today.
            </Text>
            <Text style={styles.heroBody}>
              Nature memories, shared. A calm place to scroll outdoor adventures
              and share your own.
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Login", { mode: "signup" })}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Start exploring</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      <View
        style={[
          styles.pillars,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {PILLARS.map((p) => (
          <View key={p.title} style={styles.pillar}>
            <Text style={styles.pillarTitle}>{p.title}</Text>
            <Text style={styles.pillarBody}>{p.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream100 },
  hero: { flex: 1.15, minHeight: 420 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(11,31,20,0.45)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandEmoji: { fontSize: 22 },
  brand: { color: colors.white, fontSize: 22, fontWeight: "700" },
  ghostBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ghostText: { color: colors.white, fontSize: 13 },
  heroCopy: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 12,
    color: colors.moss300,
    fontSize: 20,
    fontWeight: "600",
    maxWidth: 340,
  },
  heroBody: {
    marginTop: 12,
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 340,
  },
  cta: {
    marginTop: 22,
    alignSelf: "flex-start",
    backgroundColor: colors.moss400,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  ctaText: { color: colors.forest950, fontWeight: "700", fontSize: 15 },
  pillars: {
    backgroundColor: colors.cream100,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: 14,
  },
  pillar: {
    borderLeftWidth: 3,
    borderLeftColor: colors.moss400,
    paddingLeft: 12,
  },
  pillarTitle: { fontWeight: "700", color: colors.forest800, fontSize: 14 },
  pillarBody: {
    marginTop: 4,
    color: colors.stone500,
    fontSize: 13,
    lineHeight: 18,
  },
});
}

