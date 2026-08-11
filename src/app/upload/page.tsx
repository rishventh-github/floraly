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
import { getInitials } from "@/lib/auth";
import { MusicPicker } from "@/components/MusicPicker";
import { LuckyWheel } from "@/components/LuckyWheel";
import {
  clearUploadDraft,
  loadUploadDraft,
  saveUploadDraft,
  type UploadScanState,
} from "@/lib/uploadDraft";
import type { MediaType, NatureTag, Region, ReelMusic, SpeciesCard } from "@/lib/types";

type ScanState = UploadScanState;

export default function UploadPage() {
  const router = useRouter();
  const { addPost } = useFloraly();
  const { user, settings } = useAuth();
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
        ? "Scanning video frame for nature authenticity..."
        : "Scanning photo for nature authenticity..."
    );
    setClassification(null);
    setSelectedTags([]);

    const localAnalysis = await analyzeImageLocally(imageData);
    setStatusMessage("Checking for AI-generated content & classifying scenery...");

    let visionImage = imageData;
    try {
      visionImage = await compressImageForVision(imageData);
    } catch {
      /* use original */
    }

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

      const data = (await res.json()) as ImageClassificationResult;

      if (data.verdict === "rejected") {
        setClassification(data);
        setScanState("rejected");
        setSelectedTags([]);
        setPendingHints(localAnalysis.dominantHints);
        setNatureConfirmed(false);
        setShowNatureConfirm(false);
        setStatusMessage(null);
        return;
      }

      setClassification(data);
      setScanState("approved");
      setSelectedTags(data.tags.length > 0 ? data.tags : localAnalysis.dominantHints);
      setPendingHints(localAnalysis.dominantHints);
      setNatureConfirmed(false);
      setShowNatureConfirm(true);
      setStatusMessage(null);
    } catch {
      // Fallback to local-only decision
      const { classifyLocally } = await import("@/lib/imageModeration");
      const local = classifyLocally({
        ...localAnalysis,
        caption: captionText,
        filename: fileName,
      });
      setClassification(local);
      setPendingHints(localAnalysis.dominantHints);
      if (local.verdict === "rejected") {
        setScanState("rejected");
        setSelectedTags([]);
        setNatureConfirmed(false);
        setShowNatureConfirm(false);
      } else {
        setScanState("approved");
        setSelectedTags(
          local.tags.length > 0 ? local.tags : localAnalysis.dominantHints
        );
        setNatureConfirmed(false);
        setShowNatureConfirm(true);
      }
      setStatusMessage(null);
    }
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
      setMediaType(media.kind);
      setImagePreview(media.posterUrl);
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
        setStatusMessage("HEIC converted - scanning for nature authenticity...");
      }
      await runClassification(
        media.posterUrl,
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
      setIngestError(
        err instanceof Error
          ? err.message
          : "Could not load this file. Try a photo or MP4/MOV video."
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
      speciesSticker: speciesSticker!,
      commentsEnabled: settings.allowComments,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || selectedTags.length === 0 || !tagsEditable || !speciesSticker)
      return;
    if (mediaType === "video" && !videoBlob && !videoPreview) return;

    setSubmitting(true);

    try {
      // User override: skip a second hard block so legitimate nature can still share
      if (scanState === "overridden") {
        addPost(await sharePayload());
        if (user?.id) clearUploadDraft(user.id);
        setSubmitting(false);
        router.push("/my-reels");
        return;
      }

      setStatusMessage("Final safety check before sharing...");

      // Re-run classification at submit in case caption changed (uses poster for video)
      const localAnalysis = await analyzeImageLocally(imagePreview);
      let visionImage = imagePreview;
      try {
        visionImage = await compressImageForVision(imagePreview);
      } catch {
        /* use original */
      }
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: visionImage,
            caption: caption || undefined,
            filename,
            localAnalysis,
          }),
        });
        const data = (await res.json()) as ImageClassificationResult;

        if (data.verdict === "rejected") {
          setClassification(data);
          setScanState("rejected");
          setNatureConfirmed(false);
          setPendingHints(localAnalysis.dominantHints);
          setSubmitting(false);
          setStatusMessage(null);
          return;
        }

        const finalTags =
          selectedTags.length > 0
            ? selectedTags
            : data.tags.length > 0
              ? data.tags
              : localAnalysis.dominantHints;

        if (finalTags.length === 0) {
          setSubmitting(false);
          setStatusMessage(null);
          return;
        }

        addPost({
          ...(await sharePayload()),
          tags: finalTags,
        });

        if (user?.id) clearUploadDraft(user.id);
        setSubmitting(false);
        router.push("/my-reels");
      } catch (err) {
        setSubmitting(false);
        setStatusMessage(null);
        if (err instanceof Error && err.message.includes("Video file is missing")) {
          setIngestError(err.message);
          return;
        }
        setClassification({
          verdict: "rejected",
          tags: [],
          isNature: false,
          isAiGenerated: false,
          confidence: 0.5,
          reasons: ["Could not verify this photo. Please try again."],
          rejectionCode: "unclear",
          source: "local",
        });
        setScanState("rejected");
        setNatureConfirmed(false);
      }
    } catch (err) {
      setSubmitting(false);
      setStatusMessage(null);
      setIngestError(
        err instanceof Error
          ? err.message
          : "Could not share this media. Please try again."
      );
    }
  };

  const canSubmit =
    !!imagePreview &&
    selectedTags.length > 0 &&
    tagsEditable &&
    !!speciesSticker &&
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
            <p className="text-sm font-medium text-rose-800">Couldn&apos;t open media</p>
            <p className="mt-1 text-sm text-rose-700">{ingestError}</p>
          </div>
        )}

        {scanState === "rejected" && classification && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm font-medium text-amber-900">Couldn&apos;t verify this photo</p>
            <p className="mt-1 text-sm text-amber-800">{rejectionMessage(classification)}</p>
            {classification.reasons.length > 1 && (
              <ul className="mt-2 list-inside list-disc text-xs text-amber-700">
                {classification.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-amber-700">
              Think this is a real nature photo? You can continue and confirm the upload.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(true)}
                className="rounded-xl bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={clearImage}
                className="text-sm font-medium text-amber-800 underline hover:text-amber-950"
              >
                Choose a different photo
              </button>
            </div>
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
            <p className="text-sm font-medium text-ink">Photo approved</p>
            <p className="mt-1 text-xs text-ink-muted">Checked locally.</p>
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

        <LuckyWheel
          value={speciesSticker}
          onChange={setSpeciesSticker}
          disabled={scanState === "scanning"}
        />

        <div className="mt-6 rounded-xl bg-moss-50 p-4 ring-1 ring-moss-200">
          <p className="text-xs text-ink-muted">
            <span className="font-medium">Media classification:</span> Every upload is
            scanned for AI-generated media and non-nature content. Videos are checked from a still frame. Your exact location is
            never shared.
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
              ? "Scanning photo..."
              : !speciesSticker
                ? "Slide for a sticker to share"
                : scanState === "rejected"
                  ? "Continue above to share anyway"
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
              Floraly is a calm place for real outdoor memories. By sharing, you help
              preserve that nature-first spirit - no AI slop, no off-topic photos, just
              the outdoors.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Please confirm this photo or video is a genuine nature / outdoor moment.
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
