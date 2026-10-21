# BÁO CÁO NGHIỆM THU DEFINITION OF DONE (DoD AUDIT REPORT)
## Module: FNC_ADM_01 — Đăng Nhập & Xác Thực Vai Trò Admin / Giảng Viên (RBAC)
**Nhánh thực hiện:** `feat/fnc-adm-01-admin-teacher-auth-rbac`  
**Ngày thẩm định:** 2026-10-21  
**Trạng thái:** ✅ **MERGE READY (ĐẠT 100% TIÊU CHUẨN)**

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)
* [x] **Strict TypeScript Compilation:** Cả Backend (`npm run typecheck`) và Web Frontend (`cd web && npm run build`) đều biên dịch thành công với **0 lỗi**.
* [x] **Absolute Zero `any` Policy:** 100% mã nguồn không sử dụng bất kỳ từ khóa `any` hoặc ép kiểu `as any`.
* [x] **Standard Response Format:** Toàn bộ API trả về cấu trúc Envelope chuẩn hóa qua `TransformResponseInterceptor`.

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & CSDL (POSTGRESQL 16)
* [x] **Database Schema Locking:** Khai thác chính xác 2 bảng CSDL PostgreSQL 16 chuẩn hóa v12.0:
  * `users`: Quản lý tài khoản dùng chung với phân quyền enum `user_role_enum` (`ADMIN`, `TEACHER`, `STUDENT`).
  * `user_refresh_tokens`: Bảng duy nhất lưu trữ và luân chuyển Session Refresh Tokens cho cả Admin, Teacher và Student (Inviolable Red Line #1).
* [x] **Cơ Chế Bảo Mật & Thuật Toán Xác Thực:**
  * Bcrypt salt rounds = 10 cho password hashing.
  * Access Token thời hạn 15 phút, Refresh Token thời hạn 7 ngày.
  * Refresh Token Rotation: Mỗi lần đổi token, token cũ bị thu hồi (`is_revoked = true`), phát hiện Token Reuse Attack tự động hủy toàn bộ phiên của tài khoản.
  * **Brute-Force Lockout Protection:** Đăng nhập sai 5 lần liên tiếp trong 15 phút lập tức kích hoạt khóa tạm thời 30 phút (`ERR_AUTH_LOCKED`), bảo vệ chống tấn công dò mật khẩu.
* [x] **Multi-table Database Transaction:**
  * Lưu trữ và xoay vòng Refresh Token bọc trong `this.dataSource.transaction`.

---

### TRỤ CỘT 3: BẢO MẬT & PHÂN QUYỀN RBAC (API SPEC V11.0)
* [x] **RBAC Matrix Enforcement (Endpoints #1, #3, #4, #5):**
  * `POST /api/v1/auth/login`: Hỗ trợ đăng nhập đa vai trò (Admin, Teacher, Student), trả về JWT chứa claims role chuẩn.
  * `POST /api/v1/auth/refresh-token`: Xoay vòng token an toàn.
  * `POST /api/v1/auth/logout`: Thu hồi token active của người dùng.
  * `GET /api/v1/student/profile/me`: Cấu hình `@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)`, cho phép Giảng viên và Quản trị viên truy cập thông tin tài khoản hợp lệ.
* [x] **Tài Khoản Mẫu Phân Quyền (Seed Data):**
  * Admin: `admin@toeic.edu.vn` (Role: `ADMIN`)
  * Teacher: `teacher@toeic.edu.vn` (Role: `TEACHER`)

---

### TRỤ CỘT 4: CLIENT INTEGRITY & TRẢI NGHIỆM NGƯỜI DÙNG
* [x] **Web Authentication & Role Badge:**
  * Hỗ trợ đăng nhập với các tài khoản Admin / Teacher / Student.
  * Hiển thị huy hiệu vai trò phân màu trực quan (`🛡️ Admin` tím, `👨‍🏫 Giảng Viên` xanh lục, `🎓 Học Viên` xanh dương).
