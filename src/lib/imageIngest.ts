/**
 * Media ingest helpers - normalizes phone/camera formats (esp. HEIC/HEIF)
 * into browser-friendly JPEG data URLs, and loads videos with a poster frame
 * for classification + feed thumbnails.
 */

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/3gpp",
] as const;

/** Max video upload size (~40MB) - larger clips are hard to persist locally. */
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/** For <input accept="..."> - covers MIME types + extensions (iOS often omits MIME). */
export const IMAGE_INPUT_ACCEPT = [
  "image/*",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
  ".HEIC",
  ".HEIF",
  ".JPG",
  ".JPEG",
  ".PNG",
].join(",");

export const MEDIA_INPUT_ACCEPT = [
  IMAGE_INPUT_ACCEPT,
  "video/*",
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".3gp",
  ".MP4",
  ".MOV",
  ".WEBM",
].join(",");

const HEIC_EXTENSIONS = [".heic", ".heif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".3gp"];

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    HEIC_EXTENSIONS.includes(ext)
  );
}

export function isSupportedImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const ext = getFileExtension(file.name);

  if (type.startsWith("image/")) return true;
  // iOS / some Android pickers leave type empty for HEIC/JPEG
  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".bmp",
      ".avif",
      ".heic",
      ".heif",
    ].includes(ext)
  ) {
    return true;
  }
  return false;
}

export function isSupportedVideoFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const ext = getFileExtension(file.name);
  if (type.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.includes(ext);
}

export function isSupportedMediaFile(file: File): boolean {
  return isSupportedImageFile(file) || isSupportedVideoFile(file);
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read this media file."));
    reader.readAsDataURL(blob);
  });
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  // Dynamic import keeps the HEIC decoder out of the initial bundle until needed.
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!(blob instanceof Blob)) {
    throw new Error("HEIC conversion failed.");
  }
  return blob;
}

/**
 * Load any supported image into a JPEG/PNG data URL the browser can display
 * and classify. HEIC/HEIF from iPhones are converted to JPEG.
 */
export async function loadImageAsDataUrl(file: File): Promise<{
  dataUrl: string;
  displayName: string;
  convertedFromHeic: boolean;
}> {
  if (!isSupportedImageFile(file)) {
    throw new Error(
      "Unsupported file type. Please use JPEG, PNG, WEBP, GIF, AVIF, or HEIC."
    );
  }

  if (isHeicLike(file)) {
    try {
      const jpegBlob = await convertHeicToJpeg(file);
      const dataUrl = await readAsDataURL(jpegBlob);
      const base = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
      return {
        dataUrl,
        displayName: `${base}.jpg`,
        convertedFromHeic: true,
      };
    } catch {
      throw new Error(
        "Couldn't read this HEIC photo. Try exporting it as JPEG from Photos, or use a different image."
      );
    }
  }

  // Standard formats - read directly
  try {
    const dataUrl = await readAsDataURL(file);
    // Sanity-check that the browser can decode it (covers odd MIME/extension combos)
    await ensureImageDecodable(dataUrl);
    return {
      dataUrl,
      displayName: file.name || "photo.jpg",
      convertedFromHeic: false,
    };
  } catch (err) {
    // Some "JPEG" files from phones are actually HEIC with wrong extension/MIME
    if (!isHeicLike(file)) {
      try {
        const jpegBlob = await convertHeicToJpeg(file);
        const dataUrl = await readAsDataURL(jpegBlob);
        return {
          dataUrl,
          displayName: (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg",
          convertedFromHeic: true,
        };
      } catch {
        /* fall through */
      }
    }
    throw err instanceof Error
      ? err
      : new Error("Could not load this image. Try JPEG or PNG instead.");
  }
}

/**
 * Grab a JPEG poster frame from a video File (or blob URL) for classification
 * and feed thumbnails.
 */
export function extractVideoPoster(
  source: File | string,
  seekSeconds = 0.25
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    let objectUrl: string | null = null;
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    video.onerror = () => fail("Couldn't read this video. Try MP4 or MOV.");

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      const target = Math.min(Math.max(seekSeconds, 0.05), Math.max(duration - 0.05, 0));
      try {
        video.currentTime = target;
      } catch {
        video.currentTime = 0;
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 720;
        const h = video.videoHeight || 1280;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail("Could not capture a frame from this video.");
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const poster = canvas.toDataURL("image/jpeg", 0.88);
        cleanup();
        resolve(poster);
      } catch {
        fail("Could not capture a frame from this video.");
      }
    };

    if (typeof source === "string") {
      video.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    }
  });
}

export type LoadedMedia =
  | {
      kind: "image";
      previewUrl: string;
      posterUrl: string;
      displayName: string;
      blob: Blob;
      convertedFromHeic: boolean;
    }
  | {
      kind: "video";
      previewUrl: string;
      posterUrl: string;
      displayName: string;
      blob: Blob;
      convertedFromHeic: false;
    };

/**
 * Load an image or video for the upload flow. Videos get a poster frame for
 * moderation; the video blob is kept for IndexedDB persistence.
 */
export async function loadMediaFile(file: File): Promise<LoadedMedia> {
  if (isSupportedVideoFile(file)) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        "Video is too large (max 40MB). Try a shorter clip or compress it first."
      );
    }
    const previewUrl = URL.createObjectURL(file);
    try {
      const posterUrl = await extractVideoPoster(previewUrl);
      return {
        kind: "video",
        previewUrl,
        posterUrl,
        displayName: file.name || "clip.mp4",
        blob: file,
        convertedFromHeic: false,
      };
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      throw err;
    }
  }

  if (!isSupportedImageFile(file)) {
    throw new Error(
      "Unsupported file type. Please use a photo (JPEG, PNG, HEIC…) or video (MP4, MOV, WEBM)."
    );
  }

  const image = await loadImageAsDataUrl(file);
  return {
    kind: "image",
    previewUrl: image.dataUrl,
    posterUrl: image.dataUrl,
    displayName: image.displayName,
    blob: file,
    convertedFromHeic: image.convertedFromHeic,
  };
}

function ensureImageDecodable(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Browser could not decode this image."));
    img.src = dataUrl;
  });
}
