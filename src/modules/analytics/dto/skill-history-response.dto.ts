export class SkillHistorySnapshotDto {
  date: string;
  vocabScore: number;
  grammarScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  overallScore: number;
  estimatedToeicScore: number;
}

export class SkillHistoryResponseDto {
  totalSnapshots: number;
  history: SkillHistorySnapshotDto[];
}

