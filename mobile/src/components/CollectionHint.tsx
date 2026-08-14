import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { STORAGE_KEYS } from "../lib/constants";
import { type AppColors, spacing } from "../theme/colors";

export function CollectionHint() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (settings.speciesStickersEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(
          STORAGE_KEYS.collectionHintDismissed
        );
        if (!cancelled) setDismissed(raw === "1");
      } catch {
        if (!cancelled) setDismissed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.speciesStickersEnabled]);

  if (settings.speciesStickersEnabled || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(STORAGE_KEYS.collectionHintDismissed, "1");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>🍀</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Try pop-up collection</Text>
        <Text style={styles.body}>
          Turn it on for fun: hunt flora and fauna stickers on reels, and use
          the lucky spinner when you share.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => updateSettings({ speciesStickersEnabled: true })}
            style={styles.turnOn}
          >
            <Text style={styles.turnOnText}>Turn on</Text>
          </Pressable>
          <Pressable onPress={dismiss} style={styles.later}>
            <Text style={styles.laterText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.cream50,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.moss300,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    emoji: { fontSize: 18, marginTop: 1 },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.forest800,
    },
    body: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: colors.stone500,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    turnOn: {
      backgroundColor: colors.forest600,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    turnOnText: { color: colors.white, fontWeight: "600", fontSize: 12 },
    later: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    laterText: { color: colors.stone500, fontWeight: "600", fontSize: 12 },
  });
}
