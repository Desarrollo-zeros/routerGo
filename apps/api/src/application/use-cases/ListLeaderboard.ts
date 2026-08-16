import type { LeaderboardReader } from '../ports/outbound/LeaderboardReader.js';

export class ListLeaderboard {
  constructor(private readonly reader: LeaderboardReader) {}

  execute(): Promise<Awaited<ReturnType<LeaderboardReader['topUsers']>>> {
    return this.reader.topUsers(20);
  }
}
