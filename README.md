# System Architecture & Vibe Coding Governance Standard
## Online TOEIC Learning & Exam Preparation System

Welcome to the official repository of the **Online TOEIC Learning & Exam Preparation System** (Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến). This repository is engineered under the **Disciplined Vibe Coding Methodology**—a high-velocity, AI-assisted engineering framework designed to achieve 3x development speed while maintaining enterprise-grade architectural integrity, strict type safety, and **Zero Technical Debt**.

---

## 1. TRIẾT LÝ "VIBE CODING CÓ KỶ LUẬT" (DISCIPLINED VIBE CODING)

Vibe Coding không phải là việc ra lệnh cho AI viết code ngẫu nhiên hay để AI tự do suy đoán kiến trúc. Trong dự án này, Vibe Coding là **phương pháp lập trình AI có kiểm soát (Guided AI-Driven Engineering)** dựa trên 3 trụ cột kỹ thuật:

```text
               ┌──────────────────────────────────────────────┐
               │    1. Ground Context (Strict Source Truth)   │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    2. Strict Type Safety (Zero 'any' Policy) │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    3. Automated & Manual Quality Gates (DoD)  │
               └──────────────────────────────────────────────┘
```

1. **High-Velocity with Zero Technical Debt:** Tốc độ phát triển tính năng tăng gấp 3 lần nhờ AI Coding Agents, nhưng mọi dòng code sinh ra đều bị kiểm soát bởi 35 Bảng CSDL v12.0, 62 RESTful APIs v11.0 và 4 Trụ cột Definition of Done.
2. **Context-Driven Autonomy:** AI Agent chỉ được phép đưa ra phương án xử lý dựa trên các tệp ngữ cảnh được nạp chính thức. Cấm hoàn toàn việc AI bịa đặt schema CSDL, tự chế API URI hoặc dùng kiểu `any` lười biếng.
3. **Deterministic Quality:** Mọi Pull Request trước khi Merge đều phải trải qua kiểm tra tĩnh (`npx tsc --noEmit`), Linter, Unit Test và Postman API contract verification.

---

## 2. MÔ HÌNH QUẢN LÝ TÀI LIỆU 2 TẦNG (2-TIER SPECIFICATION MODEL)

Toàn bộ hệ thống tri thức và kiến trúc của dự án được tổ chức theo **Mô hình Tài liệu 2 Tầng (2-Tier Specification Architecture)** giúp tối ưu hóa khả năng đọc của AI Coding Tools (ChatGPT, Claude, Gemini) và lập trình viên:

```text
toeic-vibe-coding-standard/
├── docs/
│   ├── [Quick Rules (Tầng 1 - Low Token Overhead)]
│   │   ├── architecture.md
│   │   ├── backend-rules.md
│   │   ├── frontend-rules.md
│   │   ├── database-rules.md
│   │   └── rbac-rules.md
│   │
│   ├── system-specs/                    <-- TẦNG 2: MASTER SOURCE OF TRUTH (Bản gốc)
│   │   ├── 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md
│   │   ├── 02_postgresql-16-ddl-schema-v12.md
│   │   ├── 03_api-endpoints-specification-v11.md
│   │   ├── 04_Thiet_Ke_Backend_Application_Layer_NestJS.md
│   │   ├── 05_backend-coding-rules.md
│   │   ├── 06_frontend-coding-rules.md
│   │   ├── 07_react-native-frontend-integration-guide.md
│   │   └── 08_rbac-permission-matrix.md
│   │
│   └── modules/                         <-- TẦNG 2: CÁC MODULE NGHIỆP VỤ CHI TIẾT
│       ├── MOD_ADM_ADMIN_TEACHING/
│       ├── MOD_STU_SELF_LEARNING/
│       ├── MOD_EXM_TOEIC_ENGINE/
│       └── MOD_TSK_ASSIGNMENTS/
```

### 📍 Tầng 1: Quick Rules (`docs/*.md`) — Tóm tắt Nhanh cho AI
* **Mục đích:** Cung cấp các nguyên tắc cốt lõi, quy chuẩn rút gọn với dung lượng Token thấp (Low Token Overhead) để nạp nhanh vào Window Context của AI.
* **Tệp tin tiêu biểu:**
  * [`docs/architecture.md`](docs/architecture.md): Tổng quan kiến trúc Monorepo, Data Flow & Async Messaging.
  * [`docs/backend-rules.md`](docs/backend-rules.md): Quy tắc Thin Controller, Transaction & BullMQ.
  * [`docs/frontend-rules.md`](docs/frontend-rules.md): Quy tắc Expo React Native, Next.js 14 App Router & TanStack Query v5.
  * [`docs/database-rules.md`](docs/database-rules.md): Quy tắc PostgreSQL 16 (35 Bảng v12.0) & Bán kính N+1 Query.
  * [`docs/rbac-rules.md`](docs/rbac-rules.md): Tóm tắt Ma trận phân quyền 4 Roles (`GUEST`, `STUDENT`, `TEACHER`, `ADMIN`).

