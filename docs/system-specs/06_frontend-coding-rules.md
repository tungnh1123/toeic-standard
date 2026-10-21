# QUY CHUẨN LẬP TRÌNH & HƯỚNG DẪN KIẾN TRÚC FRONTEND
## DỰ ÁN: HỆ THỐNG HỌC TIẾNG ANH & LUYỆN THI TOEIC TRỰC TUYẾN
* **Tên tài liệu:** Frontend Architecture & Coding Rules (Mobile App & Admin Web Portal)
* **Phiên bản:** 2.0.0 (Đồng bộ Toàn diện CSDL 35 Bảng v12.0 & API v11.0 - 62 Endpoints)
* **Ngày phát hành:** 12/10/2026
* **Nền tảng mục tiêu:**
  * **Mobile App (Học viên):** React Native (Expo SDK 51), TypeScript, NativeWind (Tailwind CSS v3), Reanimated, TanStack React Query v5.
  * **Web Portal (Giảng viên / Admin):** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI / Radix UI, WaveSurfer.js, TanStack React Query v5.
* **Trạng thái:** Đã phê duyệt & Bắt buộc áp dụng (Strict Enforcement)

---

## 1. TRIẾT LÝ KIẾN TRÚC & NGUYÊN TẮC PHÁT TRIỂN FRONTEND

1. **Kiến trúc Khách - Chủ Tách biệt (Decoupled Client-Server & Unified Data Envelope):**
   * Mọi giao tiếp dữ liệu giữa Frontend (Mobile/Web) và Backend NestJS đều phải tuân thủ chuẩn RESTful API v11.0 (62 Endpoints).
   * Dữ liệu trả về luôn được bọc trong Response Envelope chuẩn:
     ```json
     {
       "statusCode": 200,
       "success": true,
       "message": "Thao tác thành công",
       "data": { ... },
       "meta": { "page": 1, "limit": 10, "total": 100 },
       "timestamp": "2026-10-12T17:35:00.000Z"
     }
     ```
   * Frontend Axios Interceptor **bắt buộc unwrap tự động** lớp envelope này để trả về trực tiếp `response.data.data` cho tầng UI/Hooks.

2. **Quản lý Trạng thái Tách bạch (Server State vs. Client UI State):**
   * **Server State (90% dữ liệu):** Sử dụng **TanStack React Query v5** quản lý 100% việc fetch, cache, revalidate, optimistic update và polling. **Tuyệt đối không lưu dữ liệu API vào Redux/Zustand hay useState cục bộ**.
   * **Client UI State (10% còn lại):** Sử dụng **Zustand** hoặc React Context nhẹ cho các trạng thái giao diện nội bộ: Theme (Sáng/Tối), Thông tin phiên đăng nhập (Auth Session Token, User Profile), Trạng thái Modal/Drawer.

3. **Giao thức Upload Media Qua Presigned URL (Presigned Upload Protocol):**
   * **Quy tắc bất biến:** Tệp âm thanh bài nói Speaking (10MB–25MB), file audio nhận xét của giáo viên (FNC_ADM_09), ảnh avatar hay file âm thanh đính kèm **không bao giờ được gửi trực tiếp qua HTTP Multipart FormData lên server NestJS**.
   * **Quy trình 3 bước bắt buộc:**
     1. Client gọi API xin cấp Presigned URL: `POST /api/v1/submissions/presigned-url` (hoặc `/presigned-voice-feedback`).
     2. Client dùng `fetch()` tải tệp nhị phân trực tiếp lên S3/Cloudflare R2 Bucket thông qua `uploadUrl` vừa nhận (HTTP Method `PUT`).
     3. Client gửi `fileKey`/`fileUrl` thu được về Backend NestJS để lưu bản ghi vào PostgreSQL.

4. **An toàn Bảo mật & Phân quyền RBAC (Role-Based Authorization):**
   * Mobile App (Student): Lưu Access Token & Refresh Token trong `expo-secure-store`.
   * Web Portal (Admin/Teacher): Refresh Token lưu trong Cookie HttpOnly (`SameSite=Strict`), Access Token lưu trong bộ nhớ tạm/Cookie an toàn.
   * Cả hai nền tảng bắt buộc decode JWT Payload để kiểm tra thuộc tính `role` (`'ADMIN'`, `'TEACHER'`, `'STUDENT'`).
   * Next.js `middleware.ts` tự động điều hướng và chặn người dùng vai trò `STUDENT` khi cố tình truy cập `/admin/*` (trả về 403 Forbidden).

---

