# docs/architecture.md — Quick Rule: System Architecture & API Ecosystem Overview
## System: Online TOEIC Learning & Exam Preparation System

* **Document Identifier:** Quick Rule Architecture Guide
* **Version:** 3.0.0 (Synced with RESTful API v11.0 & PostgreSQL 16 v12.0)
* **Target Audience:** AI Coding Agents & Full-stack Developers

---

## 1. SƠ ĐỒ PHÂN TẦNG KIẾN TRÚC TỔNG THỂ (SYSTEM ARCHITECTURE LAYERS)

Hệ thống được thiết kế theo mô hình **Monorepo Tách biệt Client - Server (Decoupled Client-Server Monorepo)** với đường truyền HTTPS RESTful API chuẩn hóa:

```text
+-----------------------------------------------------------------------------------+
|                                TẦNG CLIENT (FRONTEND)                             |
|  +-----------------------------------+     +-----------------------------------+  |
|  |  Mobile App (Học viên)            |     |  Admin Web Portal (Giáo viên/Admin)|  |
|  |  - React Native (Expo SDK 51)     |     |  - Next.js 14 (App Router - RSC)  |  |
|  |  - NativeWind (Tailwind CSS)      |     |  - Tailwind CSS & shadcn/ui       |  |
|  |  - TanStack Query v5 + Zustand    |     |  - WaveSurfer.js & Media Recorder |  |
|  +-----------------------------------+     +-----------------------------------+  |
+------------------------------------------┬----------------------------------------+
                                           │
                        HTTPS RESTful API  │  Base Path: /api/v1/
                        Authorization:     │  Bearer <access_token>
                                           ▼
+-----------------------------------------------------------------------------------+
|                           TẦNG GIAO VẬN & CHUYỂN ĐỔI (NESTJS)                    |
|  - Global Rate Limiter (@nestjs/throttler)                                        |
|  - JwtAuthGuard & RolesGuard (RBAC 4 Roles: GUEST, STUDENT, TEACHER, ADMIN)      |
|  - TransformResponseInterceptor (Response Envelope) & AllExceptionsFilter          |
+------------------------------------------┬----------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------+
|                        TẦNG XỬ LÝ NGHIỆP VỤ (APPLICATION LAYER)                    |
|  +---------------------+ +---------------------+ +------------------------------+ |
|  | FlashcardsService   | | ToeicScoringService | | ClassAnalyticsService        | |
|  | - Thuật toán SM-2   | | - Sync Redis Hash   | | - Cache Redis 5 phút        | |
|  | - Bọc Transaction   | | - Scale Map 10-990  | | - Anti Cartesian Join      | |
|  +---------------------+ +---------------------+ +------------------------------+ |
|  +------------------------------------------------------------------------------+ |
|  | BullMQ Background Worker Queue (@InjectQueue('notifications'))              | |
|  | - Gửi Push Notification FCM, Email báo điểm, nén audio ngầm                   | |
|  +------------------------------------------------------------------------------+ |
+------------------------------------------┬----------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------+
|                              TẦNG LƯU TRỮ (STORAGE LAYER)                         |
|  +-----------------------+   +-----------------------+   +---------------------+  |
|  | PostgreSQL 16         |   | Redis 7               |   | S3 / Cloudflare R2  |  |
|  | - 35 Bảng CSDL v12.0  |   | - Session Cache       |   | - Storage Private   |  |
|  | - Extensions: uuid,   |   | - Sync nháp thi TOEIC |   | - Direct Upload     |  |
|  |   pg_trgm (GIN)       |   | - Throttler Bucket    |   |   Presigned PUT URL |  |
|  +-----------------------+   +-----------------------+   +---------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. PHÂN BỔ 62 RESTFUL API ENDPOINTS V11.0 THEO PHÂN HỆ NGHIỆP VỤ

Toàn bộ **62 RESTful Endpoints v11.0** được tổ chức thống nhất dưới Base Path `/api/v1/` và phân bổ theo 11 cụm nghiệp vụ:

| Cụm Phân hệ Nghiệp vụ | Số lượng Endpoints | Dải Endpoint STT | Mô tả Tóm tắt Chức năng |
| :--- | :---: | :---: | :--- |
| **1. Auth & Hồ sơ Cá nhân** | **9 APIs** | `#1 - #9` | Đăng nhập/đăng ký, Refresh Token Rotation, cập nhật hồ sơ, đổi mật khẩu và xin S3 Presigned URL cho Avatar. |
| **2. Danh mục Thẻ & Học 3D** | **6 APIs** | `#10 - #15` | Tra cứu bộ thẻ CEFR, chi tiết danh sách từ vựng, toggle yêu thích và khởi tạo phiên học 3D tương tác. |
| **3. Sổ tay Từ vựng STARRED** | **9 APIs** | `#16 - #24` | Quản lý sổ tay cá nhân, thêm/xóa từ vựng, lưu mẹo nhớ cá nhân và tính năng Đánh dấu sao nhanh (`quick-star`). |
| **4. Lý thuyết Ngữ pháp GFM** | **6 APIs** | `#25 - #30` | Danh mục chuyên đề, đọc bài giảng Markdown Render, cập nhật % cuộn trang và ghim bài học gần đây. |
| **5. Động cơ Thuật toán SM-2** | **4 APIs** | `#31 - #34` | Lấy danh sách từ đến hạn ôn, gửi đánh giá trí nhớ (Rating 1-4), cập nhật lô (batch review) và thống kê Retention Rate. |
| **6. Quiz Củng cố Ngữ pháp** | **4 APIs** | `#35 - #38` | Lấy câu hỏi quiz củng cố (ẩn đáp án đúng), nộp bài chấm điểm, lưu lịch sử và xem lại chi tiết bài làm đúng/sai. |
| **7. Streak Engine & Heatmap** | **4 APIs** | `#39 - #42` | Kiểm tra trạng thái ngọn lửa hôm nay, ma trận Heatmap 365 ngày, kích hoạt vé bảo lưu Streak Freeze và danh sách huy hiệu. |
| **8. Skill Radar 6 Kỹ năng** | **5 APIs** | `#43 - #47` | Dữ liệu Radar 6D, chẩn đoán 2 điểm yếu nhất kèm bài học gợi ý, lọc từ khó tự động (EF <= 1.70) và tính lại chỉ số. |
| **9. Động cơ Thi thử TOEIC** | **4 APIs** | `#48 - #51` | Danh mục đề thi, bắt đầu lượt thi 200 câu, đồng bộ đáp án nháp thời gian thực lên Redis Hash và nộp bài chấm điểm ETS. |
| **10. Bài tập & Upload Media** | **3 APIs** | `#52 - #54` | Danh sách bài tập cá nhân, xin Presigned PUT URL an toàn upload audio Speaking và nộp bài làm chính thức. |
| **11. Quản trị & Giảng dạy** | **8 APIs** | `#55 - #62` | Tạo đề gốc Template, giao bài theo lớp kèm Deadline riêng, gắn câu hỏi Quiz, lọc bài nộp, chấm Rubric và Import TOEIC Excel. |

---

## 3. QUY TRÌNH LUỒNG DỮ LIỆU CHUẨN HOÁ (STANDARD DATA FLOW)

1. **Client Request:** Frontend đính kèm Token `Authorization: Bearer <access_token>` gửi request.
2. **Gateway Guard:** `JwtAuthGuard` giải mã JWT Payload; `RolesGuard` đối chiếu với `@Roles(...)` yêu cầu.
3. **Application Layer:**
   * Thao tác đọc: Kiểm tra Redis Cache -> Nếu Miss, truy vấn PostgreSQL -> Trả về Client.
   * Thao tác ghi đa bảng: Bọc trong `this.dataSource.transaction(async manager => { ... })`.
   * Thao tác tác vụ nặng: Gửi Message Payload vào BullMQ Queue `@InjectQueue('notifications')`.
4. **Response Envelope:** `TransformResponseInterceptor` bọc dữ liệu trả về cấu trúc chuẩn:
   ```json
   {
     "statusCode": 200,
     "success": true,
     "message": "Thao tác thành công",
     "data": { ... },
     "timestamp": "2026-10-12T19:40:00.000Z"
   }
   ```
