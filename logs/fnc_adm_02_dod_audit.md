# BÁO CÁO NGHIỆM THU DEFINITION OF DONE (DoD AUDIT REPORT)
## Module: FNC_ADM_02 — Tạo & Quản Lý Ngân Hàng Câu Hỏi Quiz Trắc Nghiệm / Ngữ Pháp
**Nhánh thực hiện:** `feat/fnc-adm-02-quiz-question-bank`  
**Ngày thẩm định:** 2026-10-21  
**Trạng thái:** ✅ **MERGE READY (ĐẠT 100% TIÊU CHUẨN)**

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)
* [x] **Strict TypeScript Compilation:** Cả Backend (`npm run typecheck`) và Web Frontend (`cd web && npm run build`) đều biên dịch thành công với **0 lỗi**.
* [x] **Absolute Zero `any` Policy:** 100% mã nguồn không sử dụng bất kỳ từ khóa `any` hoặc ép kiểu `as any`. Các interface và DTOs được khai báo chặt chẽ (`QuestionOptionsDto`, `CreateGrammarQuestionDto`, `UpdateGrammarQuestionDto`, `FilterGrammarQuestionDto`, `AttachQuestionsToAssignmentDto`, `BatchImportQuestionsDto`, `ExcelImportRow`).
* [x] **Standard Response Format:** Toàn bộ API trả về cấu trúc Envelope chuẩn hóa qua `TransformResponseInterceptor`.

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & CSDL (POSTGRESQL 16)
* [x] **Database Schema Locking:** Khai thác chính xác 3 bảng CSDL PostgreSQL 16 chuẩn hóa v12.0:
  * `grammar_quiz_questions`: Ngân hàng câu hỏi ngữ pháp (`lesson_id`, `question_number`, `question_text`, `options` JSONB, `correct_option`, `explanation`, `translation`, `difficulty_level`).
  * `assignments`: Bảng template đề bài gốc (`title`, `instructions`, `type = 'QUIZ'`, `created_by`).
  * `assignment_questions`: Bảng liên kết câu hỏi ngân hàng vào đề bài quiz kèm thứ tự `order_index` và ràng buộc `uq_assignment_question(assignment_id, question_id)`.
* [x] **Ràng buộc Tính Toàn Vẹn & Transaction:**
  * Thao tác gắn danh sách câu hỏi vào đề bài tập dạng QUIZ (`attachQuestionsToAssignment`) được bọc hoàn toàn trong `this.dataSource.transaction`.
  * Xóa liên kết cũ và batch insert các liên kết câu hỏi mới theo thứ tự tuần tự không để lại rác dữ liệu.
  * Nhập hàng loạt câu hỏi từ Excel/JSON bọc trong `this.dataSource.transaction`.

---

### TRỤ CỘT 3: BẢO MẬT & PHÂN QUYỀN RBAC (API SPEC V11.0)
* [x] **RBAC Matrix Enforcement:**
  * `GET /api/v1/admin/grammar/questions`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `GET /api/v1/admin/grammar/questions/:id`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `POST /api/v1/admin/grammar/questions`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `PUT /api/v1/admin/grammar/questions/:id`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `DELETE /api/v1/admin/grammar/questions/:id`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `POST /api/v1/admin/grammar/questions/import-excel`: Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `POST /api/v1/admin/assignments/:id/questions` (Endpoint #57 v11.0): Phân quyền `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
* [x] **Kiểm thử Cách ly Học viên (Role Isolation):**
  * Học viên (Student) gọi vào các Endpoint Admin trên bị chặn tuyệt đối với HTTP 403 Forbidden (`ERR_AUTH_003`).

---

### TRỤ CỘT 4: CLIENT INTEGRITY & TRẢI NGHIỆM QUẢN TRỊ
* [x] **AdminQuizQuestionBankView:**
  * Giao diện quản lý ngân hàng câu hỏi chuyên nghiệp dành riêng cho Admin và Giảng viên.
  * Bộ lọc tìm kiếm nhanh theo nội dung câu hỏi và độ khó (EASY, MEDIUM, HARD).
  * Danh sách câu hỏi hiển thị trực quan 4 phương án A-B-C-D với phương án đúng được highlight xanh lá cây, lời giải ngữ pháp và bản dịch nghĩa.
  * Modal tạo mới / chỉnh sửa câu hỏi trực quan với các ô nhập liệu, chọn đáp án đúng radio và chọn độ khó.
  * Tích hợp xóa câu hỏi an toàn kèm xác nhận confirmation dialog.
  * Tích hợp tab "Ngân Hàng Quiz" trên Header điều hướng chỉ hiển thị khi đăng nhập với quyền Admin hoặc Giảng viên.

