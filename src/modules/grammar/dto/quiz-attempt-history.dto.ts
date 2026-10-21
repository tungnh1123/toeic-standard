export class QuizAttemptSummaryItemDto {
  attemptId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  durationSeconds: number;
  attemptNumber: number;
  submittedAt: string;
}

export class QuizHistoryResponseDto {
  lessonId: string;
  totalAttempts: number;
  bestScore: number;
  isPassed: boolean;
  attempts: QuizAttemptSummaryItemDto[];
}
