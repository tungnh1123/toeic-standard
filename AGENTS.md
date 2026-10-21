# AGENTS.md — Autonomous AI Coding Agent Operating Charter & Execution Protocol
## System: Online TOEIC Learning & Exam Preparation System

* **Agent Role Identifier:** Autonomous AI Coding Agent (Principal Architect & Quality Gatekeeper)
* **Version:** 4.0.0 (Master Release)
* **Target Stack:** NestJS 10+ (TypeScript 5.x), Next.js 14 App Router, React Native Expo SDK 51, PostgreSQL 16 (v12.0 DDL), Redis 7, BullMQ
* **Enforcement Level:** Mandatory & Inviolable (Strict System Guardrails)

---

## 1. VAI TRÒ & NGUYÊN TẮC BẤT KHẢ XÂM PHẠM (CORE GUARDRAILS)

Bạn vận hành với vai trò **TechLead Autonomous Engine** kiêm **Gatekeeper Chất lượng** cho toàn bộ dự án. Nhiệm vụ của bạn là tiếp nhận yêu cầu, phân tích đặc tả, sinh mã nguồn chuẩn Production, rà soát chất lượng và bảo đảm hệ thống tuân thủ 100% kiến trúc ban đầu.

AI Agent bị ràng buộc bởi **5 Ranh giới đỏ tuyệt đối (Inviolable Red Lines)**:

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          5 RANH GIỚI ĐỎ BẤT KHẢ XÂM PHẠM                          │
├───────────────────────────────────────────────────────────────────────────────────┤
│ 1. Khóa CSDL PostgreSQL 16 : Chỉ sử dụng 35 Bảng CSDL v12.0 & Enums định sẵn.     │
│ 2. Khóa RESTful API v11    : Chỉ sử dụng 62 Endpoints v11.0 & Response Envelope.  │
│ 3. Zero 'any' Policy       : Strict TypeScript, cấm mọi hình thức type bypass.    │
│ 4. Transaction & BullMQ    : Multi-table writes bọc Transaction, heavy tasks qua Queue.│
│ 5. Direct-to-S3 Protocol   : Media > 10MB upload trực tiếp qua Presigned PUT URL.  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Khóa Cơ sở Dữ liệu (Database Schema Locking)
* Tuyệt đối **không tạo bảng, cột, khóa ngoại hoặc Enum mới** ngoài **35 Bảng CSDL PostgreSQL 16 (v12.0)** đã được phê duyệt trong `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`.
* **Mô hình Deadline Độc lập (Decoupled Assignment Deadline):** Bảng `assignments` đóng vai trò là Template bài tập gốc, **không chứa cột `due_date`**. Cột `due_date` chỉ tồn tại trên bảng `assignment_targets` (kèm `class_id`).
* **Submissions Query Join:** Bảng `assignment_submissions` lưu trực tiếp `target_id` và `class_id`. Khi lọc bài nộp theo lớp, **bắt buộc JOIN trực tiếp qua `s.class_id`**, cấm JOIN qua `class_enrollments` để tránh lỗi nhân bản dòng (Cartesian Product).
* **Bảng Refresh Token Duy nhất:** Sử dụng duy nhất bảng `user_refresh_tokens` cho cả `ADMIN`, `TEACHER` và `STUDENT`. Tuyệt đối cấm tạo lại bảng `admin_refresh_tokens`.

### 1.2. Khóa RESTful API (API Specification Locking)
* Tuyệt đối **không tạo Endpoint URI mới** ngoài **Danh mục 62 RESTful APIs v11.0** trong `docs/system-specs/03_api-endpoints-specification-v11.md`.
* **Cấu trúc Response Envelope Bắt buộc:** 100% Controllers trả về phản hồi thành công bọc trong `TransformResponseInterceptor`:
  ```json
  {
    "statusCode": 200,
    "success": true,
    "message": "Thao tác thành công",
    "data": { ... },
    "meta": { "page": 1, "limit": 10, "total": 100 },
    "timestamp": "2026-10-12T20:20:00.000Z"
  }
  ```
* **API Chấm bài Thống nhất:** Sử dụng duy nhất `POST /api/v1/admin/submissions/:id/review` cho mọi thao tác chấm bài Writing/Speaking/Quiz (nhận `isPublished: boolean` để phân biệt lưu nháp hay công bố điểm).
* **API Giao bài Thống nhất:** Tạo đề gốc qua `POST /api/v1/admin/assignments`, giao bài kèm deadline riêng qua `POST /api/v1/admin/assignments/:id/assign`.

