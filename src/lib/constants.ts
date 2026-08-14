import type { NatureTag, Region } from "./types";

export const NATURE_TAGS: {
  id: NatureTag;
  label: string;
  emoji: string;
  description: string;
  /** Soft chip / card background when unselected */
  chipClass: string;
  /** Selected chip / card background */
  chipSelectedClass: string;
}[] = [
  {
    id: "water",
    label: "Water",
    emoji: "💧",
    description: "Lakes, rivers, waterfalls",
    chipClass: "bg-sky-100 text-sky-900 ring-sky-200",
    chipSelectedClass: "bg-sky-600 text-white ring-sky-600",
  },
  {
    id: "forests",
    label: "Forests",
    emoji: "🌲",
    description: "Woods, trails, canopy",
    chipClass: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    chipSelectedClass: "bg-emerald-700 text-white ring-emerald-700",
  },
  {
    id: "mountains",
    label: "Mountains",
    emoji: "⛰️",
    description: "Peaks, valleys, alpine",
    chipClass: "bg-stone-200 text-stone-800 ring-stone-300",
    chipSelectedClass: "bg-stone-700 text-white ring-stone-700",
  },
  {
    id: "wildlife",
    label: "Wildlife",
    emoji: "🦌",
    description: "Animals in the wild",
    chipClass: "bg-amber-100 text-amber-950 ring-amber-200",
    chipSelectedClass: "bg-amber-700 text-white ring-amber-700",
  },
  {
    id: "campfires",
    label: "Campfires",
    emoji: "🔥",
    description: "Campsites, firelight",
    chipClass: "bg-orange-100 text-orange-950 ring-orange-200",
    chipSelectedClass: "bg-orange-600 text-white ring-orange-600",
  },
  {
    id: "sunsets",
    label: "Sunsets",
    emoji: "🌅",
    description: "Golden hour skies",
    chipClass: "bg-fuchsia-100 text-fuchsia-950 ring-fuchsia-200",
    chipSelectedClass: "bg-fuchsia-600 text-white ring-fuchsia-600",
  },
  {
    id: "flowers",
    label: "Flowers",
    emoji: "🌸",
    description: "Meadows, blooms",
    chipClass: "bg-pink-100 text-pink-950 ring-pink-200",
    chipSelectedClass: "bg-pink-600 text-white ring-pink-600",
  },
  {
    id: "desert",
    label: "Desert",
    emoji: "🏜️",
    description: "Dunes, arid landscapes",
    chipClass: "bg-orange-200 text-orange-950 ring-orange-300",
    chipSelectedClass: "bg-orange-700 text-white ring-orange-700",
  },
  {
    id: "snow",
    label: "Snow",
    emoji: "❄️",
    description: "Winter, frost, snowcaps",
    chipClass: "bg-slate-100 text-slate-800 ring-slate-200",
    chipSelectedClass: "bg-slate-600 text-white ring-slate-600",
  },
  {
    id: "coast",
    label: "Coast",
    emoji: "🌊",
    description: "Beaches, cliffs, ocean",
    chipClass: "bg-cyan-100 text-cyan-950 ring-cyan-200",
    chipSelectedClass: "bg-cyan-600 text-white ring-cyan-600",
  },
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
  collectionHintDismissed: "floraly_collection_hint_dismissed",
} as const;

export const NAV_HEIGHT = "4.5rem";
