import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFloraly } from "../context/FloralyContext";
import { MusicPicker } from "../components/MusicPicker";
import { LuckySlider } from "../components/LuckySlider";
import { Screen } from "../components/Screen";
import { getInitials } from "../lib/auth";
import { classifyImage } from "../lib/communityClient";
import { NATURE_TAGS, REGIONS, STORAGE_KEYS } from "../lib/constants";
import type {
  MediaType,
  NatureTag,
  Region,
  ReelMusic,
  SpeciesCard,
} from "../lib/types";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";
import { FloralyTextInput } from "../components/FloralyTextInput";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Share">,
  NativeStackNavigationProp<RootStackParamList>
>;

type ScanState = "idle" | "scanning" | "approved" | "rejected" | "overridden";

interface Draft {
  imagePreview: string | null;
  videoPreview: string | null;
  mediaType: MediaType;
  muteVideoAudio: boolean;
  caption: string;
  selectedTags: NatureTag[];
  region: Region | "";
  music: ReelMusic | null;
  speciesSticker: SpeciesCard | null;
  scanState: ScanState;
  natureConfirmed: boolean;
}

export function ShareScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const { addPost } = useFloraly();
  const { user, settings } = useAuth();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [muteVideoAudio, setMuteVideoAudio] = useState(true);
  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [region, setRegion] = useState<Region | "">("");
  const [music, setMusic] = useState<ReelMusic | null>(null);
  const [speciesSticker, setSpeciesSticker] = useState<SpeciesCard | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [natureConfirmed, setNatureConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [pendingHints, setPendingHints] = useState<NatureTag[]>([]);
  const [showNatureConfirm, setShowNatureConfirm] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const previewPlayer = useVideoPlayer(videoPreview, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (mediaType === "video" && videoPreview && scanState !== "scanning") {
      try {
        previewPlayer.play();
      } catch {
        /* ignore */
      }
    } else {
      try {
        previewPlayer.pause();
      } catch {
        /* ignore */
      }
    }
  }, [mediaType, videoPreview, scanState, previewPlayer]);

  useEffect(() => {
    if (music && mediaType === "video") {
      setMuteVideoAudio(true);
    }
  }, [music, mediaType]);

  useEffect(() => {
    if (!user?.id) {
      setDraftReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(
          `${STORAGE_KEYS.uploadDraft}_${user.id}`
        );
        if (raw && !cancelled) {
          const draft = JSON.parse(raw) as Draft;
          setImagePreview(draft.imagePreview);
          setVideoPreview(draft.videoPreview ?? null);
          setMediaType(draft.mediaType ?? "image");
          setMuteVideoAudio(draft.muteVideoAudio ?? true);
          setCaption(draft.caption ?? "");
          setSelectedTags(draft.selectedTags ?? []);
          setRegion(draft.region ?? "");
          setMusic(draft.music ?? null);
          setSpeciesSticker(draft.speciesSticker ?? null);
          const restoredScan =
            draft.scanState === "scanning" ? "idle" : draft.scanState ?? "idle";
          setScanState(restoredScan);
          setNatureConfirmed(draft.natureConfirmed ?? false);
          if (restoredScan === "approved" && !draft.natureConfirmed) {
            setShowNatureConfirm(true);
          }
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!draftReady || submitting || !user?.id) return;
    const draft: Draft = {
      imagePreview,
      videoPreview,
      mediaType,
      muteVideoAudio,
      caption,
      selectedTags,
      region,
      music,
      speciesSticker,
      scanState: scanState === "scanning" ? "idle" : scanState,
      natureConfirmed,
    };
    void AsyncStorage.setItem(
      `${STORAGE_KEYS.uploadDraft}_${user.id}`,
      JSON.stringify(draft)
    );
  }, [
    draftReady,
    submitting,
    user?.id,
    imagePreview,
    videoPreview,
    mediaType,
    muteVideoAudio,
    caption,
    selectedTags,
    region,
    music,
    speciesSticker,
    scanState,
    natureConfirmed,
  ]);

  const clearImage = () => {
    setImagePreview(null);
    setVideoPreview(null);
    setMediaType("image");
    setMuteVideoAudio(true);
    setSelectedTags([]);
    setScanState("idle");
    setStatusMessage(null);
    setRejectReason(null);
    setShowOverrideConfirm(false);
    setShowNatureConfirm(false);
    setNatureConfirmed(false);
    setPendingHints([]);
    setMusic(null);
    setSpeciesSticker(null);
  };

  const runClassify = async (
    uri: string,
    captionText?: string,
    kind: MediaType = "image"
  ) => {
    setScanState("scanning");
    setStatusMessage(
      kind === "video"
        ? "Scanning video frame for nature authenticity..."
        : "Scanning photo for nature authenticity..."
    );
    setRejectReason(null);
    setSelectedTags([]);
    setNatureConfirmed(false);
    setShowNatureConfirm(false);
    setShowOverrideConfirm(false);
    setPendingHints([]);

    const result = await classifyImage({
      imageUrl: uri,
      caption: captionText,
    });

    if (result.verdict === "rejected") {
      setScanState("rejected");
      setRejectReason(
        result.reasons?.join(" ") ?? "Could not verify this media."
      );
      setNatureConfirmed(false);
      setShowNatureConfirm(false);
      setStatusMessage(null);
      return;
    }

    const tags = (result.tags ?? []).filter((t): t is NatureTag =>
      NATURE_TAGS.some((nt) => nt.id === t)
    );
    setSelectedTags(tags);
    setPendingHints(tags);
    setScanState("approved");
    setNatureConfirmed(false);
    setShowNatureConfirm(true);
    setStatusMessage(null);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setRejectReason("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      videoMaxDuration: 60,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const isVideo =
      asset.type === "video" ||
      /\.(mp4|mov|m4v|webm|3gp)$/i.test(asset.uri) ||
      (asset.mimeType?.startsWith("video/") ?? false);

    setMusic(null);
    setSpeciesSticker(null);

    if (isVideo) {
      setMediaType("video");
      setVideoPreview(asset.uri);
      setMuteVideoAudio(true);
      setStatusMessage("Loading your video...");
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 250,
          quality: 0.8,
        });
        setImagePreview(thumb.uri);
        await runClassify(thumb.uri, caption || undefined, "video");
      } catch {
        setImagePreview(asset.uri);
        setRejectReason(
          "Couldn't capture a video frame for scanning. Try another clip."
        );
        setScanState("idle");
        setStatusMessage(null);
      }
      return;
    }

    setMediaType("image");
    setVideoPreview(null);
    const dataUrl = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;
    setImagePreview(dataUrl);
    setStatusMessage("Loading your photo...");
    await runClassify(dataUrl, caption || undefined, "image");
  };

  const confirmNatureApproval = () => {
    setNatureConfirmed(true);
    setShowNatureConfirm(false);
  };

  const confirmOverride = () => {
    setScanState("overridden");
    setShowOverrideConfirm(false);
    setNatureConfirmed(true);
    setSelectedTags((prev) => (prev.length > 0 ? prev : pendingHints));
    setStatusMessage(null);
  };

  const tagsEditable =
    (scanState === "approved" && natureConfirmed) || scanState === "overridden";

  const toggleTag = (tag: NatureTag) => {
    if (!tagsEditable) return;
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearDraft = async () => {
    if (user?.id) {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.uploadDraft}_${user.id}`);
    }
  };

  const handleShare = async () => {
    if (
      !imagePreview ||
      selectedTags.length === 0 ||
      !tagsEditable ||
      !speciesSticker ||
      !user
    ) {
      return;
    }
    if (mediaType === "video" && !videoPreview) return;
    setSubmitting(true);

    if (scanState !== "overridden") {
      setStatusMessage("Final safety check...");
      const result = await classifyImage({
        imageUrl: imagePreview,
        caption: caption || undefined,
      });
      if (result.verdict === "rejected") {
        setScanState("rejected");
        setRejectReason(
          result.reasons?.join(" ") ?? "Could not verify this media."
        );
        setNatureConfirmed(false);
        setShowNatureConfirm(false);
        setSubmitting(false);
        setStatusMessage(null);
        return;
      }
    }

    addPost({
      imageUrl: imagePreview,
      mediaType,
      videoUrl: mediaType === "video" ? videoPreview ?? undefined : undefined,
      muteVideoAudio:
        mediaType === "video" ? (music ? muteVideoAudio : false) : undefined,
      caption: caption || undefined,
      author: user.displayName,
      authorInitial: getInitials(user.displayName),
      authorId: user.id,
      tags: selectedTags,
      region: region || undefined,
      music: music ?? undefined,
      speciesSticker,
      commentsEnabled: settings.allowComments,
    });

    await clearDraft();
    clearImage();
    setCaption("");
    setRegion("");
    setSubmitting(false);
    setStatusMessage(null);
    navigation.navigate("MyReels");
  };

  const canSubmit =
    !!imagePreview &&
    (mediaType === "image" || !!videoPreview) &&
    selectedTags.length > 0 &&
    tagsEditable &&
    !!speciesSticker &&
    !submitting;

  const shareLabel = submitting
    ? "Sharing..."
    : scanState === "scanning"
      ? "Scanning photo..."
      : !speciesSticker
        ? "Slide for a sticker to share"
        : scanState === "rejected"
          ? "Continue above to share anyway"
          : !tagsEditable
            ? "Confirm photo to continue"
            : "Share with the community";

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Share a memory</Text>
        <Text style={styles.subtitle}>
          Real outdoor photos and videos only. AI-generated or off-topic uploads
          go against Floraly.
        </Text>

        <Pressable
          onPress={pickMedia}
          style={styles.pickArea}
          disabled={scanState === "scanning"}
        >
          {imagePreview ? (
            mediaType === "video" && videoPreview ? (
              <VideoView
                player={previewPlayer}
                style={styles.preview}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: imagePreview }}
                style={styles.preview}
                contentFit="cover"
              />
            )
          ) : (
            <View style={styles.pickEmpty}>
              <Text style={styles.pickTitle}>Tap to add a photo or video</Text>
              <Text style={styles.pickHint}>Photos or short clips</Text>
            </View>
          )}
        </Pressable>

        {imagePreview ? (
          <Pressable onPress={clearImage} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove media</Text>
          </Pressable>
        ) : null}

        {scanState === "scanning" ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.forest600} />
            <Text style={styles.statusText}>
              {statusMessage ?? "Scanning photo for nature authenticity..."}
            </Text>
          </View>
        ) : null}

        {submitting && statusMessage ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.forest600} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        {scanState === "rejected" ? (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectTitle}>Couldn't verify this photo</Text>
            <Text style={styles.rejectBody}>{rejectReason}</Text>
            <Text style={styles.rejectHint}>
              Think this is a real nature photo? You can continue and confirm
              the upload.
            </Text>
            <View style={styles.rejectActions}>
              <Pressable
                onPress={() => setShowOverrideConfirm(true)}
                style={styles.overrideBtn}
              >
                <Text style={styles.overrideText}>Continue</Text>
              </Pressable>
              <Pressable onPress={clearImage}>
                <Text style={styles.chooseOther}>Choose a different photo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {scanState === "overridden" ? (
          <View style={styles.overrideBox}>
            <Text style={styles.overrideTitle}>
              Uploading with your confirmation
            </Text>
            <Text style={styles.overrideBody}>
              You confirmed this is a real outdoor nature photo. Pick at least
              one category below, then share.
            </Text>
          </View>
        ) : null}

        {scanState === "approved" && natureConfirmed ? (
          <View style={styles.okBox}>
            <Text style={styles.okTitle}>Photo approved</Text>
            <Text style={styles.okBody}>
              Confirmed as a real nature / outdoor moment.
            </Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Caption</Text>
          <FloralyTextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="What made this moment special?"
            placeholderTextColor={colors.stone400}
            style={styles.input}
            multiline
            editable={scanState !== "scanning"}
          />
        </View>

        <Text style={styles.label}>Nature tags</Text>
        {!tagsEditable && scanState !== "idle" ? (
          <Text style={styles.lockHint}>
            Categories unlock after you confirm this is a real nature photo.
          </Text>
        ) : null}
        <View style={styles.tags}>
          {NATURE_TAGS.map((tag) => {
            const selected = selectedTags.includes(tag.id);
            return (
              <Pressable
                key={tag.id}
                disabled={!tagsEditable}
                onPress={() => toggleTag(tag.id)}
                style={[
                  styles.tag,
                  {
                    backgroundColor: selected ? tag.selectedColor : tag.color,
                    opacity: tagsEditable ? 1 : 0.5,
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
                disabled={scanState === "scanning"}
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

        {mediaType === "video" && music ? (
          <Pressable
            onPress={() => setMuteVideoAudio((v) => !v)}
            style={styles.muteRow}
          >
            <View
              style={[styles.checkbox, muteVideoAudio && styles.checkboxOn]}
            >
              {muteVideoAudio ? (
                <Text style={styles.checkboxMark}>✓</Text>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muteTitle}>
                Mute video audio while music plays
              </Text>
              <Text style={styles.muteHint}>
                Keep soundtrack clear. Viewers can unmute the clip in the feed.
              </Text>
            </View>
          </Pressable>
        ) : null}

        {mediaType === "video" && !music ? (
          <Text style={styles.muteHintAlone}>
            Video audio will play in the feed. Add music if you want a
            soundtrack — you can mute the clip so they don't overlap.
          </Text>
        ) : null}

        <LuckySlider value={speciesSticker} onChange={setSpeciesSticker} />

        <Pressable
          onPress={handleShare}
          disabled={!canSubmit}
          style={[styles.shareBtn, !canSubmit && { opacity: 0.4 }]}
        >
          <Text style={styles.shareText}>{shareLabel}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showNatureConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowNatureConfirm(false);
          clearImage();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm this is real nature</Text>
            <Text style={styles.modalBody}>
              Floraly is a calm place for real outdoor memories. By sharing, you
              help preserve that nature-first spirit - no AI slop, no off-topic
              photos, just the outdoors.
            </Text>
            <Text style={styles.modalHint}>
              Please confirm this photo is a genuine nature / outdoor moment.
            </Text>
            <Pressable
              onPress={confirmNatureApproval}
              style={styles.modalPrimary}
            >
              <Text style={styles.modalPrimaryText}>
                Yes, it's a real nature photo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowNatureConfirm(false);
                clearImage();
              }}
              style={styles.modalSecondary}
            >
              <Text style={styles.modalSecondaryText}>
                Choose a different photo
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showOverrideConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverrideConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upload this photo?</Text>
            <Text style={styles.modalBody}>
              Please confirm this is a real outdoor nature memory. AI-generated
              and non-nature-related photos are discouraged and can hurt the
              experience for everyone on Floraly.
            </Text>
            <Text style={styles.modalHint}>
              Only continue if you believe our checker flagged this by mistake.
            </Text>
            <Pressable onPress={confirmOverride} style={styles.modalPrimary}>
              <Text style={styles.modalPrimaryText}>Yes, upload this photo</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowOverrideConfirm(false)}
              style={styles.modalSecondary}
            >
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.stone500,
    lineHeight: 18,
  },
  pickArea: {
    marginTop: spacing.lg,
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.stone200,
    backgroundColor: colors.surface,
  },
  preview: { width: "100%", height: "100%" },
  pickEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  pickTitle: { fontWeight: "600", color: colors.forest700 },
  pickHint: { marginTop: 4, fontSize: 12, color: colors.stone400 },
  removeBtn: { alignSelf: "center", marginTop: 10 },
  removeText: { color: colors.rose500, fontWeight: "600", fontSize: 13 },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.cream50,
    padding: 12,
    borderRadius: 12,
  },
  statusText: { color: colors.forest700, fontSize: 13, flex: 1 },
  rejectBox: {
    marginTop: 12,
    backgroundColor: colors.amber50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  rejectTitle: { fontWeight: "700", color: "#92400E" },
  rejectBody: { marginTop: 4, color: "#B45309", fontSize: 13 },
  rejectHint: { marginTop: 10, color: "#B45309", fontSize: 12 },
  rejectActions: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
  },
  overrideBtn: {
    backgroundColor: colors.forest600,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  overrideText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  chooseOther: {
    color: "#92400E",
    fontWeight: "600",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  overrideBox: {
    marginTop: 12,
    backgroundColor: colors.amber50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  overrideTitle: { fontWeight: "700", color: "#92400E" },
  overrideBody: { marginTop: 4, color: "#B45309", fontSize: 12 },
  okBox: {
    marginTop: 12,
    backgroundColor: colors.moss300,
    borderRadius: 12,
    padding: 12,
  },
  okTitle: { fontWeight: "600", color: colors.forest800 },
  okBody: { marginTop: 4, fontSize: 12, color: colors.forest700 },
  field: { marginTop: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.forest700,
    marginBottom: 8,
  },
  lockHint: {
    marginBottom: 8,
    fontSize: 12,
    color: colors.stone500,
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
  shareBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  shareText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.cream50,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.forest800,
  },
  modalBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.stone600,
  },
  modalHint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.stone500,
  },
  modalPrimary: {
    marginTop: 20,
    backgroundColor: colors.forest600,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  modalSecondary: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  modalSecondaryText: {
    color: colors.forest800,
    fontWeight: "600",
    fontSize: 14,
  },
  muteRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.cream50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.stone400,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.forest600,
    borderColor: colors.forest600,
  },
  checkboxMark: { color: colors.white, fontSize: 12, fontWeight: "700" },
  muteTitle: { fontSize: 14, fontWeight: "600", color: colors.forest800 },
  muteHint: { marginTop: 2, fontSize: 12, color: colors.stone500, lineHeight: 16 },
  muteHintAlone: {
    marginTop: 10,
    fontSize: 12,
    color: colors.stone500,
    lineHeight: 16,
  },
});
}