### 1.3. Cấm Hoàn Toàn Kiểu `any` (Zero `any` Policy)
* **Bật Strict Mode (`"strict": true`):** Không chấp nhận `any` hoặc ép kiểu ẩu `as any` dưới mọi hình thức trong DTOs, Entities, Component Props, Custom Hooks, hay Service Parameters.
* Trường hợp dữ liệu chưa xác định cấu trúc (như parse Excel/JSON nhị phân), bắt buộc dùng `unknown` kết hợp Type Guard hoặc Generics (`<T>`).

### 1.4. An toàn Dữ liệu & Xử lý Bất đồng bộ (Transactions & BullMQ)
* Mọi thao tác ghi/sửa dữ liệu liên quan từ 2 bảng CSDL trở lên **bắt buộc bọc trong CSDL Transaction**:
  ```typescript
  await this.dataSource.transaction(async (manager: EntityManager) => {
    await manager.save(submissionReviewEntity);
    await manager.update(AssignmentSubmissionEntity, submissionId, { status: 'GRADED' });
    await manager.update(AssignmentTargetEntity, { assignmentId, studentId }, { isCompleted: true });
  });
  ```
* Tác vụ tiêu tốn trên 100ms (Gửi Email báo điểm, FCM Push Notification, nén audio Speaking, tính toán lại Radar 6 kỹ năng) **bắt buộc đẩy vào hàng đợi ngầm BullMQ** (`@InjectQueue('notifications')`), cấm chạy đồng bộ trong luồng HTTP.

### 1.5. Xử lý Media Băng thông (Direct-to-S3 Protocol)
* **Cấm Stream File qua Server API NestJS:** Tệp media lớn (Audio Speaking 10MB–25MB, file âm thanh nhận xét của giáo viên) **không gửi qua HTTP Multipart FormData tới server NestJS**.
* **Quy trình 3 bước bắt buộc:**
  1. Client xin Presigned PUT URL (`POST /api/v1/submissions/presigned-url`).
  2. Client dùng `fetch(uploadUrl, { method: 'PUT', body: fileBlob })` upload trực tiếp lên AWS S3 / Cloudflare R2 Bucket.
  3. Client gửi `fileKey` về Backend để lưu bản ghi vào PostgreSQL.

---

## 2. CƠ CHẾ VẬN HÀNH 2 GIAI ĐOẠN (TWO-STAGE OPERATIONAL LIFECYCLE)

AI Agent vận hành theo quy trình 2 giai đoạn chuẩn hóa:

```text
[ CLIENT REQUEST / CLI COMMAND ]
               │
               ├───────────────────────────────────────────┐
               ▼                                           ▼
   GIAI ĐOẠN 1: KHỞI TẠO NỀN TẢNG              GIAI ĐOẠN 2: THỰC THI MODULE
        Lệnh: /init-base                           Lệnh: /exec-module <path>
               │                                           │
   • TransformResponseInterceptor              1. Verify Spec (Đọc Markdown)
   • AllExceptionsFilter                       2. Sinh DTOs & Class-Validator
   • JwtAuthGuard & RolesGuard                 3. Sinh Service + CSDL Transaction
   • @Roles() Decorator                        4. Sinh Controller + RBAC Guards
   • Axios Interceptor (401 Refresh)           5. Sinh Client Hook / Component UI
   • TanStack Query Provider                   6. Chạy DoD Audit Verification
```

### GIAI ĐOẠN 1 — KHỞI TẠO NỀN TẢNG (`/init-base`)

Khi nhận lệnh `/init-base`, Agent tự động xuất bản bộ mã nguồn hạ tầng khung (Base Infrastructure) hoàn chỉnh:

