import { STORAGE_KEYS } from "./constants";
import { accountKey } from "./accountStorage";
import type { ImageClassificationResult } from "./imageModeration";
import type { MediaType, NatureTag, Region, ReelMusic, SpeciesCard } from "./types";

export type UploadScanState =
  | "idle"
  | "scanning"
  | "approved"
  | "rejected"
  | "overridden";

export interface UploadDraft {
  imagePreview: string | null;
  /** Video object/data URL for draft restore within the session (may be dropped if huge). */
  videoPreview?: string | null;
  mediaType?: MediaType;
  muteVideoAudio?: boolean;
  filename?: string;
  caption: string;
  selectedTags: NatureTag[];
  region: Region | "";
  music: ReelMusic | null;
  speciesSticker: SpeciesCard | null;
  scanState: UploadScanState;
  classification: ImageClassificationResult | null;
  natureConfirmed: boolean;
  pendingHints: NatureTag[];
  ingestError: string | null;
  savedAt: number;
}

function draftKey(accountId: string): string {
  return accountKey(STORAGE_KEYS.uploadDraft, accountId);
}

export function loadUploadDraft(accountId: string): UploadDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(accountId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as UploadDraft;
    if (!draft || typeof draft !== "object") return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveUploadDraft(
  accountId: string,
  draft: Omit<UploadDraft, "savedAt">
): void {
  if (typeof window === "undefined") return;
  const payload: UploadDraft = { ...draft, savedAt: Date.now() };
  const hasProgress =
    !!payload.imagePreview ||
    !!payload.caption.trim() ||
    payload.selectedTags.length > 0 ||
    !!payload.region ||
    !!payload.music ||
    !!payload.speciesSticker ||
    payload.scanState !== "idle";

  if (!hasProgress) {
    clearUploadDraft(accountId);
    return;
  }

  try {
    localStorage.setItem(draftKey(accountId), JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(
        draftKey(accountId),
        JSON.stringify({ ...payload, imagePreview: null })
      );
    } catch {
      /* ignore */
    }
  }
}

export function clearUploadDraft(accountId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(accountId));
  } catch {
    /* ignore */
  }
}
