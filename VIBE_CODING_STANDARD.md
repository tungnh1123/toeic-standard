# VIBE_CODING_STANDARD.md — Quy trình Vibe Coding Có Kỷ luật dành cho Developer
## System: Online TOEIC Learning & Exam Preparation System

* **Document Title:** Disciplined Vibe Coding Protocol & Operational Standard
* **Version:** 4.0.0 (Master Release)
* **Target Audience:** All Full-stack Developers, Backend Engineers, Frontend/Mobile Engineers & AI Coding Agents
* **Enforcement:** Mandatory for all AI-Assisted Feature Development and Code Contributions

---

## 1. TRIẾT LÝ VIBE CODING CÓ KỶ LUẬT (THE DISCIPLINED VIBE CODING PHILOSOPHY)

### 1.1. Định nghĩa Triết lý (High-Velocity with Zero Technical Debt)
Vibe Coding không phải là viết code ngẫu nhiên bằng cách giao phó hoàn toàn cho AI mà không có sự kiểm soát. Trong dự án **Hệ thống Học tiếng Anh & Luyện thi TOEIC Trực tuyến**, Vibe Coding được định nghĩa là **Phương pháp Lập trình do AI Hỗ trợ có Kiểm soát (Guided AI-Driven Engineering)**.

Tận dụng sức mạnh của các AI Coding Agents giúp **tăng tốc độ phát triển tính năng gấp 3 lần (x3 Velocity)**, nhưng phải tuân thủ nghiêm ngặt các khuôn mẫu kiến trúc, quy chuẩn gõ mã và quy trình kiểm định tự động để bảo đảm **Zero Technical Debt**.

```text
+-----------------------------------------------------------------------------------+
|                        THE DISCIPLINED VIBE CODING TRIANGLE                       |
|                                                                                   |
|                              [ DEVELOPER ARCHITECT ]                              |
|                            (100% Accountability & DoD)                            |
|                                         /\                                        |
|                                        /  \                                       |
|                                       /    \                                      |
|                                      /      \                                     |
|                                     /        \                                    |
|   [ MASTER SPECS & CONTEXT ] <----─----------─----> [ AI AUTONOMOUS AGENT ]      |
|  (35 Tables DDL / 62 API Endpoints)              (High-Speed Execution Engine)    |
+-----------------------------------------------------------------------------------+
```

### 1.2. Nguyên tắc Trách nhiệm của Developer
1. **Developer là Kiến trúc sư và Gatekeeper (100% Accountability):** AI Agent chỉ là công cụ gõ mã tốc độ cao. Developer chịu trách nhiệm 100% về tính đúng đắn, độ an toàn bảo mật, hiệu năng và chất lượng mã nguồn đẩy lên Repository.
2. **Không Tin tưởng Tuyệt đối vào AI Code (Trust but Verify):** Mọi đoạn mã do AI sinh ra phải được Developer rà soát kỹ lưỡng (Scrutinize) qua Checklist 5 điểm chết trước khi thực thi kiểm thử hoặc tạo Commit.
3. **Tuân thủ Nguồn Sự thật Duy nhất (Source Grounding First):** Mọi logic nghiệp vụ, tên bảng CSDL, tham số API, mã lỗi hệ thống bắt buộc phải đối chiếu khớp 100% với tài liệu Master Specs tại `docs/system-specs/` và Module Specs tại `docs/modules/`.

---

## 2. QUY TRÌNH VẬN HÀNH 2 GIAI ĐOẠN (TWO-STAGE OPERATIONAL WORKFLOW)

Quy trình phát triển trong dự án được chuẩn hóa thành 2 giai đoạn vận hành riêng biệt giữa Developer và AI Agent:

