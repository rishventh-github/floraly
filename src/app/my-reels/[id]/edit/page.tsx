"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import {
  analyzeImageLocally,
  rejectionMessage,
  type ImageClassificationResult,
} from "@/lib/imageModeration";
import { MEDIA_INPUT_ACCEPT, loadMediaFile } from "@/lib/imageIngest";
import { putMediaBlob } from "@/lib/mediaStore";
import { useFloraly } from "@/context/FloralyContext";
import { useAuth } from "@/context/AuthContext";
import { MusicPicker } from "@/components/MusicPicker";
import { LuckyWheel } from "@/components/LuckyWheel";
import type { MediaType, NatureTag, Region, ReelMusic, SpeciesCard } from "@/lib/types";
import { isVideoPost } from "@/lib/types";

export default function EditReelPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { getMyPost, updatePost, ready } = useFloraly();
  const { settings } = useAuth();

  const [caption, setCaption] = useState("");
  const [selectedTags, setSelectedTags] = useState<NatureTag[]>([]);
  const [region, setRegion] = useState<Region | "">("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [muteVideoAudio, setMuteVideoAudio] = useState(true);
  const [music, setMusic] = useState<ReelMusic | null>(null);
  const [speciesSticker, setSpeciesSticker] = useState<SpeciesCard | null>(null);
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
    setMediaType(isVideoPost(found) ? "video" : "image");
    setMuteVideoAudio(found.muteVideoAudio ?? !!found.music);
    setMusic(found.music ?? null);
    setSpeciesSticker(found.speciesSticker ?? null);
    setHydrated(true);

    let cancelled = false;
    if (isVideoPost(found) && found.videoUrl) {
      void import("@/lib/mediaStore")
        .then(({ resolveMediaUrl }) => resolveMediaUrl(found.videoUrl!))
        .then((url) => {
          if (!cancelled) setVideoPreview(url);
        })
        .catch(() => {
          if (!cancelled) setVideoPreview(found.videoUrl ?? null);
        });
    } else {
      setVideoPreview(null);
    }
    return () => {
      cancelled = true;
    };
  }, [ready, postId, getMyPost]);

  useEffect(() => {
    if (music && mediaType === "video") {
      setMuteVideoAudio(true);
    }
  }, [music, mediaType]);

  const toggleTag = (tag: NatureTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      if (videoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreview);
      }
      const media = await loadMediaFile(file);
      setMediaType(media.kind);
      setImagePreview(media.posterUrl);
      if (media.kind === "video") {
        setVideoPreview(media.previewUrl);
        setVideoBlob(media.blob);
        setMuteVideoAudio(true);
      } else {
        setVideoPreview(null);
        setVideoBlob(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load this file. Try a photo or MP4/MOV video."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !imagePreview ||
      selectedTags.length === 0 ||
      (settings.speciesStickersEnabled && !speciesSticker)
    ) {
      setError(
        settings.speciesStickersEnabled && !speciesSticker
          ? "Slide the lucky slider to attach a flora/fauna sticker before saving."
          : "Add at least one nature category."
      );
      return;
    }
    setError(null);
    setSubmitting(true);

    let finalTags = selectedTags;
    try {
      const localAnalysis = await analyzeImageLocally(imagePreview);
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imagePreview,
          caption: caption || undefined,
          localAnalysis,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ImageClassificationResult;
        if (data.verdict === "rejected") {
          setError(rejectionMessage(data));
          setSubmitting(false);
          return;
        }
        if (data.tags.length > 0 && selectedTags.length === 0) {
          finalTags = data.tags;
        }
      }
    } catch {
      /* keep manual tags */
    }

    let nextVideoUrl = mediaType === "video" ? videoPreview ?? undefined : undefined;
    if (mediaType === "video" && videoBlob) {
      const mediaKey = `${postId}_${Date.now()}`;
      nextVideoUrl = await putMediaBlob(mediaKey, videoBlob);
    }

    updatePost(postId, {
      imageUrl: imagePreview,
      mediaType,
      videoUrl: mediaType === "video" ? nextVideoUrl : undefined,
      muteVideoAudio:
        mediaType === "video" ? (music ? muteVideoAudio : false) : undefined,
      caption: caption || undefined,
      tags: finalTags.length > 0 ? finalTags : selectedTags,
      region: region || undefined,
      music: music || undefined,
      speciesSticker: speciesSticker ?? undefined,
    });

    setSubmitting(false);
    router.push("/my-reels");
  };

  if (!ready || !hydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-cream-100"
        style={{ paddingBottom: "var(--nav-height)" }}
      >
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  const existingPost = getMyPost(postId);

  if (!existingPost) {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center bg-cream-100 px-6"
        style={{ paddingBottom: "var(--nav-height)" }}
      >
        <p className="font-display text-lg text-ink">Reel not found</p>
        <Link href="/my-reels" className="mt-4 text-sm text-forest-600 hover:underline">
          Back to My Reels
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-100" style={{ paddingBottom: "var(--nav-height)" }}>
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Link
            href="/my-reels"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            My Reels
          </Link>
          <h1 className="font-display text-2xl text-ink">Edit reel</h1>
          <p className="mt-1 text-sm text-stone-500">Update your media, caption, tags, or region.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-6 py-6">
        <label
          className={`flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
            imagePreview
              ? "border-forest-400 bg-forest-50"
              : "border-stone-300 bg-surface hover:border-moss-400"
          }`}
        >
          {imagePreview ? (
            mediaType === "video" && videoPreview ? (
              <video
                src={videoPreview}
                className="h-full w-full rounded-2xl object-cover"
                muted
                playsInline
                loop
                autoPlay
              />
            ) : (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-full w-full rounded-2xl object-cover"
              />
            )
          ) : (
            <p className="text-sm font-medium text-ink-muted">Tap to add a photo or video</p>
          )}
          <input
            type="file"
            accept={MEDIA_INPUT_ACCEPT}
            onChange={handleMediaChange}
            className="hidden"
          />
        </label>
        <p className="mt-2 text-center text-xs text-stone-400">
          Tap to replace - photos or videos (MP4, MOV, WEBM)
        </p>

        <div className="mt-6">
          <label className="text-sm font-medium text-ink-muted">
            Caption <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell the story behind this moment..."
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none"
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-ink-muted">Nature categories</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {NATURE_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 transition-all ${
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
            className="mt-2 w-full rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm focus:border-forest-400 focus:outline-none"
          >
            <option value="">None - prefer not to say</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <MusicPicker value={music} onChange={setMusic} />

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
                Viewers can still unmute the clip in the feed.
              </span>
            </span>
          </label>
        )}

        {settings.speciesStickersEnabled ? (
          <LuckyWheel value={speciesSticker} onChange={setSpeciesSticker} />
        ) : null}

        {error && (
          <div className="mt-6 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            !imagePreview ||
            selectedTags.length === 0 ||
            (settings.speciesStickersEnabled && !speciesSticker) ||
            submitting
          }
          className="mt-6 w-full rounded-2xl bg-forest-600 py-4 font-medium text-white transition-all hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? "Saving..."
            : settings.speciesStickersEnabled && !speciesSticker
              ? "Slide for a sticker to save"
              : "Save changes"}
        </button>
      </form>
    </div>
  );
}
