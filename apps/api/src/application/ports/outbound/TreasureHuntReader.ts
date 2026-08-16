export type PublicTreasureHunt = {
  id: string;
  title: string;
  locationKind: string;
  stepCount: number;
  status: string;
};

export interface TreasureHuntReader {
  listActive(): Promise<PublicTreasureHunt[]>;
}
