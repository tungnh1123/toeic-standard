# HƯỚNG DẪN TÍCH HỢP FRONTEND (REACT NATIVE CLIENT)
## HỆ THỐNG HỌC TIẾNG ANH & LUYỆN THI TOEIC TRỰC TUYẾN

* **Mã tài liệu:** FE_INT_RN_2026_V1
* **Phiên bản:** 1.0.0
* **Dành cho:** Lập trình viên Frontend (React Native / Expo / Flutter)
* **Phiên bản API tương thích:** API Specification v1.0.2
* **Ngày phát hành:** 12/10/2026

## 1. TỔNG QUAN KIẾN TRÚC FRONTEND

### 1.1. Công nghệ Cốt lõi (Tech Stack)
* **Framework:** React Native (Expo SDK 51+ / React Native 0.74+)
* **Ngôn ngữ:** TypeScript 5.0+
* **Quản lý Server State & Caching:** TanStack React Query v5
* **HTTP Client:** Axios với Custom Interceptors
* **Quản lý Token Bảo mật:** Expo SecureStore / React Native Keychain
* **UI & Styling:** NativeWind (TailwindCSS cho React Native) + Lucide Icons
* **Phát Audio & Sóng âm:** Expo AV / React Native Track Player

## 2. CẤU HÌNH HTTP CLIENT & AUTH INTERCEPTOR

Hệ thống sử dụng cơ chế JWT với Access Token (hạn 15 phút) và Refresh Token Rotation (hạn 7 ngày). HTTP Client cần tự động xử lý việc làm mới token khi gặp lỗi 401 Unauthorized.

### 2.1. Mã nguồn Khởi tạo Axios Instance

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await SecureStore.getItemAsync('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

## 3. TÍCH HỢP CÁC PHÂN HỆ NGHIỆP VỤ CHÍNH

### 3.1. Phân hệ Hồ sơ & Mục tiêu Điểm số (MOD_STU)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export interface SetTargetPayload {
  targetScore: number;
  targetExamDate: string;
  dailyStudyMinutes?: number;
}

export const useStudentProfile = () => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: async () => {
      const res = await apiClient.get('/student/profile/me');
      return res.data.data;
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
  };
};
```

### 3.2. Phân hệ Học từ vựng SM-2 (MOD_STU)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export const useFlashcardsSRS = () => {
  const queryClient = useQueryClient();

  const dueCardsQuery = useQuery({
    queryKey: ['flashcards-due'],
    queryFn: async () => {
      const res = await apiClient.get('/flashcards/due?limit=20');
      return res.data.data;
    },
  });

  return {
    dueCards: dueCardsQuery.data || [],
    isLoading: dueCardsQuery.isLoading,
  };
};
```

### 3.3. Phân hệ Thi thử TOEIC & Đồng bộ Redis (MOD_EXM)

```typescript
import { useState } from 'react';
import { apiClient } from '../services/api-client';

export const useToeicExamEngine = (attemptId: string) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const syncAnswerToRedis = async (questionId: string, option: string) => {
    try {
      await apiClient.patch(`/exams/attempts/${attemptId}/answers`, {
        questionId,
        selectedOption: option,
      });
    } catch (err) {
      console.warn('Lỗi đồng bộ nháp đáp án:', err);
    }
  };

  return {
    selectedAnswers,
    syncAnswerToRedis,
  };
};
```

### 3.4. Tải tệp Audio Speaking qua S3 Presigned URL (MOD_TSK)

```typescript
import { apiClient } from '../services/api-client';

export const uploadSpeakingSubmission = async (
  assignmentId: string,
  localAudioUri: string
) => {
  const presignedRes = await apiClient.post('/submissions/presigned-url', {
    assignmentId,
    mimeType: 'audio/m4a',
  });

  const { uploadUrl, fileKey } = presignedRes.data.data;

  const submitRes = await apiClient.post('/submissions', {
    assignmentId,
    audioFileUrl: fileKey,
    durationSeconds: 45,
  });

  return submitRes.data;
};
```

## 4. CHECKLIST ĐỒNG BỘ CHO LẬP TRÌNH VIÊN FRONTEND

- [x] Cấu hình Base URL `/api/v1` và thiết lập Axios Interceptor tự động xoay vòng Refresh Token.
- [x] Lưu trữ Token trong môi trường lưu trữ an toàn OS.
- [x] Gọi `PATCH /exams/attempts/:id/answers` theo cơ chế debounced để đồng bộ đáp án nháp thi TOEIC.
- [x] Tuân thủ quy trình 3 bước khi nộp bài Speaking: Xin Presigned URL -> PUT S3 -> POST /submissions.
- [x] Kiểm tra điểm mục tiêu TOEIC luôn là bội số của 5 trước khi gọi API `PUT /student/profile/target`.