```text
+-----------------------------------------------------------------------------------+
|                     TWO-STAGE OPERATIONAL LIFECYCLE WORKFLOW                      |
|                                                                                   |
|  [ GIAI ĐOẠN 1: KHỞI TẠO BASE DỰ ÁN ]                                              |
|  Command: /init-base                                                              |
|  -> Chạy 1 lần duy nhất khi setup dự án hoặc bổ sung Hạ tầng Khung Base.          |
|  -> Sinh: Interceptors, Exception Filters, Auth Guards, Axios Client, Query Prov. |
|                                                                                   |
|                                    │                                              |
|                                    ▼                                              |
|  [ GIAI ĐOẠN 2: PHÁT TRIỂN THEO MODULE NGHIỆP VỤ ]                                 |
|  Command: /exec-module <path_to_module_spec>                                      |
|  -> Thực thi liên tục cho từng tính năng theo quy trình 6 bước khép kín:          |
|     1. Verify Spec  ─>  2. DTOs  ─>  3. Service+Transaction  ─>                   |
|     4. Controller+RBAC  ─>  5. Client Hook/UI  ─>  6. DoD Audit                   |
+-----------------------------------------------------------------------------------+
```

### 2.1. Giai đoạn 1: Khởi tạo Base Dự án một lần duy nhất (`/init-base`)
Giai đoạn này được thực thi một lần duy nhất khi khởi tạo Repository hoặc thiết lập khung hạ tầng mới. Developer ra lệnh `/init-base` để Agent tự động sinh bộ tệp tin Base Framework và đặt đúng vào các vị trí cây thư mục chuẩn:

1. **`src/common/interceptors/transform-response.interceptor.ts`:** Interceptor NestJS tự động chuẩn hóa mọi phản hồi API thành cấu trúc Standard Response Envelope `{ statusCode, success, message, data, meta, timestamp }`.
2. **`src/common/filters/all-exceptions.filter.ts`:** Global Exception Filter bắt mọi lỗi `HttpException` và lỗi CSDL PostgreSQL (Duplicate Key `23505`, Foreign Key `23503`) để bọc vào Error Envelope chứa mã lỗi hệ thống `errorCode` (`ERR_VAL_xxx`, `ERR_NOT_FOUND`).
3. **`src/common/guards/jwt-auth.guard.ts` & `roles.guard.ts`:** Guards xác thực Bearer Token JWT và kiểm tra phân quyền RBAC dựa trên `@Roles(...)`.
4. **`src/common/decorators/roles.decorator.ts`:** Custom Decorator gắn metadata quyền hạn (`ADMIN`, `TEACHER`, `STUDENT`) trên các Route Handlers.
5. **`src/api/api-client.ts` (Frontend Client):** Axios Instance tích hợp Request Interceptor tự động gắn Access Token và Response Interceptor bắt mã HTTP `401 Unauthorized` để gọi ngầm Silent Refresh Token Rotation (`/api/v1/auth/refresh-token`).
6. **`src/providers/query-provider.tsx` (Frontend Client):** TanStack Query Provider với Query Key Factory được chuẩn hóa.

### 2.2. Giai đoạn 2: Phát triển theo Module Nghiệp vụ (`/exec-module <path>`)
Giai đoạn phát triển tính năng diễn ra hàng ngày. Developer chọn 1 tệp tin đặc tả module trong thư mục `docs/modules/` (ví dụ: `docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md`) và ra lệnh:

```bash
/exec-module docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md
```

