export type PublishedLearning = {
  id: string;
  key: string;
  title: string;
  summary: string;
  lessonCount: number;
  rewardCredits: string;
  lessons: { title: string }[];
};

export interface PublishedLearningReader {
  listPublished(): Promise<PublishedLearning[]>;
}