## 2. QUY CHUẨN THƯ MỤC DỰ ÁN (PROJECT DIRECTORY STRUCTURE)

### 2.1. Cấu trúc Dự án Mobile App (`apps/mobile` - React Native / Expo SDK 51)
```text
apps/mobile/src/
├── api/                            # Axios instance, Interceptors, API Client Services
│   ├── client.ts                   # Axios instance đính kèm Bearer Token & Refresh Token Rotation
│   ├── auth.api.ts                 # API Đăng nhập, Đăng ký, Profile
│   ├── flashcards.api.ts           # API Bộ thẻ CEFR, 3D Flashcards, SM-2 Review, Sổ tay STARRED
│   ├── grammar.api.ts              # API Bài đọc Markdown GFM, Quiz củng cố
│   ├── toeic.api.ts                # API Thi thử TOEIC 200 câu, Sync nháp Redis
│   ├── streak.api.ts               # API Trạng thái Streak, Heatmap 365 ngày, Freeze
│   └── analytics.api.ts            # API Radar 6 kỹ năng, Từ khó tự động
│
├── components/                     # React Native UI Components
│   ├── common/                     # Components tái sử dụng (Button, Input, Modal, Loading, Header)
│   ├── flashcards/                 # 3D Flip Card, SM-2 Control Bar (4 nút), Audio Player
│   ├── grammar/                    # GFM Callout Renderer, Dynamic TOC Drawer, Quiz Modal
│   ├── streak/                     # Flame Header Widget, Heatmap Calendar, Badge Popup
│   ├── analytics/                  # Hexagon Radar Chart SVG, Weakness Recommendation Card
│   └── toeic/                      # TOEIC Timer, 200-Question Grid, Audio Controller
│
├── hooks/                          # Custom React Query Hooks & UI Hooks
│   ├── useAuth.ts                  # Hook đăng nhập, đăng ký, đổi mật khẩu
│   ├── useFlashcards.ts            # Hook fetch thẻ đến hạn, mutation review SM-2
│   ├── useGrammar.ts               # Hook fetch bài đọc, mutation scroll progress, submit quiz
│   ├── useStreak.ts                # Hook trạng thái ngọn lửa Streak & Heatmap
│   └── useToeicExam.ts             # Hook phòng thi, sync nháp Redis 15s
│
├── navigation/                     # React Navigation / Expo Router Navigation
│   ├── AppNavigator.tsx            # Navigation tổng điều phối AuthStack & MainTab
│   ├── AuthStack.tsx               # Login, Register, Forgot Password
│   └── MainTabNavigator.tsx        # Tab Home, Decks, Grammar, Practice, Profile
│
├── store/                          # Zustand State Stores
│   ├── authStore.ts                # User Session & SecureStore Access Tokens
│   └── themeStore.ts               # Light/Dark mode settings
│
├── utils/                          # Utility Helper Functions
│   ├── sm2Algorithm.ts             # Tính toán dự đoán khoảng cách SM-2 client-side
│   ├── dateFormats.ts              # Format múi giờ YYYY-MM-DD Asia/Ho_Chi_Minh
│   └── audioPlayer.ts              # Expo Audio sound preloading & playback speed
│
├── App.tsx                         # Entry Point
└── index.js
```

### 2.2. Cấu trúc Dự án Admin Web Portal (`apps/web-admin` - Next.js 14 App Router)
```text
apps/web-admin/src/
├── app/                            # Next.js App Router Pages & Layouts
│   ├── (auth)/login/page.tsx       # Trang đăng nhập Admin / Giảng viên
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Layout chung SideBar + TopBar Admin
│   │   ├── page.tsx                # Overview Dashboard
│   │   ├── classes/                # Quản lý lớp học & Analytics Dashboard (FNC_ADM_10)
│   │   ├── assignments/            # Quản lý đề bài Template & Giao bài Deadline (FNC_ADM_03, 04, 05)
│   │   ├── submissions/            # Bảng điều phối bài nộp ADM0301 (FNC_ADM_06)
│   │   │   └── [id]/
│   │   │       ├── writing/        # Studio Chấm bài Writing chia đôi màn hình (FNC_ADM_07)
│   │   │       └── speaking/       # Studio Chấm bài Speaking WaveSurfer (FNC_ADM_08)
│   │   ├── questions/              # Quản lý Ngân hàng câu hỏi Quiz & Import Excel (FNC_ADM_02)
│   │   └── toeic-exams/            # Quản lý Kho đề TOEIC 200 câu & Import Excel 7 Sheets (FNC_ADM_12)
│   └── middleware.ts               # Next.js Auth & RBAC Guard Middleware
│
├── components/                     # Web Specific UI Components
│   ├── ui/                         # Shadcn UI Base Components (Button, Dialog, Select, Table, Badge)
│   ├── grading/                    # Text Annotation Toolbar, WaveSurfer Waveform, Voice Feedback Recorder
│   ├── assignments/                # Interactive Rubric Builder (100-pt Constraint Checker)
│   ├── questions/                  # Excel Pre-validation Table Preview
│   └── analytics/                  # Recharts Grade Distribution Histogram, At-risk Alerts Widget
│
├── hooks/                          # Custom React Query Hooks cho Web Admin
├── services/                       # Axios Client Services cho Admin
└── types/                          # TypeScript Interfaces & DTO Types
```

