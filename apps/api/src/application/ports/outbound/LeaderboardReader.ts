export type LeaderboardEntry = { position: number; handle: string; credits: string };

export interface LeaderboardReader {
  topUsers(limit: number): Promise<LeaderboardEntry[]>;
}
