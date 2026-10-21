import { CefrLevel } from '../../flashcards/entities/flashcard-deck.entity';

export class GrammarCategoryResponseDto {
  id: string;
  title: string;
  description: string | null;
  targetLevel: CefrLevel;
  iconName: string;
  colorCode: string;
  orderIndex: number;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}