---

## 3. QUY CHUẨN ĐỒNG BỘ NẠP DỮ LIỆU & AXIOS CLIENT INTERCEPTOR

Mọi yêu cầu HTTP giữa Frontend và Backend NestJS bắt buộc được thực hiện thông qua instance Axios chuẩn hóa có cơ chế **Tự động Làm mới Token (Auto Refresh Token Rotation)**:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await SecureStore.getItemAsync('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = 'Bearer ' + accessToken;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        await SecureStore.setItemAsync('access_token', accessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync('refresh_token', newRefreshToken);
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = 'Bearer ' + accessToken;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const errorMessage = error.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    return Promise.reject(new Error(errorMessage));
  },
);
```

---

## 4. QUY CHUẨN TÍCH HỢP CHO TỪNG PHÂN HỆ HỌC VIÊN (FNC_STU_01 – 09)

### 4.1. Phân hệ Từ vựng CEFR, Thẻ 3D & SRS SM-2 (FNC_STU_02, 03, 04, 05)
1. **Lật thẻ 3D (3D Card Flip Animation):**
   * Sử dụng `rotateY` và `perspective: 1200` với Reanimated / NativeWind.
   * Mặt trước hiển thị Term, IPA, Part of Speech, nút Audio (1.0x / 0.8x) và Nút Đánh dấu sao nhanh.
   * Mặt sau hiển thị Định nghĩa tiếng Việt, Câu ví dụ, Dịch nghĩa, Collocations & Synonyms.
2. **Thanh 4 Nút Đánh giá Phản xạ SM-2:**
   * Bắt buộc thiết kế 4 nút với mã màu và nhãn chuẩn hóa:
     * **1: Quên** (Đỏ `#ef4444`) – Reset chuỗi n=0, I=1 ngày.
     * **2: Khó** (Cam `#f59e0b`) – Khoảng cách ngắn.
     * **3: Tốt** (Xanh dương `#2563eb`) – Khoảng cách chuẩn I = I * EF.
     * **4: Dễ** (Xanh lá `#10b981`) – Thưởng hệ số dEF = +0.10.
   * Trên giao diện Web/iPad: Bắt buộc đính kèm phím tắt bàn phím `1`, `2`, `3`, `4`.
3. **Thao tác Đánh dấu sao Nhanh (Quick Star):**
   * Nhấn biểu tượng Ngôi sao -> Gọi duy nhất API `POST /api/v1/student/notebooks/quick-star/:cardId`.
   * Tự động chuyển màu vàng rực và cập nhật đồng bộ sang Sổ tay `STARRED`.
4. **Sổ tay Thông minh Lọc Từ Khó (FNC_STU_05):**
   * Gọi API `GET /api/v1/student/analytics/troubled-words` để hiển thị danh sách từ học viên thường xuyên quên (EF <= 1.70).

### 4.2. Trình đọc Lý thuyết Ngữ pháp Markdown GFM & Quiz Củng cố (FNC_STU_06, 07)
1. **Render Khối Callout Chuẩn GFM:**
   * Cấu hình thư viện `react-native-markdown-display` (Mobile) hoặc `react-markdown` (Web) render các khối Callouts:
     * `[!FORMULA]`: Viền xanh dương, Background `#eff6ff`, Icon `Info` -> Khung công thức.
     * `[!WARNING]`: Viền đỏ, Background `#fff1f2`, Icon `AlertTriangle` -> Cảnh báo bẫy TOEIC.
     * `[!TIP]`: Viền vàng, Background `#fef3c7`, Icon `Lightbulb` -> Mẹo nhận biết nhanh.
2. **Bóc tách Mục lục Động (Dynamic TOC Drawer):**
   * Phân tích Regex trích xuất `#`, `##` từ `contentMarkdown` tạo danh sách Anchors cho phép bấm nhảy nhanh đến phần tương ứng.
