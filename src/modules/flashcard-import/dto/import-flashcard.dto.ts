export interface DeckImportSummaryItem {
  deckId: string;
  deckTitle: string;
  cefrLevel: string;
  cardsCount: number;
}

export class ImportMatrixResultDto {
  totalRowsProcessed: number;
  totalCardsCreated: number;
  totalCardsSkipped: number;
  decksSummary: DeckImportSummaryItem[];
}

export class ImportDeckWordsResultDto {
  deckId: string;
  deckTitle: string;
  totalRowsProcessed: number;
  totalCardsCreated: number;
  totalCardsSkipped: number;
}

