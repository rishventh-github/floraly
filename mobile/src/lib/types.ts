import type { RiskLevel, SpeciesCard } from "./speciesCatalog";

export type NatureTag =
  | "water"
  | "forests"
  | "mountains"
  | "wildlife"
  | "campfires"
  | "sunsets"
  | "flowers"
  | "desert"
  | "snow"
  | "coast";

export type Region =
  | "bay_area"
  | "los_angeles"
  | "pacific_northwest"
  | "rocky_mountains"
  | "northeast"
  | "southeast"
  | "midwest"
  | "international";

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  likes: number;
  parentId?: string;
}

export interface ReelMusic {
  id: string;
  title: string;
  artist: string;
  previewUrl?: string;
  artworkUrl?: string;
}

export type MediaType = "image" | "video";

/** Who can see a reel in the feed. Older posts omit this and count as public. */
export type PostVisibility = "public" | "circle";

export interface NaturePost {
  id: string;
  /** Still image, or poster frame when mediaType is "video". */
  imageUrl: string;
  /** "image" (default) or "video". Older posts omit this and are images. */
  mediaType?: MediaType;
  /** Video source (file URI or remote URL). Only set for videos. */
  videoUrl?: string;
  /**
   * When true, original video audio starts muted (typical when soundtrack music
   * is attached). Viewers can still unmute in the feed.
   */
  muteVideoAudio?: boolean;
  caption?: string;
  author: string;
  authorInitial: string;
  /** Auth account id when the reel was shared by a signed-in user */
  authorId?: string;
  tags: NatureTag[];
  region?: Region;
  likes: number;
  rank: number;
  comments: Comment[];
  createdAt: string;
  /** When false, new comments are blocked on this reel. Defaults to true. */
  commentsEnabled?: boolean;
  music?: ReelMusic;
  /** Optional lucky-wheel flora/fauna sticker */
  speciesSticker?: SpeciesCard;
  /**
   * public = anyone; circle = people you follow or share a group with (plus you).
   * Defaults to public when omitted.
   */
  visibility?: PostVisibility;
  /**
   * When visibility is "circle", optional group ids that may see the reel.
   * If set and non-empty, only those groups' members (plus the author) can see it.
   */
  visibleToGroupIds?: string[];
}

export interface NatureGroup {
  id: string;
  name: string;
  ownerId: string;
  /** Includes the owner. */
  memberIds: string[];
  createdAt: string;
}

/** Safe account card for directories (no password). */
export interface PublicAccount {
  id: string;
  displayName: string;
  email?: string;
}

export function isVideoPost(post: Pick<NaturePost, "mediaType" | "videoUrl">): boolean {
  return post.mediaType === "video" || !!post.videoUrl;
}

export type { RiskLevel, SpeciesCard };

export interface UserPreferences {
  userId: string;
  selectedTags: NatureTag[];
  region?: Region;
  tagWeights: Partial<Record<NatureTag, number>>;
  regionWeights: Partial<Record<Region, number>>;
  likedPostIds: string[];
  onboardingComplete: boolean;
  sessionOverrides?: {
    tags: NatureTag[];
    expiresAt: number;
    prompt?: string;
    explanation?: string;
  };
}

export interface SessionState {
  viewedTags: NatureTag[];
  transitionCounts: Record<string, number>;
}
