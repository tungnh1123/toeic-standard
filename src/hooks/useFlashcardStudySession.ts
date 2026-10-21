import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { flashcardKeys } from '../api/query-keys';
import {
  StudyCardResponseDto,
  StudySessionResponseDto,
} from '../modules/flashcards/dto/study-card-response.dto';
import { UserCardBookmarkEntity } from '../modules/flashcards/entities/user-card-bookmark.entity';

export interface StudySessionParams {
  deckId?: string;
  limit?: number;
  onlyBookmarked?: boolean;
  mode?: 'DUE_FIRST' | 'NEW_FIRST' | 'SHUFFLE';
}

export interface ToggleBookmarkResult {
  cardId: string;
  isBookmarked: boolean;
  message: string;
}

export interface SavePersonalNoteResult {
  cardId: string;
  note: string;
  updatedAt: string;
}

/**
 * Hook tải phiên học flashcard 3D tương tác
 */
export function useStudySession(params: StudySessionParams = {}) {
  const { deckId, limit = 20, onlyBookmarked = false, mode = 'DUE_FIRST' } = params;

  return useQuery<StudySessionResponseDto>({
    queryKey: flashcardKeys.studySession({ deckId, mode, onlyBookmarked }),
    queryFn: async (): Promise<StudySessionResponseDto> => {
      const searchParams = new URLSearchParams();
      if (deckId) searchParams.append('deckId', deckId);
      if (limit) searchParams.append('limit', limit.toString());
      if (onlyBookmarked) searchParams.append('onlyBookmarked', 'true');
      if (mode) searchParams.append('mode', mode);

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await apiClient.get<StudySessionResponseDto, StudySessionResponseDto>(
        `/student/flashcards/study-session${qs}`,
      );
    },
    staleTime: 1000 * 60 * 5, // 5 phút cache
  });
}

/**
 * Hook bookmark / bỏ bookmark từ vựng (gắn sao STARRED)
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation<ToggleBookmarkResult, Error, string>({
    mutationFn: async (cardId: string): Promise<ToggleBookmarkResult> => {
      return await apiClient.post<ToggleBookmarkResult, ToggleBookmarkResult>(
        `/student/flashcards/${cardId}/bookmark`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook lưu ghi chú cá nhân cho thẻ từ vựng
 */
export function useSavePersonalNote() {
  const queryClient = useQueryClient();

  return useMutation<SavePersonalNoteResult, Error, { cardId: string; note: string }>({
    mutationFn: async ({
      cardId,
      note,
    }: {
      cardId: string;
      note: string;
    }): Promise<SavePersonalNoteResult> => {
      return await apiClient.put<SavePersonalNoteResult, SavePersonalNoteResult>(
        `/student/flashcards/${cardId}/personal-note`,
        { note },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook lấy danh sách các thẻ đã gắn sao (bookmark)
 */
export function useBookmarkedCards() {
  return useQuery<UserCardBookmarkEntity[]>({
    queryKey: flashcardKeys.bookmarks(),
    queryFn: async (): Promise<UserCardBookmarkEntity[]> => {
      return await apiClient.get<UserCardBookmarkEntity[], UserCardBookmarkEntity[]>(
        '/student/flashcards/bookmarks',
      );
    },
  });
}

