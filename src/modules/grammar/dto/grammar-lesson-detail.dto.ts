export class TableOfContentItemDto {
  id: string; // Anchor slug (e.g. cong-thuc-thi-hien-tai-hoan-thanh)
  title: string; // Heading text
  level: number; // 1 (H1), 2 (H2), 3 (H3)
}

export class GrammarLessonDetailResponseDto {
  id: string;
  categoryId: string;
  categoryTitle: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  estimatedReadTimeMinutes: number;
  tableOfContents: TableOfContentItemDto[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  isCompleted: boolean;
  scrollPercentage: number;
  isBookmarked: boolean;
  hasQuiz: boolean;
  quizCount: number;
}
