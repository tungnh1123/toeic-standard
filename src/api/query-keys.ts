export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

export const flashcardKeys = {
  all: ['flashcards'] as const,
  decks: (filters?: { level?: string; topicCode?: string }) =>
    [...flashcardKeys.all, 'decks', filters ?? {}] as const,
  deckDetail: (deckId: string) =>
    [...flashcardKeys.all, 'deck', deckId] as const,
  dueToday: () => [...flashcardKeys.all, 'due-today'] as const,
  sm2Retention: () => [...flashcardKeys.all, 'sm2-retention'] as const,
  studySession: (params?: { deckId?: string; mode?: string; onlyBookmarked?: boolean }) =>
    [...flashcardKeys.all, 'study-session', params ?? {}] as const,
  bookmarks: () => [...flashcardKeys.all, 'bookmarks'] as const,
};

export const notebookKeys = {
  all: ['notebooks'] as const,
  list: () => [...notebookKeys.all, 'list'] as const,
  cards: (notebookId: string) =>
    [...notebookKeys.all, 'cards', notebookId] as const,
  troubledWords: (page?: number, limit?: number) =>
    [...notebookKeys.all, 'troubled-words', { page, limit }] as const,
};

export const grammarKeys = {
  all: ['grammar'] as const,
  categories: () => [...grammarKeys.all, 'categories'] as const,
  lessonDetail: (lessonId: string) =>
    [...grammarKeys.all, 'lesson', lessonId] as const,
  quizQuestions: (lessonId: string) =>
    [...grammarKeys.all, 'quiz', lessonId] as const,
};

export const streakKeys = {
  all: ['streak'] as const,
  status: () => [...streakKeys.all, 'status'] as const,
  heatmap: (year: number) => [...streakKeys.all, 'heatmap', year] as const,
  badges: () => [...streakKeys.all, 'badges'] as const,
};

export const radarKeys = {
  all: ['skill-radar'] as const,
  profile: () => [...radarKeys.all, 'profile'] as const,
  weaknessDiagnosis: () => [...radarKeys.all, 'weakness-diagnosis'] as const,
  history: () => [...radarKeys.all, 'history'] as const,
};

export const examKeys = {
  all: ['toeic-exams'] as const,
  list: () => [...examKeys.all, 'list'] as const,
  attempt: (attemptId: string) =>
    [...examKeys.all, 'attempt', attemptId] as const,
};

export const submissionKeys = {
  all: ['submissions'] as const,
  adminList: (filters: Record<string, string | number | undefined>) =>
    [...submissionKeys.all, 'admin-list', filters] as const,
  detail: (submissionId: string) =>
    [...submissionKeys.all, 'detail', submissionId] as const,
};

