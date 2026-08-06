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
import { IMAGE_INPUT_ACCEPT, loadImageAsDataUrl } from "@/lib/imageIngest";
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
import type { NatureTag, Region, ReelMusic, SpeciesCard } from "@/lib/types";

type ScanState = UploadScanState;

export default function UploadPage() {
  const router = useRouter();
  const { addPost } = useFloraly();
  const { user, settings } = useAuth();
  const [draftReady, setDraftReady] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const runClassification = async (
    imageData: string,
    fileName?: string,
    captionText?: string
  ) => {
    setScanState("scanning");
    setStatusMessage("Scanning photo for nature authenticity...");
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        : "Loading your photo..."
    );
    setClassification(null);
    setSelectedTags([]);
    setMusic(null);
    setSpeciesSticker(null);

    try {
      const { dataUrl, displayName, convertedFromHeic } =
        await loadImageAsDataUrl(file);
      setImagePreview(dataUrl);
      setFilename(displayName);
      setConverting(false);
      if (convertedFromHeic) {
        setStatusMessage("HEIC converted - scanning for nature authenticity...");
      }
      await runClassification(dataUrl, displayName, caption || undefined);
    } catch (err) {
      setConverting(false);
      setImagePreview(null);
      setFilename(undefined);
      setScanState("idle");
      setStatusMessage(null);
      setIngestError(
        err instanceof Error
          ? err.message
          : "Could not load this image. Try JPEG, PNG, or HEIC."
      );
    }
  };

  const clearImage = () => {
    setImagePreview(null);
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

  const sharePayload = () => ({
    imageUrl: imagePreview!,
    caption: caption || undefined,
    author: user?.displayName ?? "You",
    authorInitial: getInitials(user?.displayName ?? "You"),
    authorId: user?.id,
    tags: selectedTags,
    region: region || undefined,
    music: music ?? undefined,
    speciesSticker: speciesSticker!,
    commentsEnabled: settings.allowComments,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || selectedTags.length === 0 || !tagsEditable || !speciesSticker) return;

    setSubmitting(true);

    // User override: skip a second hard block so legitimate nature can still share
    if (scanState === "overridden") {
      addPost(sharePayload());
      if (user?.id) clearUploadDraft(user.id);
      setSubmitting(false);
      router.push("/my-reels");
      return;
    }

    setStatusMessage("Final safety check before sharing...");

    // Re-run classification at submit in case caption changed
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
        ...sharePayload(),
        tags: finalTags,
      });

      if (user?.id) clearUploadDraft(user.id);
      setSubmitting(false);
      router.push("/my-reels");
    } catch {
      setSubmitting(false);
      setStatusMessage(null);
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
          <h1 className="font-display text-2xl text-forest-800">Share a memory</h1>
          <p className="mt-1 text-sm text-stone-500">
            Real outdoor photos only. Sharing AI-generated or non-nature content goes against the experience and purpose of Floraly.
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
                  : "border-stone-300 bg-white hover:border-moss-400 hover:bg-cream-50"
            }`}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className={`h-full w-full rounded-2xl object-cover ${
                  scanState === "rejected" ? "opacity-70" : ""
                }`}
              />
            ) : (
              <>
                <p className="font-medium text-forest-700">Tap to add a photo</p>
                <p className="mt-1 px-6 text-center text-xs text-stone-400">
                  JPEG, PNG, WEBP, GIF, AVIF, or HEIC (iPhone)
                </p>
              </>
            )}
            <input
              type="file"
              accept={IMAGE_INPUT_ACCEPT}
              onChange={handleImageChange}
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
            <p className="text-sm text-forest-700">
              {statusMessage ?? "Loading your photo..."}
            </p>
          </div>
        )}

        {ingestError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="text-sm font-medium text-rose-800">Couldn&apos;t open image</p>
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
            <p className="text-sm font-medium text-forest-800">Photo approved</p>
            <p className="mt-1 text-xs text-forest-700">Checked locally.</p>
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm font-medium text-forest-700">
            Caption <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story behind this moment..."
            rows={3}
            disabled={scanState === "scanning"}
            className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-forest-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-forest-700">
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
          <label className="text-sm font-medium text-forest-700">
            Region <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | "")}
            disabled={scanState === "scanning"}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-forest-400 focus:outline-none disabled:opacity-50"
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

        <LuckyWheel
          value={speciesSticker}
          onChange={setSpeciesSticker}
          disabled={scanState === "scanning"}
        />

        <div className="mt-6 rounded-xl bg-moss-50 p-4 ring-1 ring-moss-200">
          <p className="text-xs text-forest-700">
            <span className="font-medium">Image classification:</span> Every upload is
            scanned for AI-generated media and non-nature content. Your exact location is
            never shared.
          </p>
        </div>

        {submitting && statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
            <p className="text-sm text-forest-700">{statusMessage}</p>
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
            <h2 id="nature-confirm-title" className="font-display text-xl text-forest-800">
              Confirm this is real nature
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Floraly is a calm place for real outdoor memories. By sharing, you help
              preserve that nature-first spirit - no AI slop, no off-topic photos, just
              the outdoors.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Please confirm this photo is a genuine nature / outdoor moment.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmNatureApproval}
                className="rounded-xl bg-forest-600 px-4 py-3 text-sm font-medium text-white hover:bg-forest-700"
              >
                Yes, it&apos;s a real nature photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNatureConfirm(false);
                  clearImage();
                }}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-forest-800 ring-1 ring-stone-200 hover:bg-cream-100"
              >
                Choose a different photo
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
            <h2 id="override-title" className="font-display text-xl text-forest-800">
              Upload this photo?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Please confirm this is a real outdoor nature memory.{" "}
              <span className="font-medium text-forest-800">
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
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-forest-800 ring-1 ring-stone-200 hover:bg-cream-100"
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