Agent sẽ đọc mục **"TASK BREAKDOWN FOR AGENT"** trong tệp đặc tả và tự động thực thi tuần tự 6 bước:
1. **Step 1 — Verify Spec:** Kiểm tra độ khớp của tệp spec với Master Schema CSDL 35 bảng v12.0 và 62 API Endpoints v11.0.
2. **Step 2 — Sinh DTOs & Validation:** Sinh toàn bộ Class DTOs có đính kèm `class-validator` và `class-transformer`.
3. **Step 3 — Sinh Service & CSDL Transaction:** Sinh Service chứa 100% thuật toán nghiệp vụ (SM-2, ETS Mapping, Rubric), bọc `this.dataSource.transaction` cho các thao tác ghi đa bảng.
4. **Step 4 — Sinh Controller & RBAC:** Sinh Controller mỏng, gắn `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.
5. **Step 5 — Sinh Client Hooks & Component UI:** Sinh Custom Query Hooks (TanStack Query v5) và Component UI (React Native Expo hoặc Next.js 14 RSC/Client).
6. **Step 6 — Chạy DoD Audit Verification:** Quét tự động 4 Trụ cột trong `DEFINITION_OF_DONE.md` và xuất báo cáo kết quả.

---

## 3. CHU TRÌNH 5 BƯỚC THỰC THI TASK CỦA DEVELOPER (THE 5-STEP VIBE LOOP)

Trong từng ca làm việc phát triển tính năng, Developer bắt buộc phải thực thi đúng chuỗi 5 bước dưới đây:

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ STEP 1:          │ ──> │ STEP 2:          │ ──> │ STEP 3:          │
│ Ground Context   │     │ Frame Prompt /   │     │ Code Scrutiny    │
│ (Attach Docs)    │     │ Execute Command  │     │ (Check 5 Flaws)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                         ┌──────────────────┐              ▼
                         │ STEP 5:          │ <── ┌──────────────────┐
                         │ Commit & PR      │     │ STEP 4:          │
                         │ (Conventional)   │     │ Local Quality    │
                         └──────────────────┘     │ Gates (DoD)      │
                                                  └──────────────────┘
```

### Bước 1: Ground Context (Nạp đính kèm Tài liệu Bắt buộc)
* **Quy tắc đính kèm:** Khi tương tác với AI Agent, Developer **bắt buộc phải tag/đính kèm ít nhất 3 file**:
  1. **01 File Quick Rule** phù hợp trong `docs/` (`backend-rules.md`, `frontend-rules.md`, `database-rules.md`, hoặc `rbac-rules.md`).
  2. **01 File Master Spec** liên quan trong `docs/system-specs/` (`02_postgresql-16-ddl-schema-v12.md` hoặc `03_api-endpoints-specification-v11.md`).
  3. **01 File Module Spec** trực tiếp trong `docs/modules/` (ví dụ: `MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md`).

### Bước 2: Frame Prompt / Execute Command (Cú pháp Ra lệnh Chuẩn)
* Developer sử dụng các câu lệnh đã được chuẩn hóa để ra lệnh cho Agent:
  * `/plan <mô_tả_yêu_cầu>`: Yêu cầu Agent phân tích spec, liệt kê bảng/endpoint/nguy cơ N+1 query và dừng lại chờ duyệt.
  * `/exec-module <đường_dẫn_file_spec>`: Yêu cầu Agent triển khai tự động toàn bộ module từ CSDL đến Frontend.
  * `/audit <đường_dẫn_file_code>`: Yêu cầu Agent quét mã nguồn và kiểm định theo 4 Trụ cột DoD.

### Bước 3: Code Scrutiny (Rà soát Checklist 5 Điểm Chết)
Ngay khi Agent hoàn thành việc sinh code, Developer phải tự đóng vai Code Auditor soi kỹ **5 điểm chết thường gặp**:
1. **Lỗ hổng Phân quyền (Missing Guards/Decorators):** Controller có quên gắn `@UseGuards(JwtAuthGuard, RolesGuard)` hoặc `@Roles(...)` không?
2. **Rò rỉ Kiểu `any` (Type Safety Leak):** Code có chứa từ khóa `any`, `as any` hay tham số `manager: any` không?
3. **Lỗi Truy vấn CSDL trong Vòng lặp (N+1 Query Loop):** Code có gọi `await repo.find()` hay `await query()` bên trong vòng lặp `for`/`map` không? (Nếu có -> Ép chuyển sang Batch Insert `values(...).execute()`).
4. **Thiếu CSDL Transaction:** Thao tác ghi/sửa dữ liệu trên 2 bảng CSDL trở lên có bị quên bọc trong `this.dataSource.transaction(...)` không?
5. **Sai Cấu trúc Response Envelope:** Phản hồi API có tuân thủ đúng định dạng bọc `{ statusCode, success, message, data, meta, timestamp }` không?

