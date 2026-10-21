export interface StudyCardResponseDto {
  id: string;
  deckId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  audioUrl: string | null;
  audioSlowUrl: string | null;
  imageUrl: string | null;
  collocations: string[];
  synonyms: string[];
  isBookmarked: boolean;
  personalNote: string | null;
  repetitionCount: number;
  intervalDays: number;
}

export interface StudySessionResponseDto {
  deckTitle: string;
  totalInSession: number;
  cards: StudyCardResponseDto[];
}
