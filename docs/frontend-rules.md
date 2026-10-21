# docs/frontend-rules.md — Quick Rule: Frontend Development & State Management Standard
## System: Online TOEIC Learning & Exam Preparation System

* **Document Identifier:** Quick Rule Frontend Development Guide
* **Version:** 3.0.0 (Expo SDK 51 & Next.js 14 App Router)
* **Target Audience:** Mobile & Web Frontend Engineers

---

## 1. QUẢN LÝ TRẠNG THÁI TÁCH BẠCH (SERVER STATE VS CLIENT UI STATE)

Dự án áp dụng triết lý phân định trạng thái triệt để giữa Server State và Client UI State:

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT APP STATE                                 |
|                                                                                   |
|  +-----------------------------------------+ +----------------------------------+ |
|  | SERVER STATE (90% Dữ liệu)             | | CLIENT UI STATE (10% Dữ liệu)   | |
|  | - Công cụ: TanStack Query v5            | | - Công cụ: Zustand              | |
|  | - Phạm vi: Fetch, Cache, Revalidate,    | | - Phạm vi: Theme, Active Modal, | |
|  |   Optimistic Updates & Polling           | |   Auth Session, Audio State    | |
|  | - Cấm: KHÔNG lưu API Data vào Redux/   | | - Quy tắc: Luôn dùng Selectors | |
|  |   Zustand/useState cục bộ               | |   để tránh Re-render thừa     | |
|  +-----------------------------------------+ +----------------------------------+ |
+-----------------------------------------------------------------------------------+
```

### 1.1. Chuẩn hóa Query Key Factory (TanStack Query v5)
Toàn bộ Query Keys bắt buộc khai báo tập trung qua Query Key Factory để phục vụ việc Cache Invalidation chính xác:

```typescript
// src/api/query-keys.ts
export const flashcardKeys = {
  all: ['flashcards'] as const,
  due: () => [...flashcardKeys.all, 'due'] as const,
  deckDetail: (id: string) => [...flashcardKeys.all, 'deck', id] as const,
};

export const examKeys = {
  all: ['exams'] as const,
  attempt: (id: string) => [...examKeys.all, 'attempt', id] as const,
};
```

---

## 2. QUY CHUẨN HIỆU NĂNG MOBILE APP (REACT NATIVE EXPO SDK 51)

### 2.1. Hoạt họa Thẻ 3D Flashcard 60 FPS (Reanimated 3 Worklets)
Toàn bộ animation lật thẻ 3D (`rotateY`, `perspective`) bắt buộc phải chạy trên **Native UI Thread qua Worklets của React Native Reanimated 3**, cấm lạm dụng JS Thread:

```typescript
// src/components/flashcard/Flashcard3D.tsx
import React from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export const Flashcard3D: React.FC<{ isFlipped: boolean; front: React.ReactNode; back: React.ReactNode }> = ({
  isFlipped,
  front,
  back,
}) => {
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    rotate.value = withTiming(isFlipped ? 180 : 0, { duration: 400 });
  }, [isFlipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotate.value}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotate.value + 180}deg` }],
    backfaceVisibility: 'hidden',
  }));

  return (
    <Animated.View className="w-full h-80 items-center justify-center">
      <Animated.View style={[frontStyle, { position: 'absolute' }]}>{front}</Animated.View>
      <Animated.View style={[backStyle, { position: 'absolute' }]}>{back}</Animated.View>
    </Animated.View>
  );
};
```

### 2.2. Xử lý Bộ nhớ Âm thanh (Audio Memory Cleanup)
Khi khởi tạo instance âm thanh phát âm thẻ từ hoặc bài nghe TOEIC, **bắt buộc phải giải phóng bộ nhớ (`unloadAsync()`) trong cleanup function của `useEffect`**:

```typescript
// src/hooks/useAudioPlayer.ts
import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export const useAudioPlayer = (audioUrl: string | null) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadAudio = async () => {
      if (!audioUrl) return;
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      if (isMounted) soundRef.current = sound;
      else await sound.unloadAsync();
    };

    loadAudio();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [audioUrl]);
};
```

---

## 3. QUY CHUẨN ADMIN WEB PORTAL (NEXT.JS 14 APP ROUTER)

1. **Server Components Mặc định (RSC):** Mọi trang Dashboard, Báo cáo Lớp học, Danh sách Bài nộp mặc định là React Server Components để tối ưu tốc độ nạp trang ban đầu.
2. **Chỉ dùng `'use client'` khi cần thiết:** Tách nhỏ các Client Components tương tác (WaveSurfer Studio, Floating Annotation Toolbar, Audio Recorder) và chỉ thêm chỉ thị `'use client'` ở cấp thấp nhất.

---

## 4. QUY CHUẨN HTTP CLIENT & AUTHENTICATION PROTOCOL

Tất cả các API Callers sử dụng **Axios Instance tập trung** tích hợp Interceptors tự động đính kèm Bearer Token và xử lý làm mới Token ngầm (Silent Refresh Token Rotation) khi gặp lỗi HTTP 401:

```typescript
// src/api/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken(); // Lấy từ SecureStore hoặc Cookie
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data, // Unwrap tự động Response Envelope -> Trả về data trực tiếp
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { accessToken } = await performRefreshTokenRotation();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthSession();
        navigateToLoginScreen();
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);
```
