# HƯỚNG DẪN TRIỂN KHAI DỰ ÁN MIỄN PHÍ 100% (FREE-TIER DEPLOYMENT GUIDE)
## Hệ Thống Học & Thi Thử TOEIC Tiêu Chuẩn

> **Tài liệu lưu trữ:** `logs/free_deployment_guide.md`  
> **Phiên bản:** 1.0.0 (Production-Ready)  
> **Mục tiêu:** Hướng dẫn từng bước triển khai toàn bộ hệ thống gồm Backend NestJS, PostgreSQL 16, Redis/BullMQ, Frontend React/Vite và Media Storage lên môi trường đám mây với chi phí **\$0 / tháng**.

---

## 1. SO SÁNH 2 MÔ HÌNH TRIỂN KHAI MIỄN PHÍ

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          BẢNG SO SÁNH 2 PHƯƠNG ÁN FREE TIER                            │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ TIÊU CHÍ                 │ PHƯƠNG ÁN 1: CLOUD SERVERLESS│ PHƯƠNG ÁN 2: ORACLE ALWAYS FREE│
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Phù hợp cho              │ Demo, Nộp bài tập, Đồ án    │ Hệ thống thực tế, chạy 24/7   │
│ Yêu cầu thẻ tín dụng     │ KHÔNG cần thẻ tín dụng      │ Cần thẻ để xác thực lúc tạo   │
│ Backend Hosting          │ Koyeb (512MB) hoặc Render   │ VPS Ubuntu (4 Core, 24GB RAM) │
│ Trạng thái Sleep         │ Koyeb: KHÔNG ngủ (24/7)     │ KHÔNG bao giờ ngủ (24/7)      │
│ Cơ sở dữ liệu Postgres   │ Neon.tech (0.5GB Serverless)│ PostgreSQL 16 chạy trong Docker│
│ Redis / BullMQ           │ Upstash (10k cmds/ngày)     │ Redis 7 chạy trong Docker     │
│ Frontend Web             │ Cloudflare Pages (Cực nhanh)│ Cloudflare Pages hoặc Nginx   │
│ Media / Audio Storage    │ Cloudflare R2 (10GB Free)   │ Cloudflare R2 hoặc Local S3   │
│ Thời gian thiết lập      │ 15 - 20 phút                │ 30 - 45 phút                  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. PHƯƠNG ÁN 1: COMBO CLOUD SERVERLESS MIỄN PHÍ 100%

