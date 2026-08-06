export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  uploadCount: number;
  collectionPoints: number;
}

export interface CommunityStatsSnapshot {
  concurrentUsers: number;
  totalUsers: number;
  totalUploads: number;
  uniqueVisitors: number;
  totalPageViews: number;
  leaderboard: LeaderboardEntry[];
}
