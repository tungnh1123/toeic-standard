# QUY CHUẨN LẬP TRÌNH & QUY TẮC PHÁT TRIỂN BACKEND NESTJS
## DỰ ÁN: HỆ THỐNG HỌC TIẾNG ANH & LUYỆN THI TOEIC TRỰC TUYẾN
* **Tên tài liệu:** NestJS Backend Architecture & Coding Rules
* **Phiên bản:** 2.0.0 (Chuẩn hóa toàn diện theo CSDL 34 Bảng v11.0 & API v11.0 - 62 Endpoints)
* **Ngày cập nhật:** 12/10/2026
* **Công nghệ cốt lõi:** Node.js (NestJS 10+), TypeScript, PostgreSQL 16, Redis 7, BullMQ, TypeORM, AWS S3 / Cloudflare R2
* **Trạng thái:** Đã phê duyệt & Bắt buộc áp dụng (Strict Enforcement)

---

## 1. TRIẾT LÝ KIẾN TRÚC & NGUYÊN TẮC CỐT LÕI

Toàn bộ lập trình viên phát triển tầng Backend NestJS bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc kiến trúc sau:

1. **Modular Architecture (Cấu trúc Mô-đun Độc lập):**
   * Mỗi phân hệ nghiệp vụ (`auth`, `users`, `flashcards`, `grammar`, `toeic`, `assignments`, `submissions`, `grading`, `analytics`, `media`, `notifications`) được đóng gói thành một NestJS Module riêng biệt.
   * Các module chỉ giao tiếp với nhau qua Service public do module khác `export` hoặc qua hệ thống Event/Queue ngầm (**BullMQ**). Tuyệt đối không import trực tiếp Repository của module khác.

2. **Thin Controller - Fat Service (Controller Mỏng - Service Dày):**
   * **Controller**: Chỉ tiếp nhận HTTP Request/WebSocket Frame, kiểm tra quyền (Guards), validate DTOs (Pipes) và gọi sang Service. **Không chứa bất kỳ câu lệnh SQL, TypeORM query hay logic tính toán toán học/nghiệp vụ nào**.
   * **Service**: Chứa 100% logic nghiệp vụ, tính toán toán học (SM-2, quy đổi điểm ETS, Radar 6 kỹ năng), điều phối CSDL Transaction và tương tác với Redis/BullMQ.

3. **Tách biệt DTOs, Domain Entities & CSDL Models:**
   * DTOs (`Create...Dto`, `Update...Dto`, `Response...Dto`) là hợp đồng giao tiếp API với Client. Bắt buộc dùng `class-validator` và `class-transformer`.
   * TypeORM Entity chỉ ánh xạ trực tiếp các bảng CSDL PostgreSQL 16 (34 Bảng v11.0).
   * Tên thuộc tính trong TypeScript/NestJS dùng **camelCase**, tên cột/bảng trong PostgreSQL 16 DDL dùng **snake_case**.

4. **Bảo toàn Tính Toàn vẹn Dữ liệu qua CSDL Transaction:**
   * Mọi tác vụ ghi/sửa dữ liệu liên quan đến nhiều bảng (VD: Nộp bài thi TOEIC, Đánh giá SM-2, Chấm điểm Rubric, Giao bài tập theo lớp, Nộp bài Quiz ngữ pháp) **bắt buộc phải bọc trong `this.dataSource.transaction(async manager => ...)`**.

---

## 2. QUY CHUẨN THƯ MỤC DỰ ÁN (PROJECT DIRECTORY LAYOUT)

Cấu trúc dự án tuân thủ sơ đồ tổ chức chuẩn hóa:

