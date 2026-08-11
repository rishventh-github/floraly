import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFloraly } from "../context/FloralyContext";
import { useTheme } from "../context/ThemeContext";
import { MusicPicker } from "../components/MusicPicker";
import { LuckySlider } from "../components/LuckySlider";
import { classifyImage } from "../lib/communityClient";
import { NATURE_TAGS, REGIONS, assetUrl } from "../lib/constants";
import type {
  NatureTag,
  Region,
  ReelMusic,
  SpeciesCard,
} from "../lib/types";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";
import { Screen } from "../components/Screen";
import { FloralyTextInput } from "../components/FloralyTextInput";

type Props = NativeStackScreenProps<RootStackParamList, "EditReel">;

export function EditReelScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { postId } = route.params;
  const { getMyPost, updatePost, ready } = useFloraly();

  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [region, setRegion] = useState<Region | "">("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [music, setMusic] = useState<ReelMusic | null>(null);
  const [speciesSticker, setSpeciesSticker] = useState<SpeciesCard | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const found = getMyPost(postId);
    if (!found) {
      setHydrated(true);
      return;
    }
    setCaption(found.caption ?? "");
    setSelectedTags(found.tags);
    setRegion(found.region ?? "");
    setImagePreview(found.imageUrl);
    setMusic(found.music ?? null);
    setSpeciesSticker(found.speciesSticker ?? null);
    setHydrated(true);
  }, [ready, postId, getMyPost]);

  const toggleTag = (tag: NatureTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!imagePreview || selectedTags.length === 0 || !speciesSticker) {
      setError(
        !speciesSticker
          ? "Slide the lucky slider to attach a flora/fauna sticker before saving."
          : "Add at least one nature category."
      );
      return;
    }
    setError(null);
    setSubmitting(true);

    let finalTags = selectedTags;
    try {
      const data = await classifyImage({
        imageUrl: imagePreview.startsWith("http")
          ? imagePreview
          : imagePreview.startsWith("/")
            ? assetUrl(imagePreview)
            : imagePreview,
        caption: caption || undefined,
      });
      if (data.verdict === "rejected") {
        setError(data.reasons?.join(" ") ?? "Could not verify this photo.");
        setSubmitting(false);
        return;
      }
      if (data.tags.length > 0 && selectedTags.length === 0) {
        finalTags = data.tags.filter((t): t is NatureTag =>
          NATURE_TAGS.some((nt) => nt.id === t)
        );
      }
    } catch {
      /* keep manual tags */
    }

    updatePost(postId, {
      imageUrl: imagePreview,
      caption: caption || undefined,
      tags: finalTags.length > 0 ? finalTags : selectedTags,
      region: region || undefined,
      music: music || undefined,
      speciesSticker,
    });

    setSubmitting(false);
    navigation.goBack();
  };

  if (!ready || !hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.forest600} />
      </View>
    );
  }

  const existingPost = getMyPost(postId);
  if (!existingPost) {
    return (
      <View style={styles.loading}>
        <Text style={styles.title}>Reel not found</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to My Reels</Text>
        </Pressable>
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
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ My Reels</Text>
      </Pressable>
      <Text style={styles.title}>Edit reel</Text>
      <Text style={styles.subtitle}>
        Update caption, tags, music, or species sticker.
      </Text>

      {imagePreview ? (
        <Image
          source={{ uri: assetUrl(imagePreview) }}
          style={styles.preview}
          contentFit="cover"
        />
      ) : null}

      <Text style={styles.label}>Caption</Text>
      <FloralyTextInput
        value={caption}
        onChangeText={setCaption}
        style={styles.input}
        multiline
        placeholderTextColor={colors.stone400}
      />

      <Text style={styles.label}>Nature tags</Text>
      <View style={styles.tags}>
        {NATURE_TAGS.map((tag) => {
          const selected = selectedTags.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() => toggleTag(tag.id)}
              style={[
                styles.tag,
                {
                  backgroundColor: selected ? tag.selectedColor : tag.color,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.white : tag.selectedColor,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {tag.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Region</Text>
      <View style={styles.tags}>
        {REGIONS.map((r) => {
          const selected = region === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRegion(selected ? "" : r.id)}
              style={[styles.regionChip, selected && styles.regionSelected]}
            >
              <Text
                style={[
                  styles.regionText,
                  selected && { color: colors.white },
                ]}
              >
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MusicPicker value={music} onChange={setMusic} />
      <LuckySlider value={speciesSticker} onChange={setSpeciesSticker} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={[styles.saveBtn, submitting && { opacity: 0.5 }]}
      >
        <Text style={styles.saveText}>
          {submitting ? "Saving..." : "Save changes"}
        </Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream100,
    gap: 12,
  },
  back: { marginBottom: 8 },
  backText: { color: colors.stone500, fontSize: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.stone500 },
  link: { color: colors.forest600, fontWeight: "600" },
  preview: {
    marginTop: spacing.md,
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 16,
  },
  label: {
    marginTop: spacing.lg,
    fontSize: 13,
    fontWeight: "600",
    color: colors.forest700,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone200,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.forest800,
    minHeight: 80,
    textAlignVertical: "top",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  regionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  regionSelected: {
    backgroundColor: colors.forest600,
    borderColor: colors.forest600,
  },
  regionText: { fontSize: 13, color: colors.stone600, fontWeight: "500" },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: colors.rose50,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#BE123C", fontSize: 13 },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
}

