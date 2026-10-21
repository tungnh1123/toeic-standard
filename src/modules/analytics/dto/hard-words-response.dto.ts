export class HardWordItemDto {
  cardId: string;
  term: string;
  vietnameseMeaning: string;
  partOfSpeech: string;
  deckId: string;
  deckTitle: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  dueDate: string;
}

export class HardWordsResponseDto {
  totalHardWords: number;
  words: HardWordItemDto[];
}