```text
src/
├── common/                         # Tài nguyên tái sử dụng dùng chung cho toàn dự án
│   ├── constants/                  # Hằng số hệ thống, Mã lỗi chuẩn hóa (ERR_AUTH_001, ERR_VAL_002)
│   ├── decorators/                 # Custom Decorators (@CurrentUser(), @Roles(), @Public())
│   ├── filters/                    # Global Exception Filters (AllExceptionsFilter)
│   ├── guards/                     # Auth & Authorization (JwtAuthGuard, RolesGuard)
│   ├── interceptors/               # LoggingInterceptor, TransformResponseInterceptor
│   └── pipes/                      # Custom Validation Pipes (ParseUUIDPipe, SanitizeHtmlPipe)
│
├── config/                         # Validate & Quản lý biến môi trường (.env)
│   ├── database.config.ts          # PostgreSQL 16 Connection Pool
│   ├── redis.config.ts             # Redis 7 Cache & BullMQ Options
│   └── storage.config.ts           # S3 / Cloudflare R2 Client Config
│
├── database/                       # Hạ tầng Cơ sở dữ liệu
│   ├── migrations/                 # Migration scripts (PostgreSQL DDL v11.0)
│   └── seeds/                      # Seed data (Bảng quy đổi ETS, Decks CEFR A1-C2, Badges)
│
├── modules/                        # Các Module nghiệp vụ chức năng chính (11 Modules)
│   ├── auth/                       # Đăng nhập, Đăng ký, Refresh Token Rotation
│   ├── users/                      # Hồ sơ người dùng, Điểm mục tiêu TOEIC, Lớp học
│   ├── flashcards/                 # Bộ thẻ CEFR, 3D Flashcard, Thuật toán SRS SM-2, Sổ tay STARRED
│   ├── grammar/                    # Lý thuyết Ngữ pháp Markdown GFM, Quiz củng cố
│   ├── toeic/                      # Động cơ thi TOEIC 200 câu, Sync nháp Redis, Scale ETS
│   ├── assignments/                # Quản lý đề bài tập Template, Giao bài theo lớp/cá nhân
│   ├── submissions/                # Nộp bài Writing/Speaking, S3 Presigned PUT URL
│   ├── grading/                    # Studio chấm bài, Rubric 4 tiêu chí, Feedback audio/highlight
│   ├── analytics/                  # Streak Gamification Engine, Radar 6 kỹ năng
│   ├── media/                      # Xử lý S3 Presigned URL (Audio Speaking, Avatar)
│   └── notifications/              # Firebase FCM Push Notification, Mailer Service
│
├── jobs/                           # Background Workers & Queue Processors (BullMQ)
│   ├── audio-processor.consumer.ts # Bitrate audio Speaking
│   └── notification.consumer.ts    # FCM Push & Email ngầm
│
├── app.module.ts                   # Root Module
└── main.ts                         # Entry Point khởi động NestJS
```

---

## 3. QUY TẮC THIẾT KẾ RESTFUL API & CONTROLLERS

### 3.1. Chuẩn hóa Endpoint Naming & HTTP Methods
1. **Base Path:** `/api/v1/`
2. **Quy tắc đặt tên URI:**
   * Sử dụng danh từ số nhiều, chữ thường, cách nhau bằng dấu gạch ngang (kebab-case): `/api/v1/student/flashcards`, `/api/v1/admin/assignments`.
   * Endpoint dành riêng cho Học viên có tiền tố `/student/`, dành riêng cho Giảng viên/Admin có tiền tố `/admin/`.
3. **HTTP Method Mappings:**
   * `GET`: Trích xuất danh sách hoặc chi tiết dữ liệu (Không thay đổi trạng thái CSDL).
   * `POST`: Tạo mới tài nguyên, gửi dữ liệu chấm điểm/nộp bài, hoặc thao tác thay đổi trạng thái phức tạp (`/review`, `/submit`, `/quick-star`).
   * `PUT`: Cập nhật toàn bộ/ghi đè thông tin tài nguyên.
   * `PATCH`: Cập nhật từng phần (VD: Đồng bộ đáp án nháp thi TOEIC `PATCH /exams/attempts/:id/answers`).
   * `DELETE`: Xóa tài nguyên.