3. **Theo dõi Tiến độ Đọc & Chuyển Quiz:**
   * Khi cuộn trang đạt `scrollPercentage >= 80%` hoặc bấm "Đã hiểu bài" -> Gọi `POST /api/v1/student/grammar/lessons/:id/progress`.
   * Nếu `hasQuiz = true` -> Hiển thị nút "Làm Quiz (10 câu)" dẫn sang màn hình `GrammarQuizScreen`.
4. **Chống Gian lận Bài thi Quiz (Anti-Cheat Quiz Screen):**
   * Tải câu hỏi từ `GET /grammar/lessons/:id/quiz` (đáp án đúng và lời giải đã được ẩn từ Backend).
   * Hiển thị đếm giờ đếm ngược, thanh tiến độ, cảnh báo khi nộp bài chưa làm hết.
   * Khi nộp bài (`POST /quiz/submit`) -> Hiển thị Modal Báo cáo Kết quả kèm Giải thích Chi tiết từng câu và Bẫy đề thi.

### 4.3. Ngọn Lửa Chuyên Cần Streak & Radar 6 Kỹ năng (FNC_STU_08, 09)
1. **Flame Widget trên Header:**
   * Gọi `GET /api/v1/student/streak/status` hiển thị số ngày `currentStreak` và màu ngọn lửa (Cam rực nếu `isCompletedToday = true`, Xám nếu chưa hoàn thành).
   * Bấm vào ngọn lửa -> Mở Modal hiển thị số Vé bảo lưu `freezeCreditsRemaining`, Lịch chấm công 365 ngày Heatmap và Danh sách Huy hiệu Mốc chuyên cần (`streak_badges`).
2. **Biểu đồ Mạng Nhện SVG Hexagon Radar Chart (FNC_STU_09):**
   * Sử dụng `react-native-svg` vẽ đa giác 6 đỉnh tương ứng 6 kỹ năng (Từ vựng, Ngữ pháp, Nghe TOEIC, Đọc TOEIC, Viết, Nói).
   * Hiển thị Điểm TOEIC dự đoán (10 - 990) và Cấp độ CEFR (A1 - C2).
   * Render 2 Thẻ Gợi ý Điểm Yếu Cần Cải Thiện (`weaknesses`) dẫn trực tiếp sang bài học khắc phục tương ứng.

### 4.4. Động cơ Thi thử TOEIC 200 Câu (MOD_EXM)
1. **Giao diện Phòng thi Mô phỏng ETS 120 Phút:**
   * Đồng hồ đếm ngược 120:00. Ma trận 200 câu hỏi chia theo Part 1 – Part 7.
   * Nút Cắm cờ (Flag) nghi vấn câu hỏi.
2. **Đồng bộ Đáp án Nháp Thời gian Thực (Redis Syncing):**
   * Mỗi khi thí sinh chọn hoặc đổi đáp án một câu -> Tự động gửi ngầm `PATCH /api/v1/exams/attempts/:id/answers` (ghi trực tiếp vào Redis Hash, không gây giật lag).
3. **Trình phát Audio Part 1–4:**
   * Ở chế độ thi chuẩn Full Test: Khóa hoàn toàn chức năng tua lùi audio để đảm bảo tính khách quan kỳ thi.

---

## 5. QUY CHUẨN DÀNH CHO CỔNG QUẢN TRỊ & GIẢNG DẠY WEB PORTAL (FNC_ADM_01 – 12 v2)

### 5.1. Soạn Đề & Giao Bài tập Độc lập Deadline (FNC_ADM_03, 04, 05 v2)
1. **Trình Dựng Thang Điểm Rubric (Interactive Rubric Builder):**
   * Khi giáo viên soạn bài luận Writing hoặc bài nói Speaking -> Bắt buộc có kiểm tra kiểm soát tổng điểm 4 tiêu chí phải đúng bằng **100 điểm** (sum maxScore = 100). Nút "Lưu đề" bị vô hiệu hóa nếu tổng điểm khác 100.
2. **Giao Bài tập Độc lập Deadline Theo Lớp (AssignToClassModal):**
   * Đề bài gốc Template không chứa hạn nộp.
   * Khi giao bài, giáo viên chọn Lớp A -> Nhập `dueDate` riêng (phải sau thời điểm giao ít nhất 2 giờ). API gửi `POST /api/v1/admin/assignments/:id/assign` lưu hạn nộp riêng vào `assignment_targets`.

