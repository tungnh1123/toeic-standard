export class QuestionReviewItemDto {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: Record<string, string>;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  translation: string | null;
}

export class QuizResultResponseDto {
  attemptId: string;
  lessonId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  attemptNumber: number;
  durationSeconds: number;
  submittedAt: string;
  questions: QuestionReviewItemDto[];
}

