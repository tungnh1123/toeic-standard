import { NotebookType } from '../entities/user-vocabulary-notebook.entity';

export class NotebookItemDto {
  id: string;
  title: string;
  description: string | null;
  notebookType: NotebookType;
  colorCode: string;
  iconName: string;
  isPinned: boolean;
  totalCards: number;
  createdAt: Date;
  updatedAt: Date;
}

export class NotebookCardItemDto {
  entryItemId: string;
  flashcardId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  exampleTranslation?: string | null;
  audioUrl: string | null;
  personalMnemonic: string | null;
  customExample: string | null;
  addedAt: Date;
  easeFactor: number;
  intervalDays: number;
}

export class NotebookDetailDto {
  notebook: {
    id: string;
    title: string;
    description: string | null;
    colorCode: string;
    iconName: string;
    notebookType: NotebookType;
    isPinned: boolean;
  };
  cards: NotebookCardItemDto[];
  total: number;
  page: number;
  limit: number;
}

export class QuickStarResponseDto {
  flashcardId: string;
  isStarred: boolean;
  message: string;
}

export class TroubledWordItemDto {
  flashcardId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  audioUrl: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  status: string;
  dueDate: string;
  lastReviewedAt: Date | null;
}

export class TroubledWordsResponseDto {
  total: number;
  items: TroubledWordItemDto[];
}

