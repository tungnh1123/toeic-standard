# docs/backend-rules.md — Quick Rules: Backend NestJS Architecture Guidelines
## Project: Online TOEIC Learning & Exam Preparation System

* **Framework:** NestJS 10+, TypeScript 5.x, TypeORM
* **Infrastructure:** PostgreSQL 16, Redis 7, BullMQ Queue, AWS S3 / Cloudflare R2
* **Status:** Mandatory & Inviolable Quick Reference

---

## 1. MÔ HÌNH "THIN CONTROLLER - FAT SERVICE"

### Controller Layer (Mỏng - Routing & Guard Entry Point)
* Chỉ nhận HTTP Request / WebSocket Frames.
* Gọi Guards (, ) và Interceptors.
* Validate DTOs bằng Pipes (, ).
* Ủy quyền xử lý 100% cho Service. **Tuyệt đối CẤM chứa SQL query, QueryBuilder, hay logic toán học/nghiệp vụ trong Controller**.



### Service Layer (Dày - Core Domain Business Engine)
* Chứa 100% logic nghiệp vụ, tính toán toán học (SRS SM-2, quy đổi điểm ETS, Radar 6 kỹ năng).
* Điều phối CSDL Transactions và tương tác Redis / BullMQ Queue.

---

## 2. CHUẨN CẤU TRÚC RESPONSE ENVELOPE BẮT BUỘC

Mọi API thành công trả về dữ liệu được bọc tự động qua :



---

## 3. MÃ CODE CSDL TRANSACTION ĐA BẢNG

Mọi thao tác ghi/sửa dữ liệu liên quan từ 2 bảng trở lên **bắt buộc bọc trong **:



---

## 4. CÁCH LY TÁC VỤ NẶNG QUA BULLMQ QUEUE ()

Tác vụ tiêu tốn > 100ms (FCM Push Notification, Email báo điểm, nén bitrate audio) **bắt buộc đẩy vào BullMQ Queue**:

Bài tập "" đạt /100 điểm.