### 5.2. Bảng Điều phối Bài nộp ADM0301 (FNC_ADM_06 v2)
1. **Bộ Lọc Đa Tiêu Chí:**
   * Lọc theo Lớp học, Kỹ năng (`WRITING`, `SPEAKING`, `QUIZ`), Trạng thái (`SUBMITTED`, `GRADING`, `GRADED`, `ALL`) và Tìm kiếm tên/email học viên.
2. **Hệ thống Cảnh báo SLA 48 Giờ:**
   * Hiển thị Badge Đỏ cảnh báo ⚠️ đối với các bài nộp ở trạng thái `SUBMITTED` có `submittedAt` quá 48 giờ mà giáo viên chưa hoàn thành chấm điểm.

### 5.3. Studio Chấm Bài Writing & Speaking v2.0 (FNC_ADM_07, 08, 09 v2)
1. **Writing Studio chia đôi màn hình (Split-Screen UI):**
   * Cột trái: Văn bản bài luận của học viên. Cho phép bôi đen đoạn văn để hiện Floating Toolbar đính kèm mã lỗi (`GRAMMAR`, `VOCABULARY`, `SPELLING_PUNCTUATION`, `PRAISE`) và câu sửa mẫu (`correction_suggestion`).
   * Cột phải: Phiếu chấm điểm Rubric 4 tiêu chí + Ô nhập nhận xét chung + Widget Thu âm giọng nói.
2. **Speaking WaveSurfer Studio (Waveform Visualizer):**
   * Tích hợp `WaveSurfer.js` vẽ sóng âm bài thu âm.
   * Cho phép bấm trực tiếp lên sóng âm để cắm cờ mốc thời gian (`startTime`, `endTime`, `comment`). Khi bấm vào mốc cờ, trình nghe tự động tua lại đúng giây đó.
3. **Thu âm Phản hồi Giọng nói (Teacher Voice Note):**
   * Sử dụng `MediaRecorder API` ghi âm tối đa 300 giây (5 phút). Tải file `.webm`/`.m4a` trực tiếp lên S3 qua Presigned PUT URL.
4. **Công bố Kết quả Chấm Điểm:**
   * Bấm "Lưu nháp" -> Gọi `POST /admin/submissions/:id/review` với `isPublished = false` (chuyển trạng thái bài nộp sang `GRADING`).
   * Bấm "Công bố điểm" -> Gọi `POST /admin/submissions/:id/review` với `isPublished = true` (chuyển trạng thái sang `GRADED`, đánh dấu `is_completed = true` và kích hoạt ngầm BullMQ gửi FCM Push Notification).

### 5.4. Master Content & Import Excel Đề thi TOEIC 200 Câu (FNC_ADM_12 v2)
1. **Pre-validation Preview 7 Sheets Excel:**
   * Đọc tệp Excel 7 Sheets (Part 1 đến Part 7). Hiển thị bảng tổng hợp số lượng câu hỏi trước khi bấm nút xác nhận.
   * Cảnh báo lỗi ngay nếu Sheet nào không đủ số lượng câu cứng quy định (Part 1: 6 câu, Part 2: 25 câu, Part 3: 39 câu, Part 4: 30 câu, Part 5: 30 câu, Part 6: 16 câu, Part 7: 54 câu -> Tổng đúng 200 câu).

---

## 6. CHECKLIST KIỂM THỬ GIAO DIỆN FRONTEND (DEVELOPER CHECKLIST)

* [ ] Tất cả các API calls đều qua `apiClient` instance, không dùng `fetch()` hay `axios` rời rạc.
* [ ] Dữ liệu API trả về được unwrap tự động qua Interceptor (dùng trực tiếp `data.title`, không truy cập `data.data.title`).
* [ ] Đã cấu hình `expo-secure-store` (Mobile) và Cookie HttpOnly (Web) an toàn.
* [ ] Mọi thao tác Upload file Media đều xin Presigned URL trước khi PUT lên S3.
* [ ] Nút 4 mức đánh giá SM-2 trên Mobile/Web hiển thị đúng mã màu và phím tắt `1`, `2`, `3`, `4`.
* [ ] Modal Quiz Ngữ pháp không lộ đáp án đúng trong Inspect/Network Tab trước khi nộp.
* [ ] Mọi màn hình danh sách phân trang (Decks, Questions, Submissions) đều có Skeleton Loading và Error Boundary.
* [ ] Studio chấm bài Writing/Speaking gửi kết quả qua duy nhất API `POST /admin/submissions/:id/review`.
