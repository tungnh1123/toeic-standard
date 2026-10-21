import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { flashcardKeys } from '../api/query-keys';
import {
  DeckCatalogItemDto,
  DeckDetailResponseDto,
  TodayDecksSummaryDto,
} from '../modules/flashcards/dto/deck-catalog-response.dto';
import { FlashcardEntity } from '../modules/flashcards/entities/flashcard.entity';

export interface DecksCatalogFilters {
  level?: string;
  topicCode?: string;
  keyword?: string;
  onlyFavorites?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Hook tải danh mục bộ thẻ từ vựng kèm lọc CEFR, Topic & Tiến độ cá nhân
 */
export function useDecksCatalog(filters: DecksCatalogFilters = {}) {
  return useQuery<PaginatedResult<DeckCatalogItemDto>>({
    queryKey: flashcardKeys.decks({ level: filters.level, topicCode: filters.topicCode }),
    queryFn: async (): Promise<PaginatedResult<DeckCatalogItemDto>> => {
      const params = new URLSearchParams();
      if (filters.level && filters.level !== 'ALL') params.append('level', filters.level);
      if (filters.topicCode) params.append('topicCode', filters.topicCode);
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.onlyFavorites) params.append('onlyFavorites', 'true');
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return await apiClient.get<PaginatedResult<DeckCatalogItemDto>, PaginatedResult<DeckCatalogItemDto>>(
        `/student/decks${queryString}`,
      );
    },
  });
}

/**
 * Hook tải chi tiết 1 bộ thẻ kèm 5 từ xem trước
 */
export function useDeckDetail(deckId: string) {
  return useQuery<DeckDetailResponseDto>({
    queryKey: flashcardKeys.deckDetail(deckId),
    queryFn: async (): Promise<DeckDetailResponseDto> => {
      return await apiClient.get<DeckDetailResponseDto, DeckDetailResponseDto>(
        `/student/decks/${deckId}`,
      );
    },
    enabled: Boolean(deckId),
  });
}

/**
 * Hook tải danh sách từ vựng chi tiết trong bộ thẻ (hỗ trợ phân trang)
 */
export function useDeckCards(deckId: string, page: number = 1, limit: number = 20) {
  return useQuery<PaginatedResult<FlashcardEntity>>({
    queryKey: [...flashcardKeys.deckDetail(deckId), 'cards', { page, limit }],
    queryFn: async (): Promise<PaginatedResult<FlashcardEntity>> => {
      return await apiClient.get<PaginatedResult<FlashcardEntity>, PaginatedResult<FlashcardEntity>>(
        `/student/decks/${deckId}/cards?page=${page}&limit=${limit}`,
      );
    },
    enabled: Boolean(deckId),
  });
}

/**
 * Hook đánh dấu / hủy đánh dấu bộ thẻ yêu thích (Toggle)
 */
export function useToggleFavoriteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string): Promise<{ isFavorite: boolean }> => {
      return await apiClient.post<{ isFavorite: boolean }, { isFavorite: boolean }>(
        `/student/decks/${deckId}/favorite`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook thống kê tổng số từ đến hạn ôn hôm nay trên toàn bộ các deck
 */
export function useTodayDecksSummary() {
  return useQuery<TodayDecksSummaryDto>({
    queryKey: flashcardKeys.dueToday(),
    queryFn: async (): Promise<TodayDecksSummaryDto> => {
      return await apiClient.get<TodayDecksSummaryDto, TodayDecksSummaryDto>(
        '/student/decks/summary/today',
      );
    },
  });
}
