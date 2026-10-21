# CODING_CONVENTIONS.md — Quy chuẩn Lập trình & Tiêu chuẩn Mã nguồn Dự án
## Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến

---

## 1. NGUYÊN TẮC THIẾT KẾ & PHÁT TRIỂN CỐT LÕI

Mọi đoạn mã được viết trong dự án (Backend NestJS, Mobile App React Native, Admin Web Next.js 14) đều phải tuân thủ nghiêm ngặt các nguyên lý kỹ thuật sau:

### 1.1. Nguyên lý SOLID
1. **Single Responsibility Principle (SRP):**
   * Mỗi Controller chỉ điều phối HTTP Request/Response.
   * Mỗi Service chỉ chịu trách nhiệm xử lý logic thuộc 1 Domain duy nhất (VD: `FlashcardsService` chỉ xử lý logic thuật toán SM-2 và bộ thẻ, không thao tác trực tiếp tới kết quả thi TOEIC).
   * Mỗi React Component chỉ đảm nhận 1 nhiệm vụ hiển thị giao diện.
2. **Open/Closed Principle (OCP):**
   * Mở rộng tính năng bằng Strategy Pattern hoặc kế thừa/Interface, không sửa đổi trực tiếp hàm nghiệp vụ cốt lõi đã hoạt động ổn định.
3. **Liskov Substitution Principle (LSP):**
   * Các Sub-class hoặc Custom Exception Filters phải đảm bảo thay thế hoàn toàn cho Base-class mà không vỡ luồng xử lý toàn cục.
4. **Interface Segregation Principle (ISP):**
   * Không ép buộc Component hoặc Service phụ thuộc vào Interface chứa các thuộc tính/phương thức không dùng đến. Tách nhỏ DTOs và Interfaces theo từng Use-case.
5. **Dependency Inversion Principle (DIP):**
   * Tầng Controller và Service luôn phụ thuộc vào Abstractions (Interface / NestJS Providers), không tự khởi tạo đối tượng trực tiếp qua từ khóa `new`.

### 1.2. KISS (Keep It Simple, Stupid) & DRY (Don't Repeat Yourself)
* Ưu tiên mã nguồn rõ ràng, tự giải thích (Self-documenting) hơn là các mẹo viết code ngắn gây khó đọc.
* Trích xuất các logic trùng lặp (Tính toán SM-2, xin S3 Presigned URL, Formatters, Axios Interceptors) thành các Helper Services / Custom Hooks độc lập.

### 1.3. Strict Null & Type Safety (`strict: true`)
* Tuyệt đối bật `"strict": true` trong `tsconfig.json`.
* **Cấm tuyệt đối từ khóa `any`**: 100% biến, tham số hàm, thuộc tính Class, DTOs và API Responses phải được khai báo kiểu dữ liệu tường minh (sử dụng Interface, Type, Generics hoặc `unknown` kết hợp Type Guard).

---

## 2. BẢNG QUY CHUẨN ĐẶT TÊN (NAMING CONVENTIONS)

