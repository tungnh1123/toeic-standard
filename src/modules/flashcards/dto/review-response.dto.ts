import { FlashcardStatus } from '../entities/user-flashcard-progress.entity';

export class ReviewResponseDto {
  flashcardId: string;
  rating: number;
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  status: FlashcardStatus;
  isMastered: boolean;
  message: string;
}

export class BatchReviewResponseDto {
  processedCount: number;
  graduatedCount: number;
  relearnCount: number;
  results: ReviewResponseDto[];
}

export interface DeckDueSummaryItem {
  deckId: string;
  deckTitle: string;
  level: string;
  dueCount: number;
}

export class DueSummaryResponseDto {
  totalDueToday: number;
  decks: DeckDueSummaryItem[];
}

export interface DailyActivityItem {
  date: string;
  reviewedCount: number;
}

export class RetentionStatsResponseDto {
  totalLearned: number;
  retentionRate: number; // Tỷ lệ % ghi nhớ tốt/dễ (rating >= 3)
  newCount: number;
  learningCount: number;
  masteredCount: number;
  recentActivity: DailyActivityItem[];
}
