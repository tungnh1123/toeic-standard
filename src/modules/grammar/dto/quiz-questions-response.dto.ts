export class StudentQuizQuestionItemDto {
  id: string;
  questionNumber: number;
  questionText: string;
  options: Record<string, string>;
  difficultyLevel: string;
}

export class QuizQuestionsResponseDto {
  lessonId: string;
  totalQuestions: number;
  questions: StudentQuizQuestionItemDto[];
}

