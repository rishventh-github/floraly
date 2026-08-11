import type { NatureTag, Region } from "./types";

export const NATURE_TAGS: {
  id: NatureTag;
  label: string;
  description: string;
  color: string;
  selectedColor: string;
}[] = [
  { id: "water", label: "Water", description: "Lakes, rivers, waterfalls", color: "#E0F2FE", selectedColor: "#0284C7" },
  { id: "forests", label: "Forests", description: "Woods, trails, canopy", color: "#D1FAE5", selectedColor: "#047857" },
  { id: "mountains", label: "Mountains", description: "Peaks, valleys, alpine", color: "#E7E5E4", selectedColor: "#44403C" },
  { id: "wildlife", label: "Wildlife", description: "Animals in the wild", color: "#FEF3C7", selectedColor: "#B45309" },
  { id: "campfires", label: "Campfires", description: "Campsites, firelight", color: "#FFEDD5", selectedColor: "#EA580C" },
  { id: "sunsets", label: "Sunsets", description: "Golden hour skies", color: "#FAE8FF", selectedColor: "#C026D3" },
  { id: "flowers", label: "Flowers", description: "Meadows, blooms", color: "#FCE7F3", selectedColor: "#DB2777" },
  { id: "desert", label: "Desert", description: "Dunes, arid landscapes", color: "#FED7AA", selectedColor: "#C2410C" },
  { id: "snow", label: "Snow", description: "Winter, frost, snowcaps", color: "#F1F5F9", selectedColor: "#475569" },
  { id: "coast", label: "Coast", description: "Beaches, cliffs, ocean", color: "#CFFAFE", selectedColor: "#0891B2" },
];

export const REGIONS: { id: Region; label: string }[] = [
  { id: "bay_area", label: "Bay Area" },
  { id: "los_angeles", label: "Los Angeles" },
  { id: "pacific_northwest", label: "Pacific Northwest" },
  { id: "rocky_mountains", label: "Rocky Mountains" },
  { id: "northeast", label: "Northeast" },
  { id: "southeast", label: "Southeast" },
  { id: "midwest", label: "Midwest" },
  { id: "international", label: "International" },
];

export const STORAGE_KEYS = {
  preferences: "floraly_preferences",
  posts: "floraly_user_posts",
  session: "floraly_session",
  accounts: "floraly_accounts",
  authSession: "floraly_auth_session",
  settings: "floraly_settings",
  theme: "floraly_theme",
  feedLastPost: "floraly_last_feed_post",
  feedShuffleSeed: "floraly_feed_shuffle_seed",
  speciesCollection: "floraly_species_collection",
  uploadDraft: "floraly_upload_draft",
  presenceSession: "floraly_presence_session",
} as const;

/** Base URL for Next.js API + static assets. Change for device testing. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

export function assetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http") || path.startsWith("file:") || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
