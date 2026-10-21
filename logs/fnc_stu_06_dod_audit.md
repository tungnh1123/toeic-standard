# BÁO CÁO NGHIỆM THU DEFINITION OF DONE (DoD AUDIT REPORT)
## Module: FNC_STU_06 — Học Lý Thuyết Ngữ Pháp Chuyên Đề (Định Dạng Markdown Trực Quan)
**Nhánh thực hiện:** `feat/fnc-stu-06-grammar-theory-markdown`  
**Ngày thẩm định:** 2026-10-21  
**Trạng thái:** ✅ **MERGE READY (ĐẠT 100% TIÊU CHUẨN)**

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)
* [x] **Strict TypeScript Compilation:** Cả Backend (`npm run typecheck`) và Web Frontend (`cd web && npm run build`) đều biên dịch thành công với **0 lỗi**.
* [x] **Absolute Zero `any` Policy:** 100% mã nguồn không sử dụng bất kỳ từ khóa `any` hoặc ép kiểu `as any`. Toàn bộ TypeORM raw queries đều được map sang interface tường minh (`CategoryRow`, `LessonRow`, `CountRow`).
* [x] **Input DTO Validation:** `UpdateReadingProgressDto` áp dụng `@IsInt`, `@Min(0)`, `@Max(100)`, `@IsOptional`, `@IsBoolean` kết hợp `ValidationPipe`.
* [x] **Response Envelope Standard:** 100% phản hồi từ NestJS tuân thủ cấu trúc chuẩn `{ statusCode, success, message, data, timestamp }`.

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & CSDL (POSTGRESQL 16)
* [x] **Database Schema Locking:** Sử dụng 4 bảng CSDL PostgreSQL 16 chuẩn hóa trong Master DDL v12.0:
  * `grammar_categories`: Danh mục chuyên đề ngữ pháp theo khung CEFR (`target_level`, `icon_name`, `color_code`, `order_index`, `is_active`).
  * `grammar_lessons`: Nội dung bài giảng GFM Markdown (`slug`, `summary`, `content_markdown`, `estimated_read_time_minutes`, `order_index`, `is_published`).
  * `user_grammar_progress`: Tiến độ cuộn trang và trạng thái hoàn thành (`scroll_percentage`, `is_completed`, `last_read_at`, `completed_at`).
  * `user_grammar_bookmarks`: Đánh dấu bài học yêu thích (`user_id`, `lesson_id`).
* [x] **Multi-table Database Transaction & Streak Touch:**
  * Thao tác cập nhật tiến độ đọc đạt $\ge 80\%$ hoặc nhấn "Đã hiểu bài" được bọc an toàn trong `this.dataSource.transaction`.
  * Tự động kích hoạt cập nhật chuỗi chuyên cần học tập (`UserStreakEntity`) trong transaction.
* [x] **Dynamic Table of Contents (TOC) Extraction:** Tự động bóc tách các tiêu đề H1, H2, H3 từ `content_markdown` bằng regex, chuẩn hóa slug anchor không dấu hỗ trợ nhảy nhanh nội dung.

---

### TRỤ CỘT 3: BẢO MẬT & PHÂN QUYỀN RBAC (API SPEC V11.0)
* [x] **Phân quyền Chuẩn Hóa:**
  * Endpoint `#25` (`GET /api/v1/student/grammar/categories`): `@Public()` + `@UseGuards(JwtAuthGuard)` (Guest & Student).
  * Endpoint `#26` (`GET /api/v1/student/grammar/categories/:id/lessons`): `@Public()` + `@UseGuards(JwtAuthGuard)`.
  * Endpoint `#27` (`GET /api/v1/student/grammar/lessons/:id`): `@Public()` + `@UseGuards(JwtAuthGuard)`.
  * Endpoint `#28` (`POST /api/v1/student/grammar/lessons/:id/progress`): `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.STUDENT)`.
  * Endpoint `#29` (`POST /api/v1/student/grammar/lessons/:id/bookmark`): `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.STUDENT)`.
  * Endpoint `#30` (`GET /api/v1/student/grammar/recent`): `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.STUDENT)`.
* [x] **Input Sanitization:** Toàn bộ tham số `:id` được lọc qua `ParseUUIDPipe`.

---

### TRỤ CỘT 4: CLIENT INTEGRITY & TRẢI NGHIỆM ĐỌC MARKDOWN GFM
* [x] **Markdown GFM Visual Callouts:** Hỗ trợ đầy đủ các khối hộp chuyên biệt cho kỳ thi TOEIC:
  * `[!FORMULA]`: Hộp công thức màu xanh dương nổi bật kèm icon Sparkles.
  * `[!WARNING]`: Hộp cảnh báo bẫy đề thi Part 5 & 6 màu hồng-đỏ kèm icon AlertTriangle.
  * `[!TIP]`: Hộp mẹo giải nhanh trong 3 giây màu hổ phách kèm icon Lightbulb.
  * GFM Tables: Bảng so sánh thì trực quan, zebra striping và border chuẩn.
* [x] **Interactive Reading Studio Modal:**
  * Thanh đo tiến độ đọc theo thời gian thực (Sticky Progress Bar $0\% - 100\%$).
  * Tự động gửi request hoàn thành khi cuộn trang đạt $\ge 80\%$.
  * Bảng điều khiển mục lục (TOC Slide-out Drawer) cuộn mượt đến từng phần.
  * Nút "Đã hiểu bài", "Bookmark", chuyển bài trước/sau và sẵn sàng kết nối sang Quiz củng cố.
* [x] **Web App Tab Integration:** Tích hợp tab `Lý Thuyết Ngữ Pháp` trên Web Portal với danh mục chuyên đề, thống kê % tiến độ, mục "Vừa đọc gần đây" và bài giảng mẫu phong phú.

