export class GrammarLessonItemDto {
  id: string;
  categoryId: string;
  categoryTitle?: string;
  title: string;
  slug: string;
  summary: string;
  estimatedReadTimeMinutes: number;
  orderIndex: number;
  isCompleted: boolean;
  scrollPercentage: number;
  isBookmarked: boolean;
  lastReadAt?: string | null;
}

