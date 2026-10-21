import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { flashcardKeys } from '../api/query-keys';
import {
  ReviewCardDto,
  BatchReviewDto,
} from '../modules/flashcards/dto/review-card.dto';
import {
  ReviewResponseDto,
  BatchReviewResponseDto,
  DueSummaryResponseDto,
  RetentionStatsResponseDto,
} from '../modules/flashcards/dto/review-response.dto';

/**
 * Hook đánh giá 1 thẻ từ vựng theo thuật toán SM-2 (1: Quên, 2: Khó, 3: Tốt, 4: Dễ)
 */
export function useReviewCard() {
  const queryClient = useQueryClient();

  return useMutation<ReviewResponseDto, Error, { cardId: string; dto: ReviewCardDto }>({
    mutationFn: async ({
      cardId,
      dto,
    }: {
      cardId: string;
      dto: ReviewCardDto;
    }): Promise<ReviewResponseDto> => {
      return await apiClient.post<ReviewResponseDto, ReviewResponseDto>(
        `/student/flashcards/${cardId}/review`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook gửi kết quả đánh giá theo lô nhiều thẻ sau một phiên học
 */
export function useBatchReview() {
  const queryClient = useQueryClient();

  return useMutation<BatchReviewResponseDto, Error, BatchReviewDto>({
    mutationFn: async (dto: BatchReviewDto): Promise<BatchReviewResponseDto> => {
      return await apiClient.post<BatchReviewResponseDto, BatchReviewResponseDto>(
        '/student/flashcards/batch-review',
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook lấy tổng quan số lượng thẻ đến hạn hôm nay chia theo từng bộ thẻ
 */
export function useDueSummary() {
  return useQuery<DueSummaryResponseDto>({
    queryKey: flashcardKeys.dueSummary(),
    queryFn: async (): Promise<DueSummaryResponseDto> => {
      return await apiClient.get<DueSummaryResponseDto, DueSummaryResponseDto>(
        '/student/flashcards/due-summary',
      );
    },
    staleTime: 1000 * 60 * 5, // 5 phút
  });
}

/**
 * Hook thống kê tỷ lệ ghi nhớ dài hạn (Retention Rate) và phân bổ New/Learning/Mastered
 */
export function useRetentionStats() {
  return useQuery<RetentionStatsResponseDto>({
    queryKey: flashcardKeys.retentionStats(),
    queryFn: async (): Promise<RetentionStatsResponseDto> => {
      return await apiClient.get<RetentionStatsResponseDto, RetentionStatsResponseDto>(
        '/student/flashcards/retention-stats',
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}