### 3.2. Chuẩn hóa Phản hồi (Standard Response Envelope)
Mọi Controller Endpoint thành công **bắt buộc** phải trả về dữ liệu được bọc tự động qua `TransformResponseInterceptor`:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Thao tác thành công",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  },
  "timestamp": "2026-10-12T03:22:00.000Z"
}
```

### 3.3. Validate DTOs & Parameters
* Mọi tham số ID trên URL đại diện cho khóa chính CSDL bắt buộc phải kiểm tra dạng UUID v4 bằng `ParseUUIDPipe`:
  ```typescript
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
  ```
* Mọi DTO đầu vào bắt buộc được khai báo decorators Class-Validator:
  ```typescript
  export class CreateNotebookDto {
    @IsString()
    @IsNotEmpty({ message: 'Tiêu đề sổ tay không được để trống' })
    @MaxLength(150)
    title: string;
  }
  ```
* Kích hoạt `ValidationPipe` toàn cục trong `main.ts`:
  ```typescript
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  ```

---

## 4. QUY TẮC BẢO MẬT & XÁC THỰC PHÂN QUYỀN (AUTH & RBAC)

1. **Cơ chế Token Kép (Dual-Token Architecture):**
   * **Access Token (JWT):** Thời hạn 15 phút, đính kèm trong HTTP Header: `Authorization: Bearer <access_token>`.
   * **Refresh Token (JWT Hash):** Thời hạn 7 ngày, lưu vào bảng CSDL `user_refresh_tokens` (chứa `token_hash`, `ip_address`, `user_agent`, `is_revoked`, `expires_at`).
   * Dùng chung 1 bảng `user_refresh_tokens` cho cả **ADMIN**, **TEACHER** và **STUDENT**.

2. **Cơ chế Refresh Token Rotation:**
   * Khi đổi Access Token mới qua `POST /api/v1/auth/refresh-token`, Refresh Token cũ sẽ bị vô hiệu hóa (`is_revoked = true`) và cấp lại một cặp token mới.

3. **Phân quyền Role-Based Access Control (RBAC):**
   * Sử dụng kết hợp `@UseGuards(JwtAuthGuard, RolesGuard)` và Decorator `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
   * **ADMIN:** Toàn quyền quản trị tài khoản, cấu hình hệ thống, nhập đề thi TOEIC chuẩn, duyệt kho từ vựng và xem bài nộp toàn trường.
   * **TEACHER:** Giới hạn quyền trong phạm vi các lớp học phụ trách (`c.teacher_id = :teacherId OR a.created_by = :teacherId`). Được tạo đề, giao bài, xem bài nộp và chấm điểm học viên thuộc lớp mình.
   * **STUDENT:** Chỉ xem bài học, làm bài thi, nộp bài tập và xem kết quả của chính mình.

---

## 5. QUY TẮC DỮ LIỆU & TRUY VẤN POSTGRESQL 16 (TYPEORM RULES)

Tuân thủ sơ đồ CSDL PostgreSQL 16 v11.0 (34 Bảng chuẩn hóa):

1. **Độc lập Deadline Bài tập (Decoupled Assignment Deadline):**
   * Bảng đề bài gốc `assignments` đóng vai trò là **Bản mẫu (Template)**, **không chứa cột `due_date`**.
   * Bảng phân công `assignment_targets` chứa `due_date TIMESTAMPTZ NOT NULL` và `class_id UUID REFERENCES classes(id)`. Khi giao bài, phải lưu deadline riêng biệt vào `assignment_targets`.

2. **Triệt tiêu Lỗi Nhân bản Bản ghi khi Lọc Submissions:**
   * Bảng `assignment_submissions` lưu trực tiếp `target_id` và `class_id REFERENCES classes(id)`.
   * Khi truy vấn lọc bài nộp theo lớp ở `SubmissionsManagementService`, **bắt buộc JOIN trực tiếp qua `s.class_id`**, tuyệt đối không JOIN qua `class_enrollments` để tránh lỗi nhân bản dòng (Cartesian Product).

3. **Truy vấn Trạng thái Từ vựng SM-2 Trực tiếp:**
   * Bảng `user_flashcard_progress` chứa cột `status` kiểu Enum (`'NEW'`, `'LEARNING'`, `'MASTERED'`).
   * Truy vấn phân loại từ vựng phải sử dụng trực tiếp cột `status`, tuyệt đối không dùng đếm gián tiếp qua `interval_days` hay `repetition_count`.

4. **Cho phép `toeic_questions.options` nhận NULL:**
   * Cột `options` trong `toeic_questions` là `NULLable` phục vụ cho các câu hỏi nghe tranh Part 1 và hỏi-đáp Part 2 (không in text phương án).

5. **Tránh Lỗi So sánh Kiểu Dữ liệu Ngày trong NestJS:**
   * Cột ngày kiểu `DATE` trong PostgreSQL (như `user_streaks.last_activity_date`) khi so sánh với ngày hôm nay phải chuyển đổi đồng nhất về dạng chuỗi ISO `YYYY-MM-DD` theo múi giờ tài khoản học viên (VD: `Asia/Ho_Chi_Minh`):
     ```typescript
     const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
     ```

