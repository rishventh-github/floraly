export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface StoredAccount extends AuthUser {
  /** Demo-only obfuscation - not real password security. */
  passwordHash: string;
}

export interface UserSettings {
  /** Prefer broad region over exact location signals in the feed. */
  preferLocalNature: boolean;
  /** Allow others to comment on your reels. */
  allowComments: boolean;
  /** Hearted reels automatically appear in Saved. */
  autoSaveLikes: boolean;
  /** Show the LLM curate bar on the feed. */
  showCurateBar: boolean;
  /**
   * When false, hide flora/fauna sticker hunting on reels for a
   * distraction-free nature photo experience.
   */
  speciesStickersEnabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  preferLocalNature: true,
  allowComments: true,
  autoSaveLikes: true,
  showCurateBar: true,
  speciesStickersEnabled: false,
};