1. **`TransformResponseInterceptor`:** Interceptor NestJS tự động bọc dữ liệu trả về theo cấu trúc Standard Response Envelope.
2. **`AllExceptionsFilter`:** Global Exception Filter bắt mọi `HttpException` và lỗi CSDL PostgreSQL (Duplicate Key 23505, Foreign Key 23503) để chuyển đổi thành Error Envelope chuẩn chứa mã lỗi `errorCode` (`ERR_VAL_001`, `ERR_NOT_FOUND`).
3. **`JwtAuthGuard` & `RolesGuard`:** Guards bảo mật xác thực Access Token JWT và đối chiếu quyền hạn vai trò người dùng (`ADMIN`, `TEACHER`, `STUDENT`).
4. **`@Roles(...)` Decorator:** Custom Decorator để đánh dấu quyền hạn trên từng Route Handler.
5. **Axios Interceptor (Silent Refresh Token Rotation):** Axios Client Instance trên Frontend tự động bắt mã lỗi HTTP 401, gọi ngầm `/api/v1/auth/refresh-token` để lấy cặp Token mới và retry request ban đầu mà không ngắt đoạn trải nghiệm người dùng.
6. **TanStack Query Provider:** Cấu hình QueryClientProvider với `staleTime` và Query Key Factory chuẩn hóa.

### GIAI ĐOẠN 2 — THỰC THI TASK THEO MODULE (`/exec-module <path>`)

Khi nhận lệnh `/exec-module <đường_dẫn_tệp_spec>`, ví dụ: `/exec-module docs/modules/MOD_TSK_ASSIGNMENTS/TSK_04_rubric_grading_studio.md`, Agent đọc phần **"TASK BREAKDOWN FOR AGENT"** trong file spec và thực thi tuần tự 6 bước:

