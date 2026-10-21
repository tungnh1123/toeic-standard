# DEFINITION OF DONE (DoD) AUDIT REPORT — FNC_ADM_06

## 📌 THÔNG TIN TỔNG QUAN
- **Module:** `FNC_ADM_06` — Quản lý, Tìm kiếm và Lọc Danh sách Bài nộp của Học viên (Submission Management & Advanced Filtering Dashboard)
- **Spec Path:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_06_Quan_Ly_Loc_Bai_Nop_v2.md`
- **Branch:** `feat/fnc-adm-06-submissions-filtering`
- **Execution Date:** 2026-10-21
- **Tech Stack:** NestJS 10, TypeORM, PostgreSQL 16 (Schema v12.0), React 18, TanStack Query v5, Tailwind CSS

---

## 4 TRỤ CỘT KIỂM ĐỊNH CHẤT LƯỢNG (DOD PILLARS)

### 1. Trụ Cột 1: Type Safety & Compilation
- [x] **Backend Compilation:** `npm run typecheck` đạt 0 lỗi biên dịch TypeScript.
- [x] **Frontend Compilation:** `cd web && npm run build` biên dịch thành công 100%.
- [x] **Zero `any` Policy:**
  - Strict TypeScript 5.x cho toàn bộ DTO (`FilterSubmissionsDto`), Entity (`AssignmentSubmissionEntity`), Service, Controller và UI components. Không sử dụng `any` hoặc `as any`.

### 2. Trụ Cột 2: Integrity & Performance (Zero Duplication JOIN)
- [x] **Khắc phục triệt để lỗi Cartesian Product:**
  - Thực thi JOIN trực tiếp qua `s.class_id = c.id` trên bảng `assignment_submissions`, tuyệt đối không JOIN qua `class_enrollments`.
  - Loại bỏ hoàn toàn tình trạng nhân bản $N$ dòng khi học viên tham gia nhiều lớp học.
- [x] **Thuật toán Cảnh báo Quá hạn Chấm điểm 48h (Grading SLA 48h Warning):**
  - Gắn nhãn ảo `isOverdue48h`:
    $$\text{isOverdue48h} = (\text{status} \in \{\text{'SUBMITTED'}, \text{'GRADING'}\}) \land (\text{NOW}() - \text{submitted\_at} > 48\text{ hours})$$
  - Các bài đã chấm (`GRADED`) hoặc nộp trong vòng 48h tự động trả về `isOverdue48h: false`.

### 3. Trụ Cột 3: Bảo mật & RBAC Data Isolation
- [x] **Guards:** Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)` trên Endpoint #59 (`GET /api/v1/admin/submissions`).
- [x] **Teacher Data Isolation:**
  - Nếu người dùng đăng nhập là `TEACHER`, tự động áp dụng điều kiện truy vấn `c.teacher_id = :teacherId` để giáo viên chỉ xem được các bài nộp thuộc các lớp học do mình phụ trách giảng dạy.
  - Quản trị viên (`ADMIN`) có đặc quyền xem bài nộp toàn trường.
  - Học viên (`STUDENT`) bị chặn truy cập hoàn toàn với mã lỗi `ERR_AUTH_003` (403 Forbidden).

### 4. Trụ Cột 4: Test & Response Envelope
- [x] **Response Envelope Standard:** 100% phản hồi bọc trong Standard Envelope `{ statusCode, success, message, data: { items, meta }, timestamp }`.
- [x] **Kiểm thử Thực tế (API Verified via Curl):**
  1. `GET /api/v1/admin/submissions`: Trả về danh sách bài nộp, kiểm tra chính xác bài nộp 72h trước có `isOverdue48h: true`, bài nộp 2h trước có `isOverdue48h: false`, bài đã chấm có `isOverdue48h: false`.
  2. `GET /api/v1/admin/submissions?type=SPEAKING`: Lọc chính xác 1 bài Speaking.
  3. `GET /api/v1/admin/submissions?status=SUBMITTED`: Lọc chính xác 2 bài chưa chấm.
  4. `GET /api/v1/admin/submissions?search=Test`: Lọc chính xác 2 bài làm của học viên "Nguyễn Văn Test".
  5. Học viên gọi `GET /api/v1/admin/submissions`: Bị chặn với HTTP 403 `ERR_AUTH_003`.
- [x] **Frontend Web Admin Portal UI:**
  - Component `AdminSubmissionsDashboardView.tsx`: Thanh tìm kiếm, dropdown lọc theo Lớp học, Loại bài tập (QUIZ, WRITING, SPEAKING), Trạng thái chấm (SUBMITTED, GRADING, GRADED, REJECTED), nút lọc nhanh "Quá hạn 48h (SLA)".
  - Thẻ bài nộp hiển thị huy hiệu loại bài tập, thông tin học viên, lớp học, thời điểm nộp, nhãn cảnh báo đỏ nhấp nháy `⚠️ Quá hạn 48h`, nội dung bài viết và audio player nghe bài nói.
  - Modal xem chi tiết bài làm học viên.
  - Tích hợp tab điều hướng **"Bài Nộp"** (icon `ClipboardCheck`) trên Header `App.tsx` cho tài khoản Admin và Giảng viên.

---

## KẾT LUẬN
Module `FNC_ADM_06` đáp ứng 100% tiêu chí chất lượng và quy tắc 5 Ranh giới đỏ trong `AGENTS.md`. Sẵn sàng commit, push branch, và merge `--no-ff` vào `main`.

