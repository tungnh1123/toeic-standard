# DEFINITION_OF_DONE.md — Bản Tiêu chuẩn Nghiệm thu Kỹ thuật (Definition of Done)
## Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến

---

## 📋 CHECKLIST 4 TRỤ CỘT NGHIỆM THU TRƯỚC KHI MERGE PULL REQUEST

Mọi Pull Request (PR) trước khi được duyệt Merge vào nhánh chính (`develop` / `main`) bắt buộc phải thỏa mãn 100% các tiêu chí kiểm định dưới đây:

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)

| STT | Hạng mục kiểm định | Tiêu chuẩn nghiệm thu chi tiết | Trạng thái |
| :---: | :--- | :--- | :---: |
| **1.1** | **Strict TypeScript Compilation** | Lệnh `npx tsc --noEmit` thực thi thành công, không phát sinh bất kỳ lỗi biên dịch nào. | [ ] |
| **1.2** | **Absolute Zero `any`** | **0 từ khóa `any` hoặc `as any`** trong toàn bộ mã nguồn. 100% biến, tham số, DTOs, Entities và API Callers đều được khai báo kiểu dữ liệu tường minh. | [ ] |
| **1.3** | **Boolean Variable Prefixing** | 100% thuộc tính/biến kiểu `boolean` tuân thủ các tiền tố `is`, `has`, `can`, `should` (VD: `isCompleted`, `hasAudio`, `isPublished`). | [ ] |
| **1.4** | **Input DTO Validation** | 100% Body/Query DTOs được bọc Decorators từ `class-validator` (`@IsString()`, `@IsUUID()`, `@Min()`, `@Max()`). 100% tham số URL ID có `@Param('id', ParseUUIDPipe)`. | [ ] |
| **1.5** | **Lint & Format Standards** | Mã nguồn vượt qua kiểm tra `npm run lint` (ESLint) và được format chuẩn mực bằng Prettier (`npx prettier --check .`). | [ ] |

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & HIỆU NĂNG (PERFORMANCE & INTEGRITY)

| STT | Hạng mục kiểm định | Tiêu chuẩn nghiệm thu chi tiết | Trạng thái |
| :---: | :--- | :--- | :---: |
| **2.1** | **No N+1 Query in Loops** | **0 câu lệnh SQL/TypeORM `await` nằm trong vòng lặp (`for`, `map`, `forEach`)**. Tác vụ ghi nhiều dòng bắt buộc dùng Batch Insert (`INSERT INTO ... VALUES (...)`). | [ ] |
| **2.2** | **Multi-table Database Transaction** | Thao tác ghi/sửa dữ liệu liên quan từ 2 bảng trở lên (Nộp bài thi TOEIC, Đánh giá SM-2, Chấm điểm Rubric, Giao bài tập) **bắt buộc bọc trong `this.dataSource.transaction(...)`**. | [ ] |
| **2.3** | **BullMQ Background Isolation** | Tác vụ tiêu tốn trên 100ms (Gửi Email báo điểm, FCM Push Notification, nén bitrate audio) được đẩy vào hàng đợi ngầm **BullMQ Queue** (`@InjectQueue('notifications')`). | [ ] |
| **2.4** | **Submissions Join Integrity** | Đã kiểm tra câu lệnh SQL/QueryBuilder lọc bài nộp JOIN trực tiếp qua `s.class_id`, **không JOIN qua `class_enrollments`** để tránh lỗi nhân bản dòng (Cartesian Product). | [ ] |
| **2.5** | **Core Algorithm Precision** | Thuật toán SM-2 cập nhật Ease Factor chuẩn biên độ ($EF \ge 1.30$); Động cơ Thi TOEIC sync đáp án vào Redis Hash (< 5ms) và tra đúng bảng quy đổi điểm ETS (10–990). | [ ] |

---

### TRỤ CỘT 3: BẢO MẬT, PHÂN QUYỀN RBAC & DIRECT-TO-S3

| STT | Hạng mục kiểm định | Tiêu chuẩn nghiệm thu chi tiết | Trạng thái |
| :---: | :--- | :--- | :---: |
| **3.1** | **RBAC Guard Enforcement** | 100% API Endpoints Quản trị/Giảng dạy được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và đính kèm `@Roles(UserRole.TEACHER, UserRole.ADMIN)`. | [ ] |
| **3.2** | **Dual-Token & Rotation** | Sử dụng duy nhất bảng `user_refresh_tokens` cho cả 3 vai trò. Endpoint Refresh Token triển khai cơ chế vô hiệu hóa token cũ (`is_revoked = true`) và cấp cặp token mới. | [ ] |
| **3.3** | **Direct-to-S3 Protocol** | Tệp media lớn (> 10MB như Audio Speaking bài nộp) **không upload qua server NestJS**, bắt buộc xin Presigned PUT URL và upload trực tiếp từ Client lên S3/R2 Bucket. | [ ] |
| **3.4** | **Anti-Cheat & Data Privacy** | Các API nạp câu hỏi thi TOEIC / Quiz củng cố **đã ẩn trường `correct_option` và `explanation`** trong câu lệnh `select`. Ẩn tuyệt đối `password_hash` và `token_hash`. | [ ] |
| **3.5** | **Standard Error Envelope** | 100% Exception bắn ra bọc trong cấu trúc Error Envelope chuẩn chứa mã lỗi `errorCode` (VD: `ERR_VAL_001`, `ERR_NOT_FOUND`). | [ ] |

---

### TRỤ CỘT 4: KIỂM THỬ & KIỂM TRA API CONTRACT (TESTING)

| STT | Hạng mục kiểm định | Tiêu chuẩn nghiệm thu chi tiết | Trạng thái |
| :---: | :--- | :--- | :---: |
| **4.1** | **Unit Test Coverage** | Bổ sung Unit Test cho các Services cốt lõi (`FlashcardsService`, `ToeicScoringService`, `GradingService`, `StreakEngineService`) đạt tỷ lệ bao phủ Coverage $\ge 80\%$. | [ ] |
| **4.2** | **Postman Contract Test** | Đã kiểm thử thành công trên Postman / Swagger đối với các mã trạng thái HTTP: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`. | [ ] |
| **4.3** | **Clean Commit History** | Lịch sử Commit tuân thủ Conventional Commits (`feat`, `fix`, `refactor`). Đã xóa bỏ hoàn toàn câu lệnh `console.log()` debug thừa và thông tin nhạy cảm hardcode. | [ ] |
