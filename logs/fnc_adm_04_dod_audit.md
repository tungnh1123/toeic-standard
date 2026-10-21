# DEFINITION OF DONE (DoD) AUDIT REPORT — FNC_ADM_04

## 📌 THÔNG TIN TỔNG QUAN
- **Module:** `FNC_ADM_04` — Soạn thảo Đề Speaking kèm Audio Phát Âm Mẫu Bản Xứ & Rubric Barem
- **Spec Path:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_04_Tao_De_Speaking_Audio_Mau_v2.md`
- **Branch:** `feat/fnc-adm-04-speaking-sample-audio`
- **Execution Date:** 2026-10-21
- **Tech Stack:** NestJS 10, TypeORM, PostgreSQL 16 (Schema v12.0), Vite React 18, TanStack Query v5, Tailwind CSS

---

## 4 TRỤ CỘT KIỂM ĐỊNH CHẤT LƯỢNG (DOD PILLARS)

### 1. Trụ Cột 1: Type Safety & Compilation
- [x] **Backend Compilation:** `npm run typecheck` đạt 0 lỗi biên dịch.
- [x] **Frontend Compilation:** `npm run build` trong thư mục `web/` biên dịch thành công 100%.
- [x] **Zero `any` Policy:**
  - Không sử dụng kiểu `any` hoặc ép kiểu lỏng lẻo trong DTOs (`GeneratePresignedUrlDto`, `SpeakingRubricDto`, `CreateSpeakingAssignmentDto`, `UpdateAssignmentDto`).
  - Strict type annotations cho toàn bộ handlers và service functions.

### 2. Trụ Cột 2: CSDL Integrity & Performance
- [x] **Database Schema Locking:**
  - Sử dụng bảng chuẩn `assignments` (DDL v12.0) với cột `type = 'SPEAKING'` và `rubric` (`JSONB`).
  - Không tạo bảng mới hoặc sửa đổi cấu trúc DDL 35 bảng chuẩn.
- [x] **CSDL Transaction Wrapping:**
  - Toàn bộ thao tác tạo đề bài Speaking (`createSpeakingAssignment`) và cập nhật đề bài (`updateAssignment`) được bọc 100% trong `this.dataSource.transaction(async (manager: EntityManager) => { ... })`.
- [x] **Direct-to-S3 Protocol:**
  - Triển khai giao thức Direct-to-S3 qua Endpoint #53 (`POST /api/v1/submissions/presigned-url`).
  - Tuyệt đối không stream file âm thanh lớn qua server NestJS; client nhận Presigned PUT URL và upload trực tiếp lên cloud storage.

### 3. Trụ Cột 3: Security & RBAC Guards
- [x] **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)` áp dụng chặt chẽ cho Endpoint #55 (`POST /api/v1/admin/assignments`) và #58 (`PUT /api/v1/admin/assignments/:id`).
- [x] **Endpoint #53 Access:** Cho phép Student, Teacher, Admin xin Presigned URL để upload âm thanh trả lời hoặc audio phát âm mẫu.
- [x] **Immutability Lock:** Kiểm tra số lượng bài nộp qua bảng `assignment_submissions`; nếu đã có học viên nộp bài làm, chặn chỉnh sửa đề bài với mã lỗi `ERR_ASSIGNMENT_LOCKED`.

### 4. Trụ Cột 4: Test & Response Envelope
- [x] **Response Envelope Standard:** 100% API responses chuẩn hóa theo định dạng `{ statusCode, success, message, data, timestamp }`.
- [x] **Kiểm thử Thực tế (API Verified via Curl):**
  1. `POST /api/v1/submissions/presigned-url`: Thành công cấp `uploadUrl`, `fileKey`, `expiresInSeconds: 900`.
  2. `POST /api/v1/admin/assignments` với tổng trọng số $\neq 100\%$: Bị chặn và trả về lỗi `ERR_RUBRIC_WEIGHT_INVALID` (400).
  3. `POST /api/v1/admin/assignments` thiếu `sampleAudioUrl`: Bị chặn và trả về lỗi `ERR_MISSING_SAMPLE_AUDIO` (400).
  4. `POST /api/v1/admin/assignments` hợp lệ: Trả về HTTP 201 Created và lưu chính xác rubric JSONB vào PostgreSQL.
  5. `GET /api/v1/admin/assignments?type=SPEAKING`: Lấy danh sách đề Speaking kèm thông tin creator và rubric đầy đủ.
  6. `PUT /api/v1/admin/assignments/:id`: Cập nhật đề Speaking thành công khi chưa có bài nộp.
- [x] **Frontend Web Admin Portal UI:**
  - Component `AdminSpeakingAssignmentsView.tsx`: Tìm kiếm, hiển thị danh sách đề Speaking, bộ đếm thời gian chuẩn bị/trả lời, trình phát audio mẫu, bản xem transcript và bảng tiêu chí Rubric.
  - Modal tạo/sửa đề Speaking: Upload file âm thanh trực tiếp qua S3 Presigned URL, nghe thử audio, cấu hình 4 tiêu chí Barem Rubric với thanh tính tổng trọng số Real-time và validation 100%.
  - Tích hợp tab điều hướng "Đề Speaking" trên Header `App.tsx` cho tài khoản Admin và Giảng viên.

---

## KẾT LUẬN
Module `FNC_ADM_04` đáp ứng 100% tiêu chí chất lượng và quy tắc 5 Ranh giới đỏ trong `AGENTS.md`. Sẵn sàng commit, merge `--no-ff` vào `main`, và push lên remote repo.

