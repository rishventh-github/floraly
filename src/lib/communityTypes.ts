export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  uploadCount: number;
  collectionPoints: number;
}

export interface CommunityStatsSnapshot {
  concurrentUsers: number;
  /** Accounts that have joined Floraly (signups). */
  totalUsers: number;
  totalUploads: number;
  /** Unique web visitors (landing + app page loads). */
  uniqueVisitors: number;
  /** Total web page-view events recorded. */
  totalPageViews: number;
  leaderboard: LeaderboardEntry[];
}
