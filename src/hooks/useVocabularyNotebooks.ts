import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { notebookKeys, flashcardKeys } from '../api/query-keys';
import { CreateNotebookDto } from '../modules/flashcards/dto/create-notebook.dto';
import { UpdateNotebookDto } from '../modules/flashcards/dto/update-notebook.dto';
import { AddCardToNotebookDto } from '../modules/flashcards/dto/add-card-to-notebook.dto';
import { UpdateCardMnemonicDto } from '../modules/flashcards/dto/update-card-mnemonic.dto';
import {
  NotebookItemDto,
  NotebookDetailDto,
  QuickStarResponseDto,
  TroubledWordsResponseDto,
} from '../modules/flashcards/dto/notebook-response.dto';
import { UserVocabularyNotebookEntity } from '../modules/flashcards/entities/user-vocabulary-notebook.entity';

/**
 * Hook lấy danh sách tất cả các sổ tay của học viên (Custom + STARRED)
 */
export function useUserNotebooks() {
  return useQuery<NotebookItemDto[]>({
    queryKey: notebookKeys.list(),
    queryFn: async (): Promise<NotebookItemDto[]> => {
      return await apiClient.get<NotebookItemDto[], NotebookItemDto[]>('/student/notebooks');
    },
  });
}

/**
 * Hook tạo sổ tay từ vựng cá nhân mới
 */
export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation<UserVocabularyNotebookEntity, Error, CreateNotebookDto>({
    mutationFn: async (dto: CreateNotebookDto): Promise<UserVocabularyNotebookEntity> => {
      return await apiClient.post<UserVocabularyNotebookEntity, UserVocabularyNotebookEntity>(
        '/student/notebooks',
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.all });
    },
  });
}

/**
 * Hook cập nhật thông tin sổ tay (tên, màu sắc, ghim)
 */
export function useUpdateNotebook() {
  const queryClient = useQueryClient();

  return useMutation<UserVocabularyNotebookEntity, Error, { notebookId: string; dto: UpdateNotebookDto }>({
    mutationFn: async ({ notebookId, dto }): Promise<UserVocabularyNotebookEntity> => {
      return await apiClient.put<UserVocabularyNotebookEntity, UserVocabularyNotebookEntity>(
        `/student/notebooks/${notebookId}`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.all });
    },
  });
}

/**
 * Hook xóa sổ tay cá nhân
 */
export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (notebookId: string): Promise<{ success: boolean; message: string }> => {
      return await apiClient.delete<{ success: boolean; message: string }, { success: boolean; message: string }>(
        `/student/notebooks/${notebookId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.all });
    },
  });
}

/**
 * Hook lấy danh sách từ trong sổ tay
 */
export function useNotebookCards(
  notebookId: string,
  params: { page?: number; limit?: number; keyword?: string } = {},
) {
  const { page = 1, limit = 20, keyword } = params;

  return useQuery<NotebookDetailDto>({
    queryKey: [...notebookKeys.cards(notebookId), { page, limit, keyword }],
    queryFn: async (): Promise<NotebookDetailDto> => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.append('page', page.toString());
      if (limit) searchParams.append('limit', limit.toString());
      if (keyword) searchParams.append('keyword', keyword);

      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await apiClient.get<NotebookDetailDto, NotebookDetailDto>(
        `/student/notebooks/${notebookId}/cards${qs}`,
      );
    },
    enabled: Boolean(notebookId),
  });
}

/**
 * Hook thêm từ vựng vào sổ tay
 */
export function useAddCardToNotebook() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { notebookId: string; dto: AddCardToNotebookDto }
  >({
    mutationFn: async ({ notebookId, dto }) => {
      return await apiClient.post<
        { success: boolean; message: string },
        { success: boolean; message: string }
      >(`/student/notebooks/${notebookId}/cards`, dto);
    },
    onSuccess: (_, { notebookId }) => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.cards(notebookId) });
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
    },
  });
}

/**
 * Hook xóa từ vựng khỏi sổ tay
 */
export function useRemoveCardFromNotebook() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { notebookId: string; cardId: string }
  >({
    mutationFn: async ({ notebookId, cardId }) => {
      return await apiClient.delete<
        { success: boolean; message: string },
        { success: boolean; message: string }
      >(`/student/notebooks/${notebookId}/cards/${cardId}`);
    },
    onSuccess: (_, { notebookId }) => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.cards(notebookId) });
      queryClient.invalidateQueries({ queryKey: notebookKeys.list() });
    },
  });
}

/**
 * Hook cập nhật mẹo nhớ cá nhân cho từ trong sổ tay
 */
export function useUpdateCardMnemonic() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { notebookId: string; cardId: string; dto: UpdateCardMnemonicDto }
  >({
    mutationFn: async ({ notebookId, cardId, dto }) => {
      return await apiClient.put<
        { success: boolean; message: string },
        { success: boolean; message: string }
      >(`/student/notebooks/${notebookId}/cards/${cardId}/mnemonic`, dto);
    },
    onSuccess: (_, { notebookId }) => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.cards(notebookId) });
    },
  });
}

/**
 * Hook đánh dấu sao nhanh (Quick Star Toggle)
 */
export function useQuickStar() {
  const queryClient = useQueryClient();

  return useMutation<QuickStarResponseDto, Error, string>({
    mutationFn: async (cardId: string): Promise<QuickStarResponseDto> => {
      return await apiClient.post<QuickStarResponseDto, QuickStarResponseDto>(
        `/student/notebooks/quick-star/${cardId}`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notebookKeys.all });
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

/**
 * Hook lấy danh sách từ khó cần cứu trợ tự động (Troubled Words: EF <= 1.70)
 */
export function useSmartTroubledWords(page: number = 1, limit: number = 20) {
  return useQuery<TroubledWordsResponseDto>({
    queryKey: notebookKeys.troubledWords(page, limit),
    queryFn: async (): Promise<TroubledWordsResponseDto> => {
      return await apiClient.get<TroubledWordsResponseDto, TroubledWordsResponseDto>(
        `/student/notebooks/smart/troubled-words?page=${page}&limit=${limit}`,
      );
    },
  });
}
