# BÁO CÁO NGHIỆM THU DEFINITION OF DONE (DoD AUDIT REPORT)
## Module: FNC_ADM_03 — Tạo Đề Bài Luận Writing & Cấu Hình Rubric 4 Tiêu Chí
**Nhánh thực hiện:** `feat/fnc-adm-03-writing-rubric-assignment`  
**Ngày thẩm định:** 2026-10-21  
**Trạng thái:** ✅ **MERGE READY (ĐẠT 100% TIÊU CHUẨN)**

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)
* [x] **Strict TypeScript Compilation:** Cả Backend (`npm run typecheck`) và Web Frontend (`cd web && npm run build`) đều biên dịch thành công với **0 lỗi**.
* [x] **Absolute Zero `any` Policy:** 100% mã nguồn không sử dụng bất kỳ từ khóa `any` hoặc ép kiểu `as any`. Các interface và DTOs được khai báo chặt chẽ (`RubricCriterionDto`, `WritingRubricDto`, `CreateWritingAssignmentDto`, `UpdateWritingAssignmentDto`, `FilterAssignmentDto`, `PaginatedAssignmentsResult`).
* [x] **Standard Response Format:** Toàn bộ API trả về cấu trúc Envelope chuẩn hóa qua `TransformResponseInterceptor`.

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & CSDL (POSTGRESQL 16)
* [x] **Database Schema Locking:** Khai thác chính xác bảng `assignments` chuẩn hóa DDL v12.0:
  * `title`: Tiêu đề đề bài Writing.
  * `instructions`: Nội dung câu hỏi / chủ đề bài luận.
  * `type`: Bắt buộc là `WRITING`.
  * `rubric`: Đối tượng JSONB chứa cấu hình khống chế thời gian, số từ và 4 tiêu chí Barem Rubric.
  * `created_by`: Foreign Key -> `users(id)` ON DELETE RESTRICT.
* [x] **Nguyên Tắc Kiến Trúc Deadline Độc Lập (Decoupled Assignment Deadline):**
  * Bảng `assignments` đóng vai trò là Template bài tập gốc, tuyệt đối không chứa cột `due_date`.
* [x] **Thuật Toán Kiểm Tra Trọng Số Barem Rubric:**
  * Bắt buộc có đủ các tiêu chí với tổng trọng số $\sum \text{weight} = 100\%$. Nếu sai, hệ thống từ chối và trả về lỗi `ERR_RUBRIC_WEIGHT_INVALID`.
  * Ràng buộc khống chế số từ `minWords < maxWords`. Nếu sai, từ chối với lỗi `ERR_INVALID_WORD_LIMIT`.
* [x] **Multi-table Database Transaction & Khóa Sửa Đề Đã Nộp:**
  * Toàn bộ thao tác tạo mới, cập nhật và xóa đề bài đều bọc trong `this.dataSource.transaction`.
  * Chặn cập nhật/xóa đề bài đã có học viên nộp bài làm với mã lỗi `ERR_ASSIGNMENT_LOCKED`.

---

### TRỤ CỘT 3: BẢO MẬT & PHÂN QUYỀN RBAC (API SPEC V11.0)
* [x] **RBAC Matrix Enforcement:**
  * `POST /api/v1/admin/assignments` (Endpoint #55 v11.0): `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `GET /api/v1/admin/assignments`: `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `GET /api/v1/admin/assignments/:id`: `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `PUT /api/v1/admin/assignments/:id` (Endpoint #58 v11.0): `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * `DELETE /api/v1/admin/assignments/:id`: `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
* [x] **Kiểm thử Role Isolation:**
  * Học viên (Student) bị chặn tuyệt đối tại `RolesGuard` với HTTP 403 Forbidden (`ERR_AUTH_003`).

---

### TRỤ CỘT 4: CLIENT INTEGRITY & TRẢI NGHIỆM QUẢN TRỊ
* [x] **AdminWritingAssignmentsView:**
  * Kho đề bài tập tự luận Writing & Rubric Studio dành riêng cho Giáo viên & Quản trị viên.
  * Thanh tìm kiếm nhanh theo tiêu đề đề bài.
  * Thẻ hiển thị đề bài trực quan kèm thông số giới hạn thời gian (phút), số từ (min-max) và tóm tắt barem 4 tiêu chí Rubric.
  * Modal tạo mới / sửa đề bài luận với Interactive Rubric Builder:
    * Task Achievement
    * Coherence & Cohesion
    * Lexical Resource
    * Grammatical Accuracy
    * Thanh tính tổng trọng số Real-time (Xanh lá khi đúng 100%, Đỏ khi khác 100% kèm vô hiệu hóa nút Lưu).
* [x] **Topbar Navigation:** Tích hợp tab "Đề Writing" trên Header điều hướng cho Admin và Giảng viên.