### Bước 1: Tạo Database PostgreSQL 16 Miễn Phí trên Neon.tech
1. Truy cập [https://neon.tech](https://neon.tech) và đăng ký tài khoản (bằng GitHub).
2. Tạo Project mới:
   * **Project Name:** `toeic-production`
   * **Postgres Version:** Chọn `PostgreSQL 16`
   * **Region:** Chọn `Singapore (ap-southeast-1)` để có độ trễ thấp nhất về Việt Nam.
3. Sau khi tạo xong, Neon sẽ cấp cho bạn một chuỗi kết nối dạng:
   ```text
   postgresql://rl_admin:SecretPassword@ep-cool-flower-123456.ap-southeast-1.aws.neon.tech/toeic_db?sslmode=require
   ```
4. Mở tab **SQL Editor** trên Neon và dán toàn bộ mã nguồn DDL v12.0 từ tệp `docs/system-specs/02_postgresql-16-ddl-schema-v12.md` để khởi tạo 35 bảng CSDL.

---

### Bước 2: Tạo Redis Miễn Phí trên Upstash (Dành cho BullMQ Queue)
1. Truy cập [https://upstash.com](https://upstash.com) và đăng nhập bằng GitHub.
2. Chọn **Create Database**:
   * **Name:** `toeic-redis`
   * **Type:** Regional (Chọn `ap-southeast-1` Singapore).
   * **TLS:** Bật `Enabled`.
3. Lấy các thông số kết nối:
   * `REDIS_HOST`: endpoint Upstash (VD: `ap1-xxxx.upstash.io`)
   * `REDIS_PORT`: `6379`
   * `REDIS_PASSWORD`: mật khẩu Upstash cung cấp.

---

### Bước 3: Triển khai Backend NestJS lên Koyeb hoặc Render

#### Cách A: Triển khai trên Koyeb (Khuyến nghị vì KHÔNG bị ngủ)
1. Truy cập [https://koyeb.com](https://koyeb.com) và kết nối GitHub repository `toeic-standard`.
2. Chọn **GitHub Repository Deployment**:
   * **Branch:** `main`
   * **Build Type:** `Dockerfile` (hệ thống sẽ tự nhận diện `Dockerfile` đa tầng vừa tạo).
   * **Instance Type:** `Nano` (Free 512MB RAM).
3. Cấu hình **Environment Variables**:
   * `NODE_ENV`: `production`
   * `PORT`: `3000`
   * `DATABASE_URL`: Dán chuỗi kết nối từ Neon.tech ở Bước 1.
   * `DB_SSL`: `true`
   * `JWT_SECRET`: Khóa bí mật tùy ý (VD: `my-super-strong-jwt-secret-toeic-2026`)
   * `S3_BUCKET_URL`: URL Cloudflare R2 bucket của bạn.
4. Nhấn **Deploy**. Koyeb sẽ build Dockerfile và cấp cho bạn một URL dạng:
   `https://toeic-backend-xxxx.koyeb.app`

#### Cách B: Triển khai trên Render.com
1. Truy cập [https://render.com](https://render.com) -> New -> **Blueprint**.
2. Chọn repo `toeic-standard` -> Render sẽ tự động đọc tệp `render.yaml` và thiết lập web service.

---

### Bước 4: Triển khai Frontend Web lên Cloudflare Pages
1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Chọn Repository `toeic-standard`.
3. Cấu hình Build Settings:
   * **Framework preset:** `Vite`
   * **Build command:** `npm run build`
   * **Build output directory:** `dist`
   * **Root directory:** `web`
4. Cấu hình **Environment Variables**:
   * `VITE_API_BASE_URL`: URL Backend Koyeb/Render bạn vừa tạo ở Bước 3 (VD: `https://toeic-backend-xxxx.koyeb.app/api/v1`).
5. Nhấn **Save and Deploy**. Cloudflare sẽ build và cung cấp tên miền toàn cầu dạng:
   `https://toeic-web.pages.dev` với chứng chỉ SSL HTTPS miễn phí trọn đời!

---

## 3. PHƯƠNG ÁN 2: TRIỂN KHAI VỚI DOCKER COMPOSE TRÊN ORACLE CLOUD ALWAYS FREE

Phương án này chạy toàn bộ các dịch vụ trên một máy chủ Linux độc lập (VPS) cực mạnh (24GB RAM, 4 CPU ARM):

### Bước 1: Chuẩn bị máy chủ VPS
1. Tạo một máy ảo Ubuntu 22.04 LTS (Shape: `VM.Standard.A1.Flex`, 4 OCPU, 24GB RAM).
2. Mở các cổng mạng (Ingress Rules trên Security List): `80`, `443`, `3000`, `3001`.
3. SSH vào máy chủ và cài đặt Docker + Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   sudo usermod -aG docker $USER
   newgrp docker
   ```

### Bước 2: Clone dự án và khởi chạy Docker Compose
1. Clone mã nguồn về VPS:
   ```bash
   git clone https://github.com/tungnh1123/toeic-standard.git
   cd toeic-standard
   ```
2. Cấu hình tệp biến môi trường `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. Khởi động toàn bộ cụm dịch vụ bằng 1 lệnh duy nhất:
   ```bash
   docker compose up -d --build
   ```
4. Kiểm tra trạng thái các container:
   ```bash
   docker compose ps
   ```
   Bạn sẽ thấy 4 container hoạt động đồng bộ:
   * `toeic_postgres`: PostgreSQL 16 (Port 5432)
   * `toeic_redis`: Redis 7 (Port 6379)
   * `toeic_backend`: NestJS Production (Port 3000)
   * `toeic_web`: Web SPA Nginx (Port 3001)

### Bước 3: Khởi tạo dữ liệu mẫu (Seed Database)
Chạy lệnh seed tài khoản Quản trị viên và Giảng viên trực tiếp vào container:
```bash
docker exec -it toeic_backend node dist/scripts/seed-admin-teacher.js
```

---

## 4. TÀI KHOẢN MẪU ĐĂNG NHẬP SAU KHI TRIỂN KHAI

Sau khi triển khai thành công, sử dụng các tài khoản sau để đăng nhập:

| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| **👑 ADMIN** | `admin@toeic.edu.vn` | `Admin123!` |
| **🎓 TEACHER** | `teacher@toeic.edu.vn` | `Teacher123!` |
| **✏️ STUDENT** | `test.student@example.com` | `Password123!` |

---

## 5. CHECKLIST KIỂM ĐỊNH SAU TRIỂN KHAI (VERIFICATION CHECKLIST)

- [ ] Backend API trả về mã HTTP 200 tại `/api/v1/auth/login`.
- [ ] Database PostgreSQL kết nối thành công, lưu được session và bản ghi mới.
- [ ] Redis/BullMQ tiếp nhận được job thông báo khi chấm điểm hoàn tất.
- [ ] Frontend tải thành công qua HTTPS, chuyển tab và hiển thị đúng vai trò Admin/Học viên.
- [ ] Studio Chấm Writing (ADM0302) lưu nháp và công bố điểm trơn tru.

