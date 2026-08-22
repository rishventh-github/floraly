"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import {
  analyzeImageLocally,
  rejectionMessage,
  type ImageClassificationResult,
} from "@/lib/imageModeration";
import { compressImageForVision } from "@/lib/compressImage";
import {
  MEDIA_INPUT_ACCEPT,
  loadMediaFile,
} from "@/lib/imageIngest";
import { putMediaBlob } from "@/lib/mediaStore";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { getInitials } from "@/lib/auth";
import { MusicPicker } from "@/components/MusicPicker";
import { LuckyWheel } from "@/components/LuckyWheel";
import {
  clearUploadDraft,
  loadUploadDraft,
  saveUploadDraft,
  type UploadScanState,
} from "@/lib/uploadDraft";
import type { MediaType, NatureTag, PostVisibility, Region, ReelMusic, SpeciesCard } from "@/lib/types";

type ScanState = UploadScanState;

export default function UploadPage() {
  const router = useRouter();
  const { addPost } = useFloraly();
  const { user, settings } = useAuth();
  const { myGroups } = useSocial();
  const [draftReady, setDraftReady] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [muteVideoAudio, setMuteVideoAudio] = useState(true);
  const [filename, setFilename] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [region, setRegion] = useState<Region | "">("");
  const [music, setMusic] = useState<ReelMusic | null>(null);
  const [speciesSticker, setSpeciesSticker] = useState<SpeciesCard | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [classification, setClassification] =
    useState<ImageClassificationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [showNatureConfirm, setShowNatureConfirm] = useState(false);
  const [natureConfirmed, setNatureConfirmed] = useState(false);
  const [pendingHints, setPendingHints] = useState<NatureTag[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setDraftReady(false);
      return;
    }
    // Reset form when switching accounts, then restore that account's draft.
    setImagePreview(null);
    setVideoPreview(null);
    setMediaType("image");
    setVideoBlob(null);
    setMuteVideoAudio(true);
    setFilename(undefined);
    setCaption("");
    setSelectedTags([]);
    setRegion("");
    setMusic(null);
    setSpeciesSticker(null);
    setScanState("idle");
    setClassification(null);
    setNatureConfirmed(false);
    setPendingHints([]);
    setIngestError(null);
    setShowNatureConfirm(false);
    setShowOverrideConfirm(false);
    setDraftRestored(false);

    const draft = loadUploadDraft(user.id);
    if (draft) {
      setImagePreview(draft.imagePreview);
      setVideoPreview(draft.videoPreview ?? null);
      setMediaType(draft.mediaType ?? "image");
      setMuteVideoAudio(draft.muteVideoAudio ?? true);
      setFilename(draft.filename);
      setCaption(draft.caption ?? "");
      setSelectedTags(draft.selectedTags ?? []);
      setRegion(draft.region ?? "");
      setMusic(draft.music ?? null);
      setSpeciesSticker(draft.speciesSticker ?? null);
      const restoredScan =
        draft.scanState === "scanning" ? "idle" : (draft.scanState ?? "idle");
      setScanState(restoredScan);
      setClassification(draft.classification ?? null);
      setNatureConfirmed(draft.natureConfirmed ?? false);
      setPendingHints(draft.pendingHints ?? []);
      setIngestError(draft.ingestError);
      if (restoredScan === "approved" && !draft.natureConfirmed) {
        setShowNatureConfirm(true);
      }
      setDraftRestored(
        !!(
          draft.imagePreview ||
          draft.videoPreview ||
          draft.caption ||
          draft.selectedTags?.length ||
          draft.music ||
          draft.speciesSticker
        )
      );
    }
    setDraftReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!draftReady || submitting || !user?.id) return;
    saveUploadDraft(user.id, {
      imagePreview,
      videoPreview: mediaType === "video" ? videoPreview : null,
      mediaType,
      muteVideoAudio,
      filename,
      caption,
      selectedTags,
      region,
      music,
      speciesSticker,
      scanState: scanState === "scanning" ? "idle" : scanState,
      classification,
      natureConfirmed,
      pendingHints,
      ingestError,
    });
  }, [
    draftReady,
    submitting,
    user?.id,
    imagePreview,
    videoPreview,
    mediaType,
    muteVideoAudio,
    filename,
    caption,
    selectedTags,
    region,
    music,
    speciesSticker,
    scanState,
    classification,
    natureConfirmed,
    pendingHints,
    ingestError,
  ]);

  useEffect(() => {
    if (music && mediaType === "video") {
      setMuteVideoAudio(true);
    }
  }, [music, mediaType]);

  const runClassification = async (
    imageData: string,
    fileName?: string,
    captionText?: string,
    kind: MediaType = "image"
  ) => {
    setScanState("scanning");
    setStatusMessage(
      kind === "video"
        ? "Checking your video frame..."
        : "Checking your photo..."
    );
    setClassification(null);
    setSelectedTags([]);
    setNatureConfirmed(false);
    setShowNatureConfirm(false);
    setShowOverrideConfirm(false);

    const localAnalysis = await analyzeImageLocally(imageData);

    let visionImage = imageData;
    try {
      visionImage = await compressImageForVision(imageData);
    } catch {
      /* use original */
    }

    let data: ImageClassificationResult;
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: visionImage,
          caption: captionText,
          filename: fileName,
          localAnalysis,
        }),
      });
      data = (await res.json()) as ImageClassificationResult;
    } catch {
      const { classifyLocally } = await import("@/lib/imageModeration");
      data = classifyLocally({
        ...localAnalysis,
        caption: captionText,
        filename: fileName,
      });
    }

    const hintTags =
      data.tags.length > 0 ? data.tags : localAnalysis.dominantHints;
    setClassification(data);
    setPendingHints(localAnalysis.dominantHints);
    setSelectedTags(hintTags);
    // Soft local hints only — users always confirm real nature / non-AI.
    setScanState("approved");
    setNatureConfirmed(false);
    setShowNatureConfirm(true);
    setStatusMessage(null);
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later
    e.target.value = "";
    if (!file) return;

    setIngestError(null);
    setConverting(true);
    setScanState("scanning");
    setShowOverrideConfirm(false);
    setShowNatureConfirm(false);
    setNatureConfirmed(false);
    setPendingHints([]);
    setStatusMessage(
      file.name.match(/\.hei[cf]$/i)
        ? "Converting HEIC photo for the web..."
        : file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp)$/i.test(file.name)
          ? "Loading your video..."
          : "Loading your photo..."
    );
    setClassification(null);
    setSelectedTags([]);
    setMusic(null);
    setSpeciesSticker(null);
    if (videoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    setVideoBlob(null);

    try {
      const media = await loadMediaFile(file);
      let posterUrl = media.posterUrl;
      try {
        // Shrink phone photos so feed storage fits in the browser quota.
        posterUrl = await compressImageForVision(media.posterUrl, 1600, 0.82);
      } catch {
        /* keep original */
      }
      setMediaType(media.kind);
      setImagePreview(posterUrl);
      setFilename(media.displayName);
      if (media.kind === "video") {
        setVideoPreview(media.previewUrl);
        setVideoBlob(media.blob);
        setMuteVideoAudio(true);
      } else {
        setVideoPreview(null);
        setVideoBlob(null);
      }
      setConverting(false);
      if (media.convertedFromHeic) {
        setStatusMessage("HEIC converted - checking your photo...");
      }
      await runClassification(
        posterUrl,
        media.displayName,
        caption || undefined,
        media.kind
      );
    } catch (err) {
      setConverting(false);
      setImagePreview(null);
      setVideoPreview(null);
      setVideoBlob(null);
      setMediaType("image");
      setFilename(undefined);
      setScanState("idle");
      setStatusMessage(null);
      const raw =
        err instanceof Error
          ? err.message
          : "Could not load this file. Try a photo or MP4/MOV video.";
      const isQuota = /quota/i.test(raw);
      setIngestError(
        isQuota
          ? "This device is out of space for photos. Remove some older reels in My Reels, then try again."
          : raw
      );
    }
  };

  const clearImage = () => {
    if (videoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreview);
    }
    setImagePreview(null);
    setVideoPreview(null);
    setVideoBlob(null);
    setMediaType("image");
    setMuteVideoAudio(true);
    setFilename(undefined);
    setSelectedTags([]);
    setClassification(null);
    setScanState("idle");
    setStatusMessage(null);
    setIngestError(null);
    setShowOverrideConfirm(false);
    setShowNatureConfirm(false);
    setNatureConfirmed(false);
    setPendingHints([]);
    setMusic(null);
    setSpeciesSticker(null);
  };

  const confirmOverride = () => {
    setScanState("overridden");
    setShowOverrideConfirm(false);
    setNatureConfirmed(true);
    setSelectedTags((prev) =>
      prev.length > 0
        ? prev
        : classification?.tags?.length
          ? classification.tags
          : pendingHints
    );
    setStatusMessage(null);
  };

  const confirmNatureApproval = () => {
    setNatureConfirmed(true);
    setShowNatureConfirm(false);
  };

  const tagsEditable =
    (scanState === "approved" && natureConfirmed) || scanState === "overridden";

  const toggleTag = (tag: NatureTag) => {
    if (!tagsEditable) return;
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const sharePayload = async () => {
    const poster = imagePreview!;
    let videoUrl: string | undefined;
    if (mediaType === "video") {
      let blob = videoBlob;
      if (!blob && videoPreview?.startsWith("blob:")) {
        try {
          const res = await fetch(videoPreview);
          blob = await res.blob();
        } catch {
          blob = null;
        }
      }
      if (!blob) {
        throw new Error(
          "Video file is missing — please re-select your clip before sharing."
        );
      }
      const mediaKey = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      videoUrl = await putMediaBlob(mediaKey, blob);
    }
    return {
      imageUrl: poster,
      mediaType,
      videoUrl,
      muteVideoAudio:
        mediaType === "video" ? (music ? muteVideoAudio : false) : undefined,
      caption: caption || undefined,
      author: user?.displayName ?? "You",
      authorInitial: getInitials(user?.displayName ?? "You"),
      authorId: user?.id,
      tags: selectedTags,
      region: region || undefined,
      music: music ?? undefined,
      speciesSticker: speciesSticker ?? undefined,
      commentsEnabled: settings.allowComments,
      visibility,
      visibleToGroupIds:
        visibility === "circle" && selectedGroupIds.length > 0
          ? selectedGroupIds
          : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !imagePreview ||
      selectedTags.length === 0 ||
      !tagsEditable ||
      (settings.speciesStickersEnabled && !speciesSticker)
    )
      return;
    if (mediaType === "video" && !videoBlob && !videoPreview) return;

    setSubmitting(true);
    setStatusMessage("Sharing your memory...");

    try {
      addPost(await sharePayload());
      if (user?.id) clearUploadDraft(user.id);
      setSubmitting(false);
      setStatusMessage(null);
      router.push("/my-reels");
    } catch (err) {
      setSubmitting(false);
      setStatusMessage(null);
      const raw =
        err instanceof Error
          ? err.message
          : "Could not share this media. Please try again.";
      setIngestError(
        /quota/i.test(raw)
          ? "This device is out of space for photos. Remove some older reels in My Reels, then try again."
          : raw
      );
    }
  };

  const canSubmit =
    !!imagePreview &&
    selectedTags.length > 0 &&
    tagsEditable &&
    (!settings.speciesStickersEnabled || !!speciesSticker) &&
    (visibility === "public" || selectedGroupIds.length > 0) &&
    !submitting;

  return (
    <div className="min-h-dvh bg-cream-100" style={{ paddingBottom: "var(--nav-height)" }}>
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Link href="/home" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <h1 className="font-display text-2xl text-ink">Share a memory</h1>
          <p className="mt-1 text-sm text-stone-500">
            Real outdoor photos and videos only. Sharing AI-generated or non-nature content goes against the experience and purpose of Floraly.
          </p>
          {draftRestored && (
            <p className="mt-2 text-xs text-moss-700">
              Draft restored - pick up where you left off.
            </p>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-6 py-6">
        <div className="relative">
          <label
            className={`flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              scanState === "rejected"
                ? "border-amber-400 bg-amber-50"
                : imagePreview
                  ? "border-forest-400 bg-forest-50"
                  : "border-stone-300 bg-surface hover:border-moss-400 hover:bg-cream-50"
            }`}
          >
            {imagePreview ? (
              mediaType === "video" && videoPreview ? (
                <video
                  src={videoPreview}
                  className={`h-full w-full rounded-2xl object-cover ${
                    scanState === "rejected" ? "opacity-70" : ""
                  }`}
                  muted
                  playsInline
                  loop
                  autoPlay
                  controls={false}
                />
              ) : (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className={`h-full w-full rounded-2xl object-cover ${
                    scanState === "rejected" ? "opacity-70" : ""
                  }`}
                />
              )
            ) : (
              <>
                <p className="font-medium text-ink-muted">Tap to add a photo or video</p>
                <p className="mt-1 px-6 text-center text-xs text-stone-400">
                  Photos: JPEG, PNG, WEBP, GIF, AVIF, HEIC · Videos: MP4, MOV, WEBM (max 40MB)
                </p>
              </>
            )}
            <input
              type="file"
              accept={MEDIA_INPUT_ACCEPT}
              onChange={handleMediaChange}
              className="hidden"
            />
          </label>

          {imagePreview && (
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/70"
            >
              Remove
            </button>
          )}
        </div>

        {(scanState === "scanning" || converting) && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-forest-50 px-4 py-3 ring-1 ring-forest-100">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
            <p className="text-sm text-ink-muted">
              {statusMessage ?? "Loading your photo..."}
            </p>
          </div>
        )}

        {ingestError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="text-sm font-medium text-rose-800">
              {/storage|space|quota/i.test(ingestError)
                ? "Storage is full"
                : "Couldn\u2019t open media"}
            </p>
            <p className="mt-1 text-sm text-rose-700">{ingestError}</p>
          </div>
        )}

        {classification?.verdict === "rejected" &&
          !natureConfirmed &&
          scanState === "approved" && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm font-medium text-amber-900">
              Quick heads-up before you confirm
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {rejectionMessage(classification)} You can still continue if this
              is a real outdoor nature moment.
            </p>
          </div>
        )}

        {scanState === "overridden" && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm font-medium text-amber-900">Uploading with your confirmation</p>
            <p className="mt-1 text-xs text-amber-800">
              You confirmed this is a real outdoor nature photo. Pick at least one category below, then share.
            </p>
          </div>
        )}

        {scanState === "approved" && natureConfirmed && (
          <div className="mt-4 rounded-xl bg-moss-50 p-4 ring-1 ring-moss-200">
            <p className="text-sm font-medium text-ink">Ready to share</p>
            <p className="mt-1 text-xs text-ink-muted">
              Thanks for confirming this is a real nature moment.
            </p>
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm font-medium text-ink-muted">
            Caption <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story behind this moment..."
            rows={3}
            disabled={scanState === "scanning"}
            className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-ink-muted">
            What type of nature is this?
          </label>
          {tagsEditable && selectedTags.length > 0 && (
            <p className="mt-1 text-xs text-moss-600">
              You can adjust the categories that fit this photo.
            </p>
          )}
          {!tagsEditable && scanState !== "idle" && (
            <p className="mt-1 text-xs text-stone-400">
              Categories unlock after you confirm this is a real nature photo.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {NATURE_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag.id);
              const locked = !tagsEditable;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  disabled={locked}
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected ? tag.chipSelectedClass : tag.chipClass
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-ink-muted">
            Region <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | "")}
            disabled={scanState === "scanning"}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">None (prefer not to say)</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <MusicPicker
          value={music}
          onChange={setMusic}
          disabled={scanState === "scanning"}
        />

        {mediaType === "video" && music && (
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-forest-50 px-4 py-3 ring-1 ring-forest-100">
            <input
              type="checkbox"
              checked={muteVideoAudio}
              onChange={(e) => setMuteVideoAudio(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Mute video audio while music plays
              </span>
              <span className="mt-0.5 block text-xs text-stone-500">
                Keep this on so the soundtrack is clear. Viewers can unmute the clip in the feed.
              </span>
            </span>
          </label>
        )}

        {mediaType === "video" && !music && (
          <p className="mt-3 text-xs text-stone-500">
            Video audio will play in the feed. Add optional music above if you want a soundtrack — you can mute the clip so they don&apos;t overlap.
          </p>
        )}

        {settings.speciesStickersEnabled ? (
          <LuckyWheel
            value={speciesSticker}
            onChange={setSpeciesSticker}
            disabled={scanState === "scanning"}
          />
        ) : (
          <p className="mt-6 rounded-xl bg-forest-50 px-4 py-3 text-xs text-stone-500 ring-1 ring-moss-200">
            Lucky spinner is off. Turn on pop-up collection in Settings if you
            want to hunt stickers for fun.
          </p>
        )}

        <div className="mt-6">
          <p className="text-sm font-medium text-ink-muted">Who can see this?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setVisibility("public");
                setSelectedGroupIds([]);
              }}
              disabled={scanState === "scanning"}
              className={`rounded-xl px-3 py-3 text-left text-sm transition ${
                visibility === "public"
                  ? "bg-forest-600 text-white"
                  : "bg-surface text-ink ring-1 ring-stone-200 hover:bg-cream-50"
              }`}
            >
              <span className="block font-medium">Public</span>
              <span
                className={`mt-0.5 block text-xs ${
                  visibility === "public" ? "text-white/80" : "text-stone-500"
                }`}
              >
                Anyone on Floraly
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("circle")}
              disabled={scanState === "scanning"}
              className={`rounded-xl px-3 py-3 text-left text-sm transition ${
                visibility === "circle"
                  ? "bg-forest-600 text-white"
                  : "bg-surface text-ink ring-1 ring-stone-200 hover:bg-cream-50"
              }`}
            >
              <span className="block font-medium">Groups</span>
              <span
                className={`mt-0.5 block text-xs ${
                  visibility === "circle" ? "text-white/80" : "text-stone-500"
                }`}
              >
                Pick one or more groups
              </span>
            </button>
          </div>
          {visibility === "circle" && (
            <div className="mt-3 rounded-xl bg-surface p-3 ring-1 ring-stone-200">
              <p className="text-xs font-medium text-ink-muted">
                Send this reel to
              </p>
              {myGroups.length === 0 ? (
                <p className="mt-2 text-xs text-stone-500">
                  No groups yet. Create one in{" "}
                  <Link href="/groups" className="text-forest-600 underline">
                    Groups
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {myGroups.map((group) => {
                    const on = selectedGroupIds.includes(group.id);
                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          disabled={scanState === "scanning"}
                          onClick={() =>
                            setSelectedGroupIds((prev) =>
                              on
                                ? prev.filter((id) => id !== group.id)
                                : [...prev, group.id]
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            on
                              ? "bg-forest-50 ring-1 ring-forest-200"
                              : "hover:bg-cream-50"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {group.name}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {group.memberIds.length} member
                              {group.memberIds.length === 1 ? "" : "s"}
                            </span>
                          </span>
                          <span className="text-xs text-stone-500">
                            {on ? "Selected" : "Select"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {myGroups.length > 0 && selectedGroupIds.length === 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  Select at least one group to share privately.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-moss-50 p-4 ring-1 ring-moss-200">
          <p className="text-xs text-ink-muted">
            <span className="font-medium">Nature-first sharing:</span> Floraly
            runs a quick local check, then asks you to confirm every upload is a
            real outdoor moment — not AI-generated or off-topic. Your exact
            location is never shared.
          </p>
        </div>

        {submitting && statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
            <p className="text-sm text-ink-muted">{statusMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-2xl bg-forest-600 py-4 font-medium text-white transition-all hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? "Sharing..."
            : scanState === "scanning"
              ? "Checking photo..."
              : settings.speciesStickersEnabled && !speciesSticker
                ? "Slide for a sticker to share"
                : !natureConfirmed && scanState === "approved"
                  ? "Confirm above to share"
                  : "Share with the community"}
        </button>
      </form>

      {showNatureConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nature-confirm-title"
            className="w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-xl ring-1 ring-stone-200"
          >
            <h2 id="nature-confirm-title" className="font-display text-xl text-ink">
              Confirm this is real nature
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Floraly is for real outdoor memories only. Please confirm this is a
              genuine nature / outdoor moment — not AI-generated, and not
              off-topic.
            </p>
            {classification?.verdict === "rejected" && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                Our quick local check was unsure ({rejectionMessage(classification)}
                ). Only continue if you know this is real nature.
              </p>
            )}
            <p className="mt-2 text-sm text-stone-500">
              You&apos;ll always see this confirmation before sharing.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmNatureApproval}
                className="rounded-xl bg-forest-600 px-4 py-3 text-sm font-medium text-white hover:bg-forest-700"
              >
                Yes, it&apos;s a real nature moment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNatureConfirm(false);
                  clearImage();
                }}
                className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink ring-1 ring-stone-200 hover:bg-cream-100"
              >
                Choose different media
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverrideConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="override-title"
            className="w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-xl ring-1 ring-stone-200"
          >
            <h2 id="override-title" className="font-display text-xl text-ink">
              Upload this photo?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Please confirm this is a real outdoor nature memory.{" "}
              <span className="font-medium text-ink">
                AI-generated and non-nature-related photos are discouraged
              </span>{" "}
              and can hurt the experience for everyone on Floraly.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Only continue if you believe our checker flagged this by mistake.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmOverride}
                className="rounded-xl bg-forest-600 px-4 py-3 text-sm font-medium text-white hover:bg-forest-700"
              >
                Yes, upload this photo
              </button>
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(false)}
                className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink ring-1 ring-stone-200 hover:bg-cream-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