### 📍 Tầng 2: Master Specs & Modules (`docs/system-specs/` & `docs/modules/`) — Bản gốc
* **Mục đích:** Đóng vai trò là **Nguồn Sự thật Duy nhất (Master Source of Truth)** chứa đầy đủ chi tiết mã nguồn SQL DDL, API Spec, DTOs và thuật toán nghiệp vụ.
* **Tệp tin tiêu biểu:**
  * [`docs/system-specs/01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md`](docs/system-specs/01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md): SRS & SDD Master.
  * [`docs/system-specs/02_postgresql-16-ddl-schema-v12.md`](docs/system-specs/02_postgresql-16-ddl-schema-v12.md): 35 Bảng CSDL v12.0 DDL & Indexes.
  * [`docs/system-specs/03_api-endpoints-specification-v11.md`](docs/system-specs/03_api-endpoints-specification-v11.md): Bảng 62 RESTful APIs v11.0.
  * [`docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md`](docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md): Động cơ SM-2.
  * [`docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md`](docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md): Vòng đời thi TOEIC 200 câu.

---

## 3. CÂY THƯ MỤC DỰ ÁN TỔNG THỂ (REPOSITORY STRUCTURE)

```text
toeic-vibe-coding-standard/ (Thư mục gốc Repo dự án)
├── README.md                          <-- File này (Hướng dẫn Tổng quan & Quick Start)
├── AGENTS.md                          <-- Quy chế hoạt động & 3 Chế độ (/plan, /code, /audit) của AI Agent
├── CODING_CONVENTIONS.md              <-- Quy chuẩn đặt tên, SOLID, Clean Code & Git Commit
├── VIBE_CODING_STANDARD.md            <-- Quy trình Vibe Coding 5 bước & Context Loading Matrix
├── DEFINITION_OF_DONE.md              <-- Tiêu chuẩn nghiệm thu 4 trụ cột kỹ thuật trước khi Merge
├── SECURITY_RULES.md                  <-- Quy định JWT Rotation, Presigned URL S3 & Anti-Cheat
│
├── docs/                              <-- TẦNG 1: QUICK RULES (Bản tóm tắt cho AI)
│   ├── architecture.md
│   ├── backend-rules.md
│   ├── frontend-rules.md
│   ├── database-rules.md
│   ├── rbac-rules.md
│   │
│   └── system-specs/                  <-- TẦNG 2: MASTER SOURCE OF TRUTH (Bản gốc)
│       ├── 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md
│       ├── 02_postgresql-16-ddl-schema-v12.md
│       ├── 03_api-endpoints-specification-v11.md
│       ├── 04_Thiet_Ke_Backend_Application_Layer_NestJS.md
│       ├── 05_backend-coding-rules.md
│       ├── 06_frontend-coding-rules.md
│       ├── 07_react-native-frontend-integration-guide.md
│       └── 08_rbac-permission-matrix.md
│
├── docs/modules/                      <-- NƠI CHỨA TÀI LIỆU THIẾT KẾ CÁC MODULE NGHIỆP VỤ
│   ├── _TEMPLATE_MODULE_SPEC.md       <-- File mẫu chuẩn để viết spec module mới
│   ├── MOD_ADM_ADMIN_TEACHING/        <-- Phân hệ Quản trị & Giảng dạy (ADM_01 đến ADM_04)
│   ├── MOD_STU_SELF_LEARNING/         <-- Phân hệ Học tập Cá nhân (STU_01 đến STU_06)
│   ├── MOD_EXM_TOEIC_ENGINE/          <-- Phân hệ Động cơ Thi thử TOEIC (EXM_01 đến EXM_03)
│   └── MOD_TSK_ASSIGNMENTS/           <-- Phân hệ Bài tập & Studio Chấm điểm (TSK_01 đến TSK_04)
│
└── platform-instructions/             <-- SYSTEM PROMPTS CHO CÁC AI TOOLS
    ├── CHATGPT.md
    ├── CLAUDE.md
    └── GEMINI.md
```

---

## 4. HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN KHỞI ĐỘNG CA LÀM VIỆC VỚI AI

Khi bắt đầu một Session lập trình mới với AI Tools (Cursor, ChatGPT, Claude Code, Gemini), lập trình viên bắt buộc phải tuân theo 4 bước khởi động:

1. **Bước 1 — Chọn Chế độ Thực thi (Mode):**
   * Nếu cần thiết kế tính năng mới: Gõ lệnh `/plan [Mô tả tính năng]`.
   * Nếu cần viết code cho module: Gõ lệnh `/code [Tên Use-case]`.
   * Nếu cần rà soát mã nguồn: Gõ lệnh `/audit [Đường dẫn file code]`.
2. **Bước 2 — Nạp ngữ cảnh theo Ma trận Context (`VIBE_CODING_STANDARD.md`):**
   * Ví dụ làm Backend Task: Tag các tệp [`docs/backend-rules.md`](docs/backend-rules.md), [`docs/system-specs/02_postgresql-16-ddl-schema-v12.md`](docs/system-specs/02_postgresql-16-ddl-schema-v12.md), [`docs/system-specs/03_api-endpoints-specification-v11.md`](docs/system-specs/03_api-endpoints-specification-v11.md) và tệp Spec module tương ứng trong [`docs/modules/`](docs/modules/).
3. **Bước 3 — Thực thi & Rà soát (Scrutinize Code):**
   * Đối chiếu code AI sinh ra với 3 Giới hạn cấm trong [`AGENTS.md`](AGENTS.md) (Không tự bịa schema, không chế API URI, không dùng `any`).
4. **Bước 4 — Nghiệm thu Cục bộ (Quality Gates):**
   * Chạy `npx tsc --noEmit` và `npm run lint` tại local. Đối chiếu 4 Trụ cột trong [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) trước khi tạo Commit.
