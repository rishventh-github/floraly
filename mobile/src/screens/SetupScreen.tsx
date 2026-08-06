import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFloraly } from "../context/FloralyContext";
import { NATURE_TAGS, REGIONS } from "../lib/constants";
import type { NatureTag, Region } from "../lib/types";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/colors";
import { Screen } from "../components/Screen";

export function SetupScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setOnboarding, preferences, ready } = useFloraly();
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | undefined>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setSelectedTags(preferences.selectedTags);
    setSelectedRegion(preferences.region);
    setHydrated(true);
  }, [ready, preferences.selectedTags, preferences.region]);

  const toggleTag = (tag: NatureTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!ready || !hydrated) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  const canContinue = selectedTags.length >= 1;

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
      <Text style={styles.title}>Your interests</Text>
      <Text style={styles.subtitle}>
        Tell us what nature you love - we'll tailor your feed accordingly.
      </Text>

      <Text style={styles.section}>What nature speaks to you?</Text>
      <Text style={styles.hint}>Pick at least 1 category.</Text>
      <View style={styles.grid}>
        {NATURE_TAGS.map((tag) => {
          const selected = selectedTags.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={[
                styles.tagCard,
                {
                  backgroundColor: selected ? tag.selectedColor : tag.color,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: selected ? colors.white : tag.selectedColor,
                }}
              >
                {tag.label}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: selected ? "rgba(255,255,255,0.85)" : colors.stone600,
                }}
              >
                {tag.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { marginTop: spacing.xl }]}>
        Your region{" "}
        <Text style={{ fontWeight: "400", color: colors.stone500 }}>
          (optional)
        </Text>
      </Text>
      <Text style={styles.hint}>
        We only use broad regions, never your exact location.
      </Text>
      <View style={styles.regions}>
        {REGIONS.map((region) => {
          const selected = selectedRegion === region.id;
          return (
            <Pressable
              key={region.id}
              onPress={() =>
                setSelectedRegion(selected ? undefined : region.id)
              }
              style={[styles.regionChip, selected && styles.regionSelected]}
            >
              <Text
                style={[
                  styles.regionText,
                  selected && { color: colors.white },
                ]}
              >
                {region.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={!canContinue}
        onPress={() => {
          setOnboarding(selectedTags, selectedRegion);
          navigation.goBack();
        }}
        style={[styles.continue, !canContinue && { opacity: 0.4 }]}
      >
        <Text style={styles.continueText}>
          {canContinue ? "Start exploring" : "Select at least 1 interest"}
        </Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
  },
  muted: { color: colors.stone500 },
  back: { marginBottom: 8 },
  backText: { color: colors.stone500, fontSize: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.stone500,
    lineHeight: 18,
  },
  section: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: "700",
    color: colors.forest800,
  },
  hint: { marginTop: 4, fontSize: 13, color: colors.stone500, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
  },
  regions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  regionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  regionSelected: {
    backgroundColor: colors.forest600,
    borderColor: colors.forest600,
  },
  regionText: { fontSize: 13, color: colors.stone600, fontWeight: "500" },
  continue: {
    marginTop: spacing.xl,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
