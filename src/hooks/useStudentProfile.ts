import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { authKeys } from '../api/query-keys';

export interface StudentProfileData {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    currentStreak: number;
    longestStreak: number;
  };
  goal: {
    targetScore: number;
    currentScore: number;
    scoreGap: number;
    progressPercentage: number;
    targetExamDate: string | null;
    daysRemaining: number | null;
    dailyStudyMinutes: number;
  };
}

export interface SetTargetScorePayload {
  targetScore: number;
  targetExamDate: string;
  dailyStudyMinutes?: number;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AvatarPresignedUrlPayload {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

/**
 * Hook tải thông tin hồ sơ học viên tổng hợp & mục tiêu điểm số
 */
export function useStudentProfile() {
  return useQuery<StudentProfileData>({
    queryKey: authKeys.profile(),
    queryFn: async (): Promise<StudentProfileData> => {
      return await apiClient.get<StudentProfileData, StudentProfileData>(
        '/student/profile/me',
      );
    },
  });
}

/**
 * Hook cập nhật mục tiêu TOEIC (targetScore & targetExamDate)
 */
export function useSetTargetScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetTargetScorePayload) => {
      return await apiClient.put('/student/profile/target', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
}

/**
 * Hook cập nhật thông tin cá nhân (Họ tên, Avatar)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      return await apiClient.put('/student/profile/me', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
}

/**
 * Hook đổi mật khẩu
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      return await apiClient.put<{ success: boolean }, { success: boolean }>(
        '/student/profile/password',
        payload,
      );
    },
  });
}

/**
 * Hook xin cấp S3 Presigned URL để upload ảnh avatar trực tiếp
 */
export function useAvatarPresignedUrl() {
  return useMutation({
    mutationFn: async (payload: AvatarPresignedUrlPayload): Promise<PresignedUrlResponse> => {
      return await apiClient.post<PresignedUrlResponse, PresignedUrlResponse>(
        '/student/profile/avatar/presigned-url',
        payload,
      );
    },
  });
}