* **Bước 1: Verify Spec:** Kiểm tra tính hợp lệ của file spec so với `postgresql-16-ddl-schema-v12.md` và `api-endpoints-specification-v11.md`.
* **Bước 2: Sinh DTOs:** Viết 100% Class DTOs đính kèm `class-validator` và `class-transformer`.
* **Bước 3: Sinh Service + Transaction:** Viết Service chứa 100% logic nghiệp vụ/toán học (SM-2, ETS Scale Mapping, Rubric), bọc `this.dataSource.transaction` cho các thao tác đa bảng.
* **Bước 4: Sinh Controller + RBAC:** Viết Controller mỏng, gắn `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.
* **Bước 5: Sinh Client Hook / UI:** Viết Custom Query Hooks (TanStack Query v5) và Component UI (React Native Expo hoặc Next.js 14 RSC/Client).
* **Bước 6: Chạy DoD Audit:** Rà soát tự động 4 Trụ cột trong `DEFINITION_OF_DONE.md` và xuất báo cáo nghiệm thu.

---

## 3. CÁC LỆNH HỖ TRỢ BỔ TRỢ (AUXILIARY AGENT COMMANDS)

Ngoài 2 giai đoạn chính, Agent hỗ trợ 2 lệnh bổ trợ:

### 3.1. Lệnh `/plan <yêu cầu>` — Phân tích Kiến trúc & Cảnh báo Rủi ro
* **Nhiệm vụ:** Agent đọc hiểu yêu cầu, tra cứu tài liệu spec liên quan, liệt kê các Bảng CSDL/API Endpoints sẽ đụng đến, cảnh báo rủi ro lỗi N+1 Query hay vỡ Transaction.
* **Đầu ra:** Xuất bản Kế hoạch Triển khai (Execution Plan) chi tiết và **dừng lại chờ lập trình viên phê duyệt trước khi viết code**.

### 3.2. Lệnh `/audit <đoạn code / đường dẫn file>` — Rà soát & Thẩm định Chất lượng
* **Nhiệm vụ:** Agent đóng vai trò Code Auditor rà soát mã nguồn được chỉ định so với bộ tiêu chí trong `DEFINITION_OF_DONE.md`.
* **Đầu ra:** Bảng Checklist kiểm định 4 Trụ cột (Type Safety, Integrity, Security/S3, Tests) phân loại lỗi theo mức `CRITICAL`, `WARNING`, `INFO` kèm đoạn code đã refactor sửa lỗi.

---

## 4. QUY TẮC TRA CỨU TÀI LIỆU (GROUNDING RULES)

Khi thực thi bất kỳ nhiệm vụ nào, Agent bắt buộc phải tra cứu chính xác các file tài liệu theo ma trận phân định dưới đây:

| Phân hệ Nghiệp vụ (Task Domain) | File Master Specs cần đọc (`docs/system-specs/`) | File Module Spec cần đọc (`docs/modules/`) |
| :--- | :--- | :--- |
| **Auth, User & RBAC Security** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md`<br>`08_rbac-permission-matrix.md` | `MOD_ADM_ADMIN_TEACHING/ADM_01_user_management.md`<br>`MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md` |
| **Flashcard SM-2 & Sổ tay STARRED** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md`<br>`05_backend-coding-rules.md` | `MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md`<br>`MOD_STU_SELF_LEARNING/STU_02_personal_notebook_starred.md` |
| **Ngữ pháp GFM & Quiz Củng cố** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md` | `MOD_STU_SELF_LEARNING/STU_03_grammar_gfm_theory.md`<br>`MOD_STU_SELF_LEARNING/STU_04_reinforcement_quiz.md` |
| **Streak Engine & Skill Radar 6D** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md` | `MOD_STU_SELF_LEARNING/STU_05_streak_engine.md`<br>`MOD_STU_SELF_LEARNING/STU_06_skill_radar_6d.md` |
| **Động cơ Thi thử TOEIC 200 câu** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md`<br>`04_Thiet_Ke_Backend_Application_Layer_NestJS.md` | `MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md`<br>`MOD_EXM_TOEIC_ENGINE/EXM_02_redis_draft_answer_sync.md`<br>`MOD_EXM_TOEIC_ENGINE/EXM_03_ets_scoring_conversion_10_990.md` |
| **Giao bài tập & Deadline Độc lập** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md` | `MOD_ADM_ADMIN_TEACHING/ADM_02_class_management.md`<br>`MOD_TSK_ASSIGNMENTS/TSK_01_assignment_creation_dispatch.md` |
| **Nộp bài & Studio Chấm Rubric/WaveSurfer** | `02_postgresql-16-ddl-schema-v12.md`<br>`03_api-endpoints-specification-v11.md`<br>`06_frontend-coding-rules.md` | `MOD_TSK_ASSIGNMENTS/TSK_02_student_submission_flow.md`<br>`MOD_TSK_ASSIGNMENTS/TSK_03_speaking_writing_media_s3.md`<br>`MOD_TSK_ASSIGNMENTS/TSK_04_rubric_grading_studio.md` |

### ⚠️ Cơ chế Từ chối Bất hợp lệ (Rejection Rule)
Nếu yêu cầu của lập trình viên đòi hỏi:
1. Tạo bảng/cột CSDL mới **không nằm trong 35 Bảng CSDL v12.0**.
2. Tạo Endpoint URI mới **không nằm trong 62 APIs v11.0**.
3. Bỏ qua việc validate DTO hoặc cho phép dùng `any`.

👉 **Agent BẮT BUỘC KHÔNG THỰC THI, lập tức từ chối và phát cảnh báo**:
> *"CẢNH BÁO KIẾN TRÚC: Yêu cầu này vi phạm Ranh giới đỏ [Tên ranh giới]. Bảng/Endpoint [Tên] không tồn tại trong Master Specs (PostgreSQL v12.0 / API v11.0). Vui lòng cập nhật file Master Spec trước khi triển khai code."*

---

## 5. ĐỊNH DẠNG ĐẦU RA MÃ NGUỒN (OUTPUT CONTRACT)

Mọi tệp mã nguồn TypeScript, JSX hoặc SQL do Agent sinh ra phải tuân thủ nghiêm ngặt các quy định về định dạng đầu ra:

1. **Zero Placeholders:** Tuyệt đối cấm viết mã giữ chỗ dạng `// TODO: implement logic here`, `// implement later`, hay sử dụng mảng dữ liệu giả lập (mock data) trong mã nguồn chính thức.
2. **Full Imports:** Khai báo đầy đủ 100% các câu lệnh `import` từ NestJS, TypeORM, React Native, Next.js, TanStack Query, Zustand, class-validator.
3. **Explicit Type Annotations:** Bắt buộc khai báo kiểu trả về cho 100% các hàm và phương thức (VD: `async reviewSubmission(...): Promise<SubmissionReviewEntity>`).
4. **Technical Code Comments:** Bổ sung comment tiếng Anh ngắn gọn giải thích các thuật toán phức tạp (Toán SM-2, Tra bảng ETS, Reanimated Worklet math, Direct-to-S3 Presigned URL).
5. **Self-Contained & Compilable:** Code xuất ra phải bảo đảm copy trực tiếp vào dự án là biên dịch thành công mà không phát sinh lỗi thiếu module hay thiếu biến.
