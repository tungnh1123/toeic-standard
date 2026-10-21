# SECURITY_RULES.md — Quy chuẩn Bảo mật & An toàn Thông tin Hệ thống
## Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến

---

## 1. QUY CHUẨN XÁC THỰC JWT & REFRESH TOKEN ROTATION

### 1.1. Kiến trúc Token Kép (Dual-Token Architecture)
* **Access Token (JWT):**
  * Thời gian sống ngắn: **15 phút**.
  * Chứa Payload tối giản: `{ sub: userId, email: string, role: UserRole }`.
  * Đính kèm trong HTTP Header: `Authorization: Bearer <access_token>`.
* **Refresh Token (JWT Hash):**
  * Thời gian sống dài: **7 ngày**.
  * Lưu trữ an toàn trong cơ sở dữ liệu tại bảng `user_refresh_tokens` dưới dạng chuỗi BCRYPT / SHA256 Hash (`token_hash`). Dùng chung duy nhất 1 bảng này cho cả **ADMIN**, **TEACHER** và **STUDENT**.

### 1.2. Cơ chế Xoay vòng Refresh Token (Refresh Token Rotation)
* Khi Access Token hết hạn, Client gọi API `POST /api/v1/auth/refresh-token`.
* Backend kiểm tra tính hợp lệ của Refresh Token:
  1. Đối chiếu `token_hash` trong CSDL.
  2. Kiểm tra cờ `is_revoked === false` và `expires_at > NOW()`.
* Nếu hợp lệ: Đánh dấu Refresh Token cũ `is_revoked = true`, khởi tạo cặp Access Token & Refresh Token mới, lưu `token_hash` mới vào CSDL và trả về cho Client.
* Nếu phát hiện Token cũ bị sử dụng lại (Token Reuse Attack): Tự động vô hiệu hóa toàn bộ các phiên đăng nhập active của `user_id` đó để ngăn chặn đánh cắp tài khoản.

### 1.3. Xử lý Tự động trên Client qua Axios Interceptor (HTTP 401 Silent Refresh)
* Khi bất kỳ API nào phản hồi mã lỗi `401 Unauthorized`:
  1. Axios Response Interceptor tạm dừng các requests tiếp theo vào hàng đợi (Queue).
  2. Thực thi gọi ngầm API `/api/v1/auth/refresh-token`.
  3. Khi nhận cặp Token mới: Cập nhật Storage (`SecureStore` trên Mobile / Cookie trên Web), gắn Access Token mới vào Header và **thử lại (Retry) các requests ban đầu**.
  4. Nếu quá trình Refresh thất bại (Refresh Token hết hạn): Xóa sạch thông tin phiên đăng nhập và điều hướng ngay về màn hình `/login`.

---

## 2. QUY TRÌNH UPLOAD MEDIA AN TOÀN QUA S3 PRESIGNED PUT URL

### 2.1. Nghiêm cấm Upload File lớn qua API Gateway NestJS
* **Bảo vệ Băng thông & Server Performance:** File audio bài nộp Speaking (dung lượng từ 10MB đến 25MB) và file audio nhận xét của giảng viên **tuyệt đối không được gửi qua Multipart FormData đến máy chủ NestJS**.

### 2.2. Quy trình Upload Trực tiếp Direct-to-S3 Protocol
```text
[ Client (App/Web) ]                              [ Backend NestJS ]           [ S3 / R2 Bucket ]
         │                                               │                            │
         │── 1. Xin Presigned URL (mimeType, assignmentId) ─>│                            │
         │                                               │ (Tạo S3 Command)           │
         │<─ 2. Trả về { uploadUrl, fileKey } ───────────│                            │
         │                                                                            │
         │── 3. HTTP PUT file nhị phân trực tiếp (Expiration: 15 phút) ──────────────>│
         │<─ 4. S3 phản hồi HTTP 200 OK ──────────────────────────────────────────────│
         │                                               │                            │
         │── 5. Gửi POST /submissions kèm fileKey ──────>│ (Lưu bản ghi PostgreSQL)  │
```

1. **Khởi tạo Request:** Client gọi API `POST /api/v1/submissions/presigned-url` truyền metadata (`mimeType`, `assignmentId`).
2. **Cấp URL Hạn chế:** Backend xác thực quyền, tạo `fileKey` duy nhất (`submissions/{assignmentId}/{studentId}_{timestamp}.webm`) và sinh **S3 Presigned PUT URL có thời hạn hiệu lực đúng 15 phút (900 giây)**.
3. **Upload Trực tiếp:** Client dùng `fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: fileBlob })` đẩy file trực tiếp lên Cloud Storage.
4. **Xác nhận Bản ghi:** Sau khi S3 trả về 200 OK, Client mới gửi `fileKey` về Backend qua `POST /api/v1/submissions` để lưu vào CSDL.

---

## 3. PHÒNG CHỐNG TẤN CÔNG & BẢO VỆ DỮ LIỆU NHẠY CẢM

### 3.1. Chống SQL Injection & Parameterized Queries
* 100% câu truy vấn CSDL phải sử dụng **TypeORM Repository Methods** hoặc **QueryBuilder với Parameterized Values** (`$1`, `$2`).
* **Tuyệt đối cấm nối chuỗi SQL trực tiếp**:
  ```typescript
  // ❌ SAI (Nguy cơ SQL Injection):
  await this.dataSource.query(`SELECT * FROM users WHERE email = '${email}'`);

  // ✅ ĐÚNG (An toàn với Parameterized Query):
  await this.dataSource.query(`SELECT * FROM users WHERE email = $1`, [email]);
  ```

### 3.2. Phòng chống Rò rỉ Dữ liệu Nhạy cảm (Data Leak Prevention)
1. **Mật khẩu & Token Hash:**
   * Cột `password_hash` trong bảng `users` và `token_hash` trong `user_refresh_tokens` **bắt buộc cấu hình `{ select: false }`** trong TypeORM Entity.
   * DTO Response tuyệt đối không bao gồm các trường mật khẩu, hash hay refresh token.
2. **Chống Gian lận Bài thi & Quiz (Anti-Cheat Policy):**
   * Khi học viên gọi API lấy câu hỏi thi TOEIC (`GET /api/v1/exams/:id/start`) hoặc Quiz ngữ pháp (`GET /api/v1/student/grammar/lessons/:id/quiz`), Backend **bắt buộc ẩn trường `correct_option` và `explanation`** tại câu lệnh SELECT.
   * Học viên chỉ nhận được `question_text` và danh sách phương án `options` A, B, C, D để ngăn chặn việc soi tab Inspect/Network lấy đáp án.
3. **Bảo mật File Audio Private:**
   * Các tệp audio bài nộp Speaking và audio nhận xét giọng nói của giáo viên được lưu trữ ở chế độ **Private Storage**.
   * Khi giáo viên hoặc học viên xem lại bài nộp, Backend sinh **S3 Presigned GET URL ngắn hạn (hiệu lực 60 phút)** để nghe phát lại, tuyệt đối không công khai URL gốc.