### Bước 4: Local Quality Gates (Chạy Lệnh Kiểm thử Cục bộ)
Trước khi commit, Developer bắt buộc chạy bộ lệnh kiểm định tại terminal máy cá nhân:
```bash
# 1. Kiểm tra Biên dịch TypeScript Strict Mode (Pass 0 Error)
npx tsc --noEmit

# 2. Kiểm tra ESLint & Format Code
npm run lint && npx prettier --check .

# 3. Chạy Unit Tests cho Core Logic
npm run test

# 4. Kiểm tra API Contract trên Postman / Curl
# Đảm bảo test đủ các mã HTTP: 200/201 (Success), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found).
```

### Bước 5: Commit & Pull Request (Tạo Commit & PR theo Chuẩn)
* Đặt tên Commit Message theo chuẩn **Conventional Commits**:
  * `feat(sm2): implement boundary clamping for ease factor minimum 1.30`
  * `fix(submissions): correct class_id join to eliminate Cartesian product duplicates`
* Mở Pull Request kèm bảng **Checklist Nghiệm thu Definition of Done (DoD)** đã tick chọn đầy đủ 4 Trụ cột.

---

## 4. MA TRẬN LIÊN KẾT TÀI LIỆU BẮT BUỘC (DOCUMENT LINKING MATRIX)

Developer bắt buộc phải tham chiếu và đính kèm đúng bộ tài liệu theo ma trận dưới đây cho từng phân hệ nghiệp vụ:

| Phân hệ Nghiệp vụ (Domain Use-case) | File Quick Rule (Tầng 1 - Tag cho AI) | File Master Spec (Tầng 2 - Tham chiếu Master) | File Module Spec (Tầng 2 - Tham chiếu Chi tiết) |
| :--- | :--- | :--- | :--- |
| **Auth, User & RBAC Phân quyền** | `docs/rbac-rules.md`<br>`docs/backend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md`<br>`docs/system-specs/08_rbac-permission-matrix.md` | `docs/modules/MOD_ADM_ADMIN_TEACHING/ADM_01_user_management.md`<br>`docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md` |
| **Flashcard SM-2 & Sổ tay STARRED** | `docs/database-rules.md`<br>`docs/frontend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md`<br>`docs/system-specs/01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` | `docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md`<br>`docs/modules/MOD_STU_SELF_LEARNING/STU_02_personal_notebook_starred.md` |
| **Lý thuyết Ngữ pháp GFM & Quiz** | `docs/database-rules.md`<br>`docs/backend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md` | `docs/modules/MOD_STU_SELF_LEARNING/STU_03_grammar_gfm_theory.md`<br>`docs/modules/MOD_STU_SELF_LEARNING/STU_04_reinforcement_quiz.md` |
| **Streak Engine & Skill Radar 6D** | `docs/database-rules.md`<br>`docs/backend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md` | `docs/modules/MOD_STU_SELF_LEARNING/STU_05_streak_engine.md`<br>`docs/modules/MOD_STU_SELF_LEARNING/STU_06_skill_radar_6d.md` |
| **Động cơ Thi thử TOEIC 200 câu** | `docs/architecture.md`<br>`docs/backend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md`<br>`docs/system-specs/04_Thiet_Ke_Backend_Application_Layer_NestJS.md` | `docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md`<br>`docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_02_redis_draft_answer_sync.md`<br>`docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_03_ets_scoring_conversion_10_990.md` |
| **Giao bài tập & Deadline Độc lập** | `docs/database-rules.md`<br>`docs/rbac-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md` | `docs/modules/MOD_ADM_ADMIN_TEACHING/ADM_02_class_management.md`<br>`docs/modules/MOD_TSK_ASSIGNMENTS/TSK_01_assignment_creation_dispatch.md` |
| **Nộp bài & Studio Chấm điểm Rubric** | `docs/architecture.md`<br>`docs/frontend-rules.md` | `docs/system-specs/02_postgresql-16-ddl-schema-v12.md`<br>`docs/system-specs/03_api-endpoints-specification-v11.md`<br>`docs/system-specs/07_react-native-frontend-integration-guide.md` | `docs/modules/MOD_TSK_ASSIGNMENTS/TSK_02_student_submission_flow.md`<br>`docs/modules/MOD_TSK_ASSIGNMENTS/TSK_03_speaking_writing_media_s3.md`<br>`docs/modules/MOD_TSK_ASSIGNMENTS/TSK_04_rubric_grading_studio.md` |