---

## 6. QUY TẮC THIẾT KẾ CÁC ĐỘNG CƠ NGHIỆP VỤ CỐT LÕI

### 6.1. Động cơ Thuật toán Lặp lại Ngắt quãng SM-2 (`FlashcardsModule`)
* Thang điểm đánh giá phản xạ: $q \in \{1, 2, 3, 4\}$ (1: Quên, 2: Khó, 3: Tốt, 4: Dễ).
* **Công thức cập nhật Ease Factor:**
  $$\Delta EF = 0.1 - (5 - (q + 1)) 	imes (0.08 + (5 - (q + 1)) 	imes 0.02)$$
  * $q = 4$ ("Dễ") $\implies \Delta EF = +0.10$.
  * Ràng buộc ngưỡng sàn an toàn: $EF_{	ext{mới}} = \max(EF', 1.30)$.
* **Chuỗi lặp và khoảng cách:**
  * Nếu $q \ge 3$: $n_{	ext{mới}} = n + 1$. Khi $n=1 \implies I=1$; $n=2 \implies I=6$; $n > 2 \implies I = 	ext{round}(I_{	ext{cũ}} 	imes EF_{	ext{mới}})$. Trạng thái nâng lên `'LEARNING'` hoặc `'MASTERED'` (khi $I > 21$ và $n \ge 3$).
  * Nếu $q < 3$ ("Quên/Khó"): Reset chuỗi $n_{	ext{mới}} = 0$, khoảng cách $I_{	ext{mới}} = 1$ ngày, trạng thái đưa về `'LEARNING'`.

### 6.2. Đánh dấu sao & Sổ tay Từ vựng (`FlashcardsModule`)
* **Hợp nhất Bookmark:** Loại bỏ các bảng bookmark riêng biệt. Toàn bộ thao tác đánh dấu sao từ vựng (trên thẻ 3D, bài thi hay sổ tay) hợp nhất lưu chung vào **Sổ tay hệ thống `STARRED`** trong bảng `user_notebook_cards`.
* Thao tác Đánh dấu sao nhanh qua duy nhất Endpoint: `POST /api/v1/student/notebooks/quick-star/:cardId`.
* Báo cáo Từ khó cứu trợ: Tách thành API phân tích tĩnh `GET /api/v1/student/analytics/troubled-words` (truy vấn động các từ có $EF \le 1.70$), không tạo dòng sổ tay giả trong CSDL.

### 6.3. Động cơ Thi thử TOEIC 200 câu & Sync nháp Redis (`ToeicModule`)
* **Đồng bộ đáp án nháp:** Thí sinh chọn đáp án câu nào, client gửi `PATCH /api/v1/exams/attempts/:id/answers`. Backend ghi trực tiếp vào **Redis Hash** `attempt:{attemptId}:answers`. Không ghi CSDL PostgreSQL trong lúc đang thi để đảm bảo phản hồi < 5ms.
* **Nộp bài & Chấm tự động:** Khi nộp bài (`POST /exams/attempts/:id/submit`), Backend đọc toàn bộ đáp án từ Redis Hash, so khớp với `toeic_questions.correct_option`, tính Raw Score Nghe/Đọc và tra bảng quy đổi điểm chuẩn ETS (**ETS Scale Mapping Table**) để lưu `total_score` ($10 - 990$) vào `toeic_exam_attempts`.

### 6.4. Động cơ Chuỗi Chuyên cần Tập trung (`AnalyticsModule`)
* **Duy nhất một Service điều phối Streak:** Tất cả các module (`FlashcardsModule`, `GrammarModule`, `SubmissionsModule`, `ToeicModule`) khi học viên hoàn thành hoạt động hợp lệ **bắt buộc phải gọi tập trung qua `StreakEngineService.recordValidActivity(payload)`**.
* **Xử lý Vé Bảo lưu (Streak Freeze):** Khi đứt chuỗi 1 ngày ($diffDays = 2$), `StreakEngineService` tự động trừ 1 vé `freeze_credits` (tối đa 2 vé/tháng) để bảo lưu ngọn lửa Streak.
* Ghi nhật ký đầy đủ vào `user_streak_activities` và tự động kiểm tra mở khóa huy hiệu chuyên cần trong `streak_badges`.

### 6.5. Động cơ Skill Radar 6 Kỹ năng (`AnalyticsModule`)
* Điểm 6 kỹ năng (Vocabulary, Grammar, Listening, Reading, Writing, Speaking) được chuẩn hóa trên thang 100.
* Tự động chẩn đoán 2 điểm yếu nhất và tạo gợi ý bài học khắc phục (`weaknesses`).
* Lưu bản ghi ảnh chụp lịch sử tăng trưởng năng lực định kỳ vào bảng `user_skill_history`.

### 6.6. Studio Chấm bài Writing & Speaking (`GradingModule`)
* Giảng viên chấm điểm Rubric 4 tiêu chí (thang điểm 100), bôi đen highlight sửa lỗi văn bản (`inline_feedback`) và đính kèm audio nhận xét giọng nói.
* Xử lý trong một CSDL Transaction duy nhất: Lưu `submission_reviews`, chuyển trạng thái `assignment_submissions.status = 'GRADED'`, đánh dấu `assignment_targets.is_completed = true` và đẩy tác vụ gửi FCM Push Notification/Email vào hàng đợi ngầm **BullMQ**.

---

## 7. QUY TẮC XỬ LÝ MEDIA & BĂNG THÔNG S3 / CLOUDFLARE R2

1. **Tuyệt đối không upload file lớn qua Server NestJS:**
   * Đối với file audio bài nộp Speaking (10MB–25MB) và file audio phát âm mẫu của giáo viên, Client bắt buộc phải gọi API lấy **Presigned PUT URL** (`POST /api/v1/submissions/presigned-url` hoặc `POST /api/v1/admin/assignments/speaking/sample-presigned-url`).
2. **Quy trình Upload Media:**
   * Client xin Presigned URL $\implies$ NestJS cấp S3 Presigned PUT URL (hiệu lực 15 phút) $\implies$ Client upload trực tiếp từ thiết bị lên S3/R2 Bucket $\implies$ Client gửi `fileKey` / `fileUrl` về Backend để lưu bản ghi.

---

## 8. QUY TẮC XỬ LÝ LỖI TOÀN CỤC & HÀNG ĐỢI NGẦM (ERROR HANDLING & BULLMQ)

1. **Global Exception Filter (`AllExceptionsFilter`):**
   * Tất cả các ngoại lệ nghiệp vụ (`HttpException`) và lỗi CSDL (Duplicate Key `23505`, Foreign Key `23503`) bắt buộc phải được bắt lại và trả về format lỗi chuẩn hóa:
     ```json
     {
       "statusCode": 400,
       "success": false,
       "errorCode": "ERR_VAL_003",
       "message": "Thông tin đầu vào không hợp lệ",
       "timestamp": "2026-10-12T03:22:00.000Z"
     }
     ```

2. **Cách ly Tác vụ Bằng BullMQ Workers:**
   * Bất kỳ tác vụ nào tiêu tốn trên 100ms processing time (gửi Email báo điểm, bắn Push Notification Firebase FCM, nén bitrate audio) **bắt buộc phải đẩy vào BullMQ Queue** (`@InjectQueue('notifications')`).
   * Các Worker/Consumers nằm trong thư mục `src/jobs/` sẽ tiếp nhận và xử lý bất đồng bộ ngầm.

---

## 9. CHECKLIST KIỂM TRƯỚC KHI COMMIT CODE (DEVELOPER CHECKLIST)

* [ ] Controller không chứa logic SQL QueryBuilder / TypeORM Repository.
* [ ] Tất cả các DTOs đầu vào đều có decorators `class-validator` và tham số URL ID có `ParseUUIDPipe`.
* [ ] Tác vụ thay đổi dữ liệu nhiều bảng được bọc trong `dataSource.transaction(...)`.
* [ ] Đã kiểm tra không có câu lệnh JOIN qua `class_enrollments` làm nhân bản dòng khi lọc bài nộp.
* [ ] Đã gọi tập trung `StreakEngineService.recordValidActivity(...)` khi hoàn thành bài học.
* [ ] Đã đính kèm Header Authorization Bearer Token trên Swagger / Postman khi test APIs bảo vệ.
* [ ] Mã nguồn đã pass qua `eslint` và `prettier` mà không có cảnh báo hay lỗi.
