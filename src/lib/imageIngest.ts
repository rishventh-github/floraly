/**
 * Image ingest helpers - normalizes phone/camera formats (esp. HEIC/HEIF)
 * into browser-friendly JPEG data URLs for preview + classification.
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

const HEIC_EXTENSIONS = [".heic", ".heif"];

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

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read this image file."));
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

function ensureImageDecodable(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Browser could not decode this image."));
    img.src = dataUrl;
  });
}