---

## 5. BỘ LỆNH VÀ CÚ PHÁP MẪU DÀNH CHO DEVELOPER (READY-TO-USE PROMPTS)

Developer có thể copy-paste trực tiếp các mẫu Prompt thực chiến dưới đây khi giao việc cho Agent:

### 5.1. Mẫu Prompt 1: Thực thi Lệnh `/init-base` (Setup Khung Base Dự án)
```text
/init-base
Tôi muốn khởi tạo khung hạ tầng Base cho dự án.
Context nạp vào:
- docs/backend-rules.md
- docs/frontend-rules.md
- docs/rbac-rules.md
- CODING_CONVENTIONS.md

Yêu cầu: Hãy xuất bản đầy đủ mã nguồn cho TransformResponseInterceptor, AllExceptionsFilter, JwtAuthGuard, RolesGuard, Custom Decorator @Roles(), Axios Client Instance với 401 Silent Refresh Token Rotation và TanStack Query Provider.
```

### 5.2. Mẫu Prompt 2: Thực thi Lệnh `/plan` (Phân tích Spec & Đánh giá Rủi ro)
```text
/plan
Tôi chuẩn bị phát triển Phân hệ Động cơ Thi thử TOEIC 200 câu.
Context nạp vào:
- docs/architecture.md
- docs/system-specs/02_postgresql-16-ddl-schema-v12.md
- docs/system-specs/03_api-endpoints-specification-v11.md
- docs/modules/MOD_EXM_TOEIC_ENGINE/EXM_01_toeic_session_lifecycle.md

Yêu cầu: Hãy phân tích tệp spec, liệt kê chính xác các Bảng CSDL và API Endpoints sẽ đụng đến, đánh giá rủi ro lỗi N+1 Query và luồng lưu nháp đáp án qua Redis Hash. Dừng lại chờ tôi phê duyệt Kế hoạch Triển khai trước khi viết code.
```

### 5.3. Mẫu Prompt 3: Thực thi Lệnh `/exec-module` (Triển khai Full-stack Module)
```text
/exec-module docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md
Context nạp vào:
- docs/database-rules.md
- docs/backend-rules.md
- docs/system-specs/02_postgresql-16-ddl-schema-v12.md
- docs/system-specs/03_api-endpoints-specification-v11.md
- docs/modules/MOD_STU_SELF_LEARNING/STU_01_flashcard_sm2_engine.md

Yêu cầu: Hãy thực thi tuần tự 6 bước từ DTOs, Service thuật toán SM-2 bọc CSDL Transaction, Controller đính kèm RBAC Guards, Custom Hooks TanStack Query v5 và Reanimated 3D Flashcard Component. Đảm bảo 0 any và không có placeholder.
```

### 5.4. Mẫu Prompt 4: Thực thi Lệnh `/audit` (Rà soát Mã nguồn theo DoD)
```text
/audit src/modules/submissions/services/grading.service.ts
Context nạp vào:
- DEFINITION_OF_DONE.md
- CODING_CONVENTIONS.md
- SECURITY_RULES.md

Yêu cầu: Hãy kiểm tra file grading.service.ts theo 4 Trụ cột nghiệm thu trong DEFINITION_OF_DONE.md. Quét kỹ lỗi leak any, N+1 query, thiếu Transaction đa bảng và Response Envelope. Xuất bảng Báo cáo Audit chi tiết kèm mã code đã refactor sửa lỗi.
```
