export interface DeckCatalogItemDto {
  id: string;
  title: string;
  description: string | null;
  level: string;
  topicCode: string;
  thumbnailUrl: string | null;
  totalCards: number;
  dueTodayCount: number;
  newCardsCount: number;
  learningCardsCount: number;
  masteredCardsCount: number;
  masteryPercentage: number;
  isFavorite: boolean;
}

export interface FlashcardPreviewDto {
  id: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
}

export interface DeckDetailResponseDto extends DeckCatalogItemDto {
  previewCards: FlashcardPreviewDto[];
}

export interface TodayDecksSummaryDto {
  totalDueCards: number;
  dueDecksCount: number;
  totalMasteredCards: number;
}