| Phạm vi / Đối tượng | Phong cách (Casing) | Quy tắc đặt tên | Ví dụ chuẩn trong Dự án | Ví dụ KHÔNG chuẩn |
| :--- | :--- | :--- | :--- | :--- |
| **Biến & Thuộc tính TS** | `camelCase` | Danh từ / Cụm danh từ | `studentId`, `targetScore`, `inlineFeedback` | `student_id`, `TargetScore` |
| **Biến Boolean TS** | `camelCase` | Tiền tố bắt buộc: `is`, `has`, `can`, `should` | `isCompleted`, `hasAudio`, `canSubmit` | `completed`, `checkSubmit` |
| **Hàm & Phương thức** | `camelCase` | Bắt đầu bằng Động từ | `calculateNextSchedule()`, `processReview()` | `nextSchedule()`, `User()` |
| **Class, Interface, Type** | `PascalCase` | Danh từ, mô tả đối tượng | `SubmissionReviewEntity`, `SubmitReviewDto` | `submissionReview`, `submit_dto` |
| **Hằng số & Enum Values** | `UPPER_SNAKE_CASE` | Viết hoa toàn bộ | `MAX_STUDY_TIME`, `DEFAULT_EASE_FACTOR` | `maxStudyTime`, `default_ef` |
| **File NestJS Backend** | `kebab-case.type.ts` | Tiền tố mô tả + loại tệp | `grading.service.ts`, `submit-review.dto.ts` | `GradingService.ts`, `submit_review.ts` |
| **Component React/RN** | `PascalCase.tsx` | Khớp tên Component | `Flashcard3D.tsx`, `SpeakingGradingStudio.tsx` | `flashcard3d.tsx`, `speaking-studio.tsx` |
| **Custom Hooks** | `camelCase` | Bắt đầu bằng tiền tố `use` | `useSM2Scheduler.ts`, `useToeicTimer.ts` | `sm2Scheduler.ts`, `UseTimer.ts` |
| **Zustand Store** | `camelCase` | Dạng `use...Store` | `useExamStore.ts`, `useFlashcardSessionStore.ts` | `examStore.ts`, `useExam.ts` |
| **Route Page Next.js 14** | `kebab-case/page.tsx` | Thư mục định tuyến App Router | `(dashboard)/submissions/[id]/page.tsx` | `submissions_detail/page.tsx` |
| **Bảng Cơ sở Dữ liệu** | `snake_case` | Danh từ số nhiều | `user_flashcard_progress`, `submission_reviews` | `userFlashcardProgress`, `SubmissionReview` |
| **Cột CSDL PostgreSQL** | `snake_case` | Danh từ / Tiền tố `is_`, `has_` | `due_date`, `is_completed`, `created_at` | `dueDate`, `isCompleted` |
| **Khóa chính & Khóa ngoại** | `snake_case` | PK: `id` (UUID); FK: `{tên_bảng_số_ít}_id` | `student_id`, `class_id`, `assignment_id` | `studentId`, `id_class` |
| **Chỉ mục CSDL (Index)** | `snake_case` | `idx_{bảng}_{cột}` / `uq_{bảng}_{cột}` | `idx_user_flashcard_due`, `uq_class_student` | `index1`, `uniqueClassStudent` |

---

## 3. QUY CHUẨN GIT COMMIT MESSAGE (CONVENTIONAL COMMITS)

Mọi thông điệp Git Commit đẩy lên Repository bắt buộc phải tuân theo cấu trúc:

```text
<type>(<scope>): <mô tả ngắn bằng tiếng Anh>

[Nội dung mô tả chi tiết nếu có]
```

### 3.1. Danh mục Types Bắt buộc
* `feat`: Thêm tính năng mới cho ứng dụng.
* `fix`: Sửa lỗi (Bug Fix).
* `refactor`: Tái cấu trúc mã nguồn nhưng không làm thay đổi tính năng hay sửa bug.
* `perf`: Tối ưu hóa hiệu năng truy vấn SQL, giảm Re-render UI hoặc tăng tốc độ nạp.
* `docs`: Cập nhật tài liệu kỹ thuật, Swagger API Spec, README.
* `test`: Thêm mới hoặc bổ sung Unit Test, E2E Test.
* `chore`: Cập nhật Dependencies, file cấu hình CI/CD, kịch bản Migration CSDL.

### 3.2. Ví dụ Commit Thực tế trong Dự án
* `feat(sm2): implement boundary clamping for ease factor minimum 1.30`
* `feat(grading): add split-screen text annotation toolbar for writing submission`
* `fix(submissions): correct class_id join to eliminate Cartesian product duplicates`
* `fix(toeic): handle null options for part 1 image and part 2 audio questions`
* `refactor(analytics): centralize streak recording via StreakEngineService`
* `perf(toeic): optimize real-time answer sync to redis hash under 5ms`
* `docs(api): update v11 specification for assignment questions endpoint`
* `chore(database): add migration script for student_academic_alerts table v12.0`
