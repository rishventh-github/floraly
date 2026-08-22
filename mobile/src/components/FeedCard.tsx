import { memo, useEffect, useRef, useState, useMemo } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { loadSettings } from "../lib/auth";
import { NATURE_TAGS, REGIONS, assetUrl } from "../lib/constants";
import { addSpeciesToCollection } from "../lib/collection";
import { getRiskMeta, resolveSpeciesCard } from "../lib/speciesCatalog";
import { postStatsEvent } from "../lib/communityClient";
import {
  isPrivateReel,
  privateReelBadgeLabel,
} from "../lib/social";
import type { Comment, NaturePost } from "../lib/types";
import { isVideoPost } from "../lib/types";
import { type AppColors } from "../theme/colors";
import { FloralyTextInput } from "./FloralyTextInput";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

interface FeedCardProps {
  post: NaturePost;
  isLiked: boolean;
  onLike: () => void;
  onVisible?: () => void;
  isActive?: boolean;
  height?: number;
  ownerMode?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
}

function FeedCardComponent({
  post,
  isLiked,
  onLike,
  onVisible,
  isActive = false,
  height,
  ownerMode = false,
  onDelete,
  onEdit,
}: FeedCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { height: winH } = useWindowDimensions();
  const cardHeight = height ?? winH;
  const { settings, user } = useAuth();
  const speciesHuntOn = settings.speciesStickersEnabled;

  const [commentsAllowed, setCommentsAllowed] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(
    post.comments.map((c) => ({ ...c, likes: c.likes ?? 0 }))
  );
  const [newComment, setNewComment] = useState("");
  const [musicMuted, setMusicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(
    post.muteVideoAudio ?? !!post.music
  );
  const [stickerRevealed, setStickerRevealed] = useState(false);
  const [stickerPos, setStickerPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [collectMsg, setCollectMsg] = useState<string | null>(null);
  const [liked, setLiked] = useState(isLiked);
  const [heartBurst, setHeartBurst] = useState(false);
  const [badgeLabel, setBadgeLabel] = useState(
    isPrivateReel(post) ? "Private" : "Public"
  );
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const musicUrl = post.music?.previewUrl ?? null;
  const player = useAudioPlayer(musicUrl);
  const isVideo = isVideoPost(post);
  const hasMusic = !!musicUrl;
  const effectiveVideoMuted = videoMuted || (hasMusic && !musicMuted);
  const videoSource = post.videoUrl ? assetUrl(post.videoUrl) : null;
  const videoPlayer = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const speciesSticker = post.speciesSticker
    ? resolveSpeciesCard(post.speciesSticker)
    : null;

  const likeCount = post.likes + (liked ? 1 : 0);

  const tagLabels = post.tags
    .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label ?? t)
    .join(" · ");
  const regionLabel = post.region
    ? REGIONS.find((r) => r.id === post.region)?.label ?? post.region
    : null;

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked, post.id]);

  useEffect(() => {
    let cancelled = false;
    if (!isPrivateReel(post)) {
      setBadgeLabel("Public");
      return;
    }
    void privateReelBadgeLabel(post).then((label) => {
      if (!cancelled) setBadgeLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [post]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!post.authorId) {
        if (!cancelled) setCommentsAllowed(true);
        return;
      }
      if (user?.id === post.authorId) {
        if (!cancelled) setCommentsAllowed(settings.allowComments);
        return;
      }
      if (post.commentsEnabled === false) {
        if (!cancelled) setCommentsAllowed(false);
        return;
      }
      const authorSettings = await loadSettings(post.authorId);
      if (!cancelled) setCommentsAllowed(authorSettings.allowComments);
    })();
    return () => {
      cancelled = true;
    };
  }, [post.authorId, post.commentsEnabled, user?.id, settings.allowComments]);

  useEffect(() => {
    if (isActive) onVisible?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!speciesSticker || !speciesHuntOn) {
      setStickerRevealed(false);
      setStickerPos(null);
      return;
    }
    if (!isActive) {
      setStickerRevealed(false);
      setStickerPos(null);
      setSpeciesOpen(false);
      return;
    }

    const randomPos = () => ({
      top: 8 + Math.random() * 52,
      left: 4 + Math.random() * 68,
    });

    let moveTimer: ReturnType<typeof setInterval> | undefined;
    const revealTimer = setTimeout(() => {
      setStickerPos(randomPos());
      setStickerRevealed(true);
      moveTimer = setInterval(() => {
        setStickerPos(randomPos());
      }, 2000);
    }, 1500);

    return () => {
      clearTimeout(revealTimer);
      if (moveTimer !== undefined) clearInterval(moveTimer);
    };
  }, [isActive, speciesSticker, speciesHuntOn]);

  useEffect(() => {
    setVideoMuted(post.muteVideoAudio ?? !!post.music);
  }, [post.id, post.muteVideoAudio, post.music]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  }, []);

  useEffect(() => {
    if (!musicUrl) return;
    try {
      player.loop = true;
      player.volume = 1;
      if (isActive && !musicMuted) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      /* ignore playback errors */
    }
  }, [isActive, musicMuted, musicUrl, player]);

  useEffect(() => {
    if (!isVideo || !videoSource) return;
    try {
      videoPlayer.loop = true;
      videoPlayer.muted = effectiveVideoMuted;
      if (isActive) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    } catch {
      /* ignore */
    }
  }, [isActive, effectiveVideoMuted, isVideo, videoSource, videoPlayer]);

  const toggleVideoMute = () => {
    setVideoMuted((m) => {
      const next = !m;
      if (!next && hasMusic && !musicMuted) {
        setMusicMuted(true);
      }
      return next;
    });
  };

  const toggleMusicMute = () => {
    setMusicMuted((m) => {
      const next = !m;
      if (!next && isVideo) {
        setVideoMuted(true);
      }
      return next;
    });
  };

  const playHeartBurst = () => {
    setHeartBurst(true);
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 280,
        delay: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setHeartBurst(false));
  };

  const handleLikePress = () => {
    setLiked((prev) => !prev);
    onLike();
  };

  const handleDoubleTapLike = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      if (!liked) {
        setLiked(true);
        onLike();
      }
      playHeartBurst();
      return;
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    const text = post.caption
      ? `${post.caption} - shared from Floraly`
      : "Check out this nature moment on Floraly";
    try {
      await Share.share({ message: text, title: "Floraly" });
    } catch {
      /* cancelled */
    }
  };

  const handleAddComment = () => {
    if (!commentsAllowed || !newComment.trim()) return;
    const comment: Comment = {
      id: `c_${Date.now()}`,
      author: user?.displayName ?? "You",
      text: newComment.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      likes: 0,
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  const handleCollect = async () => {
    if (!user || !speciesSticker) return;
    const added = await addSpeciesToCollection(user.id, speciesSticker.id);
    if (added) {
      setCollectMsg("Added to your collection!");
      void postStatsEvent({
        type: "collect",
        userId: user.id,
        displayName: user.displayName,
        speciesId: speciesSticker.id,
        points: getRiskMeta(speciesSticker.riskLevel).points,
      });
    } else {
      setCollectMsg("Already in your collection.");
    }
    setTimeout(() => setCollectMsg(null), 2000);
  };

  const confirmDelete = () => {
    Alert.alert("Delete reel?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete?.(),
      },
    ]);
  };

  return (
    <View
      style={[styles.card, { height: cardHeight, maxHeight: cardHeight }]}
      collapsable={false}
    >
      {isVideo && videoSource ? (
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image
          source={{ uri: assetUrl(post.imageUrl) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          pointerEvents="none"
          recyclingKey={post.id}
          transition={0}
          cachePolicy="memory-disk"
        />
      )}
      <View style={styles.gradient} pointerEvents="none" />

      <Pressable
        onPress={handleDoubleTapLike}
        style={styles.tapCatcher}
        accessibilityLabel="Double tap to like"
      />

      {heartBurst ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.heartBurst, { transform: [{ scale: heartScale }] }]}
        >
          <Text style={styles.heartBurstIcon}>♥</Text>
        </Animated.View>
      ) : null}

      {speciesHuntOn && speciesSticker && stickerRevealed && stickerPos ? (
        <Pressable
          onPress={() => setSpeciesOpen(true)}
          style={[
            styles.sticker,
            {
              top: `${stickerPos.top}%`,
              left: `${stickerPos.left}%`,
            } as object,
          ]}
        >
          <Image
            source={{ uri: assetUrl(speciesSticker.imageUrl) }}
            style={styles.stickerImg}
            contentFit="cover"
          />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={handleLikePress} style={styles.actionBtn} hitSlop={10}>
          <View
            style={[
              styles.actionCircle,
              liked ? styles.likedCircle : styles.darkCircle,
            ]}
          >
            <Text style={[styles.actionIcon, liked && { color: colors.white }]}>
              {liked ? "♥" : "♡"}
            </Text>
          </View>
          <Text style={styles.actionLabel}>{likeCount}</Text>
        </Pressable>

        <Pressable onPress={() => setShowComments(true)} style={styles.actionBtn}>
          <View style={[styles.actionCircle, styles.darkCircle]}>
            <Text style={styles.actionIcon}>○</Text>
          </View>
          <Text style={styles.actionLabel}>{comments.length}</Text>
        </Pressable>

        <Pressable onPress={handleShare} style={styles.actionBtn}>
          <View style={[styles.actionCircle, styles.darkCircle]}>
            <Text style={styles.actionIcon}>↗</Text>
          </View>
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>

        {isVideo ? (
          <Pressable onPress={toggleVideoMute} style={styles.actionBtn}>
            <View style={[styles.actionCircle, styles.darkCircle]}>
              <Text style={styles.actionIcon}>
                {effectiveVideoMuted ? "×" : "◉"}
              </Text>
            </View>
            <Text style={styles.actionLabel}>
              {effectiveVideoMuted ? "Muted" : "Sound"}
            </Text>
          </Pressable>
        ) : null}

        {post.music?.previewUrl ? (
          <Pressable onPress={toggleMusicMute} style={styles.actionBtn}>
            <View style={[styles.actionCircle, styles.darkCircle]}>
              <Text style={styles.actionIcon}>{musicMuted ? "×" : "♪"}</Text>
            </View>
            <Text style={styles.actionLabel}>Music</Text>
          </Pressable>
        ) : null}

        {ownerMode && onEdit ? (
          <Pressable onPress={onEdit} style={styles.actionBtn}>
            <View style={[styles.actionCircle, styles.darkCircle]}>
              <Text style={styles.actionIcon}>✎</Text>
            </View>
            <Text style={styles.actionLabel}>Edit</Text>
          </Pressable>
        ) : null}

        {ownerMode && onDelete ? (
          <Pressable onPress={confirmDelete} style={styles.actionBtn}>
            <View style={[styles.actionCircle, styles.deleteCircle]}>
              <Text style={styles.actionIcon}>×</Text>
            </View>
            <Text style={styles.actionLabel}>Delete</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.info} pointerEvents="box-none">
        <View
          style={[
            styles.scopeBadge,
            isPrivateReel(post) ? styles.scopeBadgePrivate : styles.scopeBadgePublic,
          ]}
        >
          <Text
            style={[
              styles.scopeBadgeText,
              isPrivateReel(post)
                ? styles.scopeBadgeTextPrivate
                : styles.scopeBadgeTextPublic,
            ]}
          >
            {badgeLabel}
          </Text>
        </View>
        <View style={styles.authorRow}>
          {post.authorId ? (
            <Pressable
              onPress={() =>
                navigation.navigate("UserProfile", { userId: post.authorId! })
              }
              style={styles.authorPress}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.authorInitial}</Text>
              </View>
              <Text style={[styles.author, styles.authorLink]}>
                {post.author}
              </Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.authorInitial}</Text>
              </View>
              <Text style={styles.author}>{post.author}</Text>
            </>
          )}
        </View>
        {post.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : null}
        {post.music ? (
          <View style={styles.musicChip}>
            <Text style={styles.musicChipText} numberOfLines={1}>
              Music · {post.music.title} · {post.music.artist}
            </Text>
          </View>
        ) : null}
        <Text style={styles.meta}>
          {regionLabel ? `${tagLabels} · ${regionLabel}` : tagLabels}
        </Text>
      </View>

      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowComments(false)}
        />
        <View style={styles.commentsSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments ({comments.length})</Text>
            <Pressable onPress={() => setShowComments(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.commentsList}>
            {comments.length === 0 ? (
              <Text style={styles.emptyComments}>No comments yet.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Text style={styles.commentAuthor}>{c.author}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))
            )}
          </ScrollView>
          {commentsAllowed ? (
            <View style={styles.commentForm}>
              <FloralyTextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor={colors.stone400}
                style={styles.commentInput}
              />
              <Pressable
                onPress={handleAddComment}
                disabled={!newComment.trim()}
                style={[styles.postBtn, !newComment.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.postBtnText}>Post</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.commentsOff}>
              Comments are turned off for this reel.
            </Text>
          )}
        </View>
      </Modal>

      <Modal
        visible={speciesOpen && !!speciesSticker}
        animationType="fade"
        transparent
        onRequestClose={() => setSpeciesOpen(false)}
      >
        <Pressable
          style={styles.speciesBackdrop}
          onPress={() => setSpeciesOpen(false)}
        >
          {speciesSticker ? (
            <Pressable
              style={styles.speciesModal}
              onPress={(e) => e.stopPropagation()}
            >
              <Image
                source={{ uri: assetUrl(speciesSticker.imageUrl) }}
                style={styles.speciesHero}
                contentFit="cover"
              />
              <Text style={styles.speciesName}>{speciesSticker.name}</Text>
              <Text style={styles.speciesRisk}>
                {getRiskMeta(speciesSticker.riskLevel).label} ·{" "}
                {getRiskMeta(speciesSticker.riskLevel).points} pts
              </Text>
              <Text style={styles.speciesBlurb}>{speciesSticker.blurb}</Text>
              <Text style={styles.speciesHabitat}>{speciesSticker.habitat}</Text>
              {user ? (
                <Pressable onPress={handleCollect} style={styles.collectBtn}>
                  <Text style={styles.collectText}>Collect</Text>
                </Pressable>
              ) : null}
              {collectMsg ? (
                <Text style={styles.collectMsg}>{collectMsg}</Text>
              ) : null}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

export const FeedCard = memo(FeedCardComponent);

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: colors.forest950,
    overflow: "hidden",
  },
  tapCatcher: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  heartBurst: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 25,
  },
  heartBurstIcon: {
    fontSize: 88,
    color: "#F43F5E",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 12,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sticker: {
    position: "absolute",
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  stickerImg: { width: "100%", height: "100%" },
  actions: {
    position: "absolute",
    right: 16,
    bottom: 56,
    zIndex: 10,
    alignItems: "center",
    gap: 18,
  },
  actionBtn: { alignItems: "center", gap: 4 },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  darkCircle: { backgroundColor: "rgba(0,0,0,0.35)" },
  likedCircle: { backgroundColor: "rgba(244,63,94,0.8)" },
  deleteCircle: { backgroundColor: "rgba(244,63,94,0.7)" },
  actionIcon: { fontSize: 22, color: colors.white, fontWeight: "600" },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.white },
  info: {
    position: "absolute",
    left: 0,
    right: 72,
    bottom: 44,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  scopeBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  scopeBadgePrivate: { backgroundColor: "rgba(245, 158, 11, 0.92)" },
  scopeBadgePublic: { backgroundColor: "rgba(255,255,255,0.2)" },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scopeBadgeTextPrivate: { color: "#0B1F14" },
  scopeBadgeTextPublic: { color: "rgba(255,255,255,0.92)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorPress: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forest600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  author: { color: colors.white, fontWeight: "600", fontSize: 15 },
  authorLink: { textDecorationLine: "underline" },
  caption: { marginTop: 8, color: "rgba(255,255,255,0.9)", fontSize: 14 },
  musicChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  musicChipText: { color: colors.white, fontSize: 12, maxWidth: 220 },
  meta: { marginTop: 8, color: "rgba(255,255,255,0.6)", fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  commentsSheet: {
    backgroundColor: colors.cream50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone200,
  },
  sheetTitle: { fontWeight: "700", color: colors.forest800, fontSize: 16 },
  close: { color: colors.stone500, fontWeight: "600" },
  commentsList: { paddingHorizontal: 20, paddingTop: 12, maxHeight: 280 },
  emptyComments: { color: colors.stone400, fontSize: 13, paddingVertical: 20 },
  commentRow: { marginBottom: 14 },
  commentAuthor: { fontWeight: "700", color: colors.forest800, fontSize: 13 },
  commentText: { marginTop: 2, color: colors.stone600, fontSize: 13 },
  commentForm: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.forest800,
  },
  postBtn: {
    backgroundColor: colors.forest600,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  commentsOff: {
    padding: 16,
    color: colors.stone500,
    fontSize: 13,
    textAlign: "center",
  },
  speciesBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  speciesModal: {
    backgroundColor: colors.cream50,
    borderRadius: 20,
    padding: 18,
  },
  speciesHero: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    marginBottom: 12,
  },
  speciesName: { fontSize: 20, fontWeight: "700", color: colors.forest800 },
  speciesRisk: { marginTop: 4, color: colors.forest600, fontWeight: "600" },
  speciesBlurb: { marginTop: 10, color: colors.stone600, lineHeight: 20 },
  speciesHabitat: { marginTop: 8, color: colors.stone500, fontSize: 12 },
  collectBtn: {
    marginTop: 14,
    backgroundColor: colors.forest600,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  collectText: { color: colors.white, fontWeight: "700" },
  collectMsg: {
    marginTop: 8,
    textAlign: "center",
    color: colors.forest700,
    fontSize: 13,
  },
});
}

