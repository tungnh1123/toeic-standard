# DEFINITION OF DONE (DoD) AUDIT REPORT — FNC_ADM_05

## 📌 THÔNG TIN TỔNG QUAN
- **Module:** `FNC_ADM_05` — Giao bài tập theo Lớp học hoặc Cá nhân Học viên kèm Deadline (Assignment Distribution & Deadline Management)
- **Spec Path:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_05_Giao_Bai_Tap_Deadline_v2.md`
- **Branch:** `feat/fnc-adm-05-assignment-dispatch-deadline`
- **Execution Date:** 2026-10-21
- **Tech Stack:** NestJS 10, TypeORM, PostgreSQL 16 (Schema v12.0), BullMQ / Redis Notifications Queue, React 18, TanStack Query v5, Tailwind CSS

---

## 4 TRỤ CỘT KIỂM ĐỊNH CHẤT LƯỢNG (DOD PILLARS)

### 1. Trụ Cột 1: Type Safety & Compilation
- [x] **Backend Compilation:** `npm run typecheck` đạt 0 lỗi biên dịch.
- [x] **Frontend Compilation:** `npm run build` trong thư mục `web/` biên dịch thành công 100%.
- [x] **Zero `any` Policy:**
  - Strict TypeScript 5.x, không dùng `any` hoặc `as any` trong DTOs (`AssignAssignmentDto`, `ExtendDeadlineDto`, `FilterAssignedListDto`), Entities, Services, Controllers và React Components.
- [x] **Validation Rules:**
  - Ràng buộc `dueDate > NOW()` tường minh bằng DTO Class Validator và Service logic (`ERR_INVALID_DUE_DATE`).

### 2. Trụ Cột 2: CSDL Integrity & Performance
- [x] **Decoupled Deadline Model:**
  - Bảng `assignments` đóng vai trò là Đề bài gốc Template, hoàn toàn không lưu `due_date`.
  - Hạn nộp bài `due_date` được lưu độc lập tại bảng `assignment_targets` (`assignment_targets.due_date`, `class_id`, `student_id`).
- [x] **CSDL Transaction Wrapping:**
  - 100% thao tác phân công bài tập (`assignAssignment`) và gia hạn deadline (`extendDeadline`) được bọc trong `this.dataSource.transaction(async (manager: EntityManager) => { ... })`.
  - Phân công sử dụng PostgreSQL UPSERT: `ON CONFLICT (assignment_id, student_id, class_id) DO UPDATE SET due_date = EXCLUDED.due_date, is_completed = false`.
- [x] **BullMQ Async Notifications Queue:**
  - Sự kiện giao bài (`assignment-assigned`) và gia hạn deadline (`deadline-extended`) được đẩy sang hàng đợi nền `notifications` queue để gửi Push FCM và Email bất đồng bộ, không nghẽn luồng HTTP request.

### 3. Trụ Cột 3: Bảo mật & RBAC Guards
- [x] **Guards:** Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)` trên các Endpoints quản trị:
  - `POST /api/v1/admin/assignments/:id/assign` (Endpoint #56)
  - `PUT /api/v1/admin/assignments/:id/extend-deadline` (Endpoint #58)
  - `GET /api/v1/admin/assignments/:id/assigned-list` (Endpoint #59)
  - `GET /api/v1/admin/classes`
- [x] **Teacher Scope Isolation:**
  - Giáo viên (TEACHER) chỉ được phép giao bài và gia hạn cho các Lớp học do chính mình phụ trách (`classes.teacher_id = currentUserId`). Nếu cố tình giao cho lớp khác, hệ thống chặn ngay với mã lỗi `ERR_AUTH_003` (403 Forbidden).
- [x] **Student Masking & Access:**
  - Endpoint #52 `GET /api/v1/student/assignments`: Học viên xem bài tập cá nhân kèm đếm lùi thời gian; audio phát âm mẫu bản xứ (`sampleAudioUrl` & `sampleTranscript`) tự động bị che (`null`) khi bài tập Speaking chưa hoàn thành.

### 4. Trụ Cột 4: Test & Response Envelope
- [x] **Response Envelope Standard:** 100% phản hồi bọc trong Standard Envelope `{ statusCode, success, message, data, timestamp }`.
- [x] **Kiểm thử Thực tế (API Verified via Curl):**
  1. `GET /api/v1/admin/classes`: Trả về danh sách lớp học do giảng viên phụ trách kèm số lượng học viên.
  2. `POST /api/v1/admin/assignments/:id/assign` với `dueDate` trong quá khứ: Trả về HTTP 400 `ERR_INVALID_DUE_DATE`.
  3. `POST /api/v1/admin/assignments/:id/assign` với `classId` không thuộc quyền sở hữu của giáo viên: Trả về HTTP 403 `ERR_AUTH_003`.
  4. `POST /api/v1/admin/assignments/:id/assign` hợp lệ: Trả về HTTP 200 OK (`assignedCount: 2`, `notificationsDispatched: true`), bản ghi lưu vào `assignment_targets` và job enqueued vào BullMQ queue.
  5. `PUT /api/v1/admin/assignments/:id/extend-deadline`: Gia hạn deadline cho học viên thành công (`updatedRecords: 1`).
  6. `GET /api/v1/admin/assignments/:id/assigned-list`: Trả về danh sách phân công chi tiết, trạng thái nộp, cảnh báo quá hạn `isOverdue` và tổng kết thống kê.
  7. `GET /api/v1/student/assignments`: Học viên xem danh sách bài tập được giao, thời gian đếm lùi chính xác và audio mẫu Speaking được ẩn an toàn.
- [x] **Frontend Web Admin Portal UI:**
  - Component `AssignAssignmentModal.tsx`: Chọn lớp học phụ trách hoặc nhập UUID học viên cá nhân, bộ chọn ngày giờ hạn nộp kèm các nút preset nhanh (+3, +7, +14 ngày), thông báo đẩy BullMQ.
  - Component `AssignedListModal.tsx`: Thanh thống kê (Tổng giao, Đã nộp, Quá hạn), bảng danh sách học viên, nút gia hạn deadline trực tiếp theo từng học viên.
  - Tích hợp 2 nút "Giao bài" (icon Send) và "Danh sách giao" (icon Users) trên từng thẻ bài tập tại `AdminWritingAssignmentsView` và `AdminSpeakingAssignmentsView`.

---

## KẾT LUẬN
Module `FNC_ADM_05` đáp ứng 100% tiêu chí chất lượng và quy tắc 5 Ranh giới đỏ trong `AGENTS.md`. Sẵn sàng commit, push branch, và merge `--no-ff` vào `main`.
