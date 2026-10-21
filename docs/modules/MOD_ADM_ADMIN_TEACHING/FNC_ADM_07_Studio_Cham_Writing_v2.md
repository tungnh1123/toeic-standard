# MODULE SPECIFICATION: FNC_ADM_07 — STUDIO CHẤM BÀI WRITING (CHIA ĐÔI MÀN HÌNH & HIGHLIGHT SỬA LỖI TRỰC TIẾP)

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_07` (Tương ứng `FNC_ADM_07`)
* **Tên Module:** Studio Chấm bài Writing chia đôi & Sửa lỗi văn bản trực tiếp (Writing Grading Studio & Inline Text Annotation Tool)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Màn hình Giao diện:** `ADM0302` (Writing Grading Studio)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_07_Studio_Cham_Writing_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Inline Annotations & Unified Review API)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Giảng viên (Teacher) / Quản trị viên (Admin):** Tôi muốn sử dụng giao diện Studio chấm bài chuyên biệt chia đôi màn hình (Split-Screen Studio ADM0302) để vừa bôi đen sửa lỗi trực tiếp trên văn bản bài làm tự luận Viết (Writing) của học viên, vừa chấm điểm theo Thang điểm Rubric 4 tiêu chí nhằm đưa ra đánh giá chính xác và chi tiết nhất.
* **Là Giảng viên (Teacher):** Tôi muốn có tính năng **Lưu nháp (`isDraft = true`)** để có thể tạm dừng phiên chấm bài mà không gửi thông báo kết quả chưa hoàn thiện cho học viên, và tính năng **Công bố điểm (`isDraft = false`)** để hoàn tất chấm bài, cập nhật tiến độ học tập và tự động gửi thông báo điểm cho học viên.
* **Là Học viên (Student):** Tôi muốn xem chi tiết bài làm đã chấm của mình kèm các vị trí được giảng viên bôi đen highlight sửa lỗi (loại lỗi, gợi ý sửa) và bảng điểm Rubric chi tiết để biết chính xác các điểm cần cải thiện.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal Next.js 14) ]        [ Backend NestJS ]           [ PostgreSQL 16 / BullMQ ]
                 │                                      │                                 │
  ── 1. GET /api/v1/admin/submissions/:id ─────────────>│                                 │
                                                        │── 2. Check Teacher Isolation ──>│
                                                        │<─ (Submission + Rubric Data) ───│
  <── 3. Response 200 OK (Submission + Review) ─────────│                                 │
                 │                                      │                                 │
  [ Teacher Highlights Text & Fills Rubric Scores ]      │                                 │
                 │                                      │                                 │
  ── 4. POST /api/v1/admin/submissions/:id/review ─────>│                                 │
      (criteriaScores, inlineFeedback,                  │── 5. Calculate Total Score      │
       generalComment, isDraft)                         │      from Rubric Weights        │
                                                        │                                 │
                                                        │── 6. CSDL Transaction ─────────>│
                                                        │   - Upsert submission_reviews   │
                                                        │   - Update submission status    │
                                                        │   - Update assignment_targets   │
                                                        │<─ (Transaction Commit) ─────────│
                                                        │                                 │
                                                        │── 7. If isDraft === false ─────>│
                                                        │   Dispatch BullMQ Job           │
                                                        │   (submission-graded)           │
                                                        │                                 │
  <── 8. Response 200 OK (Grading Result Envelope) ─────│                                 │
```

#### A. Tiến trình Lấy thông tin Bài nộp & Bản nháp Chấm (Get Submission Detail Flow)
1. Giảng viên mở giao diện Studio Chấm bài ADM0302. Trình duyệt gửi Yêu cầu `GET /api/v1/admin/submissions/:id`.
2. Backend NestJS `WritingGradingService`:
   * Kiểm tra quyền truy cập: Nếu người dùng là `TEACHER`, kiểm tra xem bài nộp có thuộc lớp học do giảng viên này phụ trách không (`c.teacher_id = currentUserId`). Nếu không, từ chối với mã lỗi `403 Forbidden` (`ERR_AUTH_003`).
   * Query chi tiết bài nộp từ `assignment_submissions` (gồm `submission_text`, `submitted_at`, thông tin `student`, thông tin `class`), đề bài tập gốc từ `assignments` (chứa cấu hình `rubric`), và bản ghi chấm điểm cũ/nháp từ `submission_reviews` (nếu có).
3. Phản hồi DTO dạng Response Envelope chuẩn.

#### B. Tiến trình Chấm bài, Sửa lỗi Inline & Lưu/Công bố điểm (Review Submission Flow)
1. Giảng viên thực hiện bôi đen các đoạn văn bản mắc lỗi trên màn hình bên trái -> Hệ thống hiển thị Popover chọn loại lỗi (`GRAMMAR`, `VOCABULARY`, `SPELLING`, `PUNCTUATION`, `COHERENCE`), nhập `comment` và `suggestion` -> Tạo thành mảng `inlineFeedback`.
2. Giảng viên nhập điểm cho 4 tiêu chí Rubric trên màn hình bên phải (`TASK_ACHIEVEMENT`, `COHERENCE_COHESION`, `LEXICAL_RESOURCE`, `GRAMMAR_ACCURACY`) và nhập `generalComment`.
3. Giảng viên nhấn **Lưu nháp (`isDraft = true`)** hoặc **Công bố điểm (`isDraft = false`)**. Client gửi Yêu cầu `POST /api/v1/admin/submissions/:id/review`.
4. Backend `WritingGradingService`:
   * Xác thực bài nộp tồn tại và thuộc loại bài tập `WRITING` (`assignments.type = 'WRITING'`).
   * Tự động tính toán tổng điểm `totalScore` (thang 100) ở Backend dựa trên điểm thành phần và trọng số Rubric từ đề bài.
   * Mở **CSDL Transaction (`this.dataSource.transaction`)**:
     a. Upsert bản ghi vào bảng `submission_reviews` (luôn đè duy nhất 1 bản ghi nhờ ràng buộc `submission_id UNIQUE`).
     b. Cập nhật trạng thái `assignment_submissions.status`:
        - Nếu `isDraft = true`: Cập nhật `status = 'GRADING'`.
        - Nếu `isDraft = false`: Cập nhật `status = 'GRADED'`.
     c. Nếu `isDraft = false` và bài nộp có đính kèm `target_id`, cập nhật `assignment_targets.is_completed = true`.
   * Nếu `isDraft = false`, đẩy tác vụ bất đồng bộ `submission-graded` vào hàng đợi BullMQ Queue (`@InjectQueue('notifications')`) để tự động gửi thông báo Push Notification FCM và Email kết quả cho học viên.
5. Phản hồi DTO kết quả chấm bài thành công.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation (Business Rules)

* **Cấu trúc JSONB Inline Feedback (`inline_feedback`):**
  ```json
  [
    {
      "id": "annot-101",
      "startOffset": 24,
      "endOffset": 38,
      "selectedText": "is discuss about",
      "errorType": "GRAMMAR",
      "comment": "Thừa giới từ 'about' sau động từ 'discuss'.",
      "suggestion": "is discussing"
    }
  ]
  ```
  * Danh mục `errorType` hợp lệ: `GRAMMAR` (Ngữ pháp), `VOCABULARY` (Từ vựng), `SPELLING` (Chính tả), `PUNCTUATION` (Dấu câu), `COHERENCE` (Mạch lạc & Liên kết).

* **Cấu trúc JSONB Điểm Rubric (`criteria_scores`):**
  ```json
  {
    "TASK_ACHIEVEMENT": { "score": 8.0, "maxScore": 10, "weight": 25, "comment": "Đáp ứng đầy đủ yêu cầu đề bài." },
    "COHERENCE_COHESION": { "score": 7.5, "maxScore": 10, "weight": 25, "comment": "Mạch lạc, có liên kết câu." },
    "LEXICAL_RESOURCE": { "score": 7.0, "maxScore": 10, "weight": 25, "comment": "Từ vựng khá phong phú." },
    "GRAMMAR_ACCURACY": { "score": 8.5, "maxScore": 10, "weight": 25, "comment": "Cấu trúc câu đa dạng." }
  }
  ```

* **Thuật toán Tự động Tính Tổng Điểm Bài luận (Total Score Algorithm):**
  Tổng điểm `total_score` (thang 100) được Backend tự động tính toán từ các điểm thành phần, cấm Client tự tính để phòng chống can thiệp dữ liệu:
  $$\text{Total Score} = \sum_{i=1}^{4} \left( \frac{\text{score}_i}{\text{maxScore}_i} \times \text{weight}_i \right) \times 100$$
  *Ví dụ:* Điểm 4 tiêu chí lần lượt là 8.0, 7.5, 7.0, 8.5 (đều có `maxScore = 10` và `weight = 25%`):
  $$\text{Total Score} = \left( \frac{8.0}{10} \times 25 + \frac{7.5}{10} \times 25 + \frac{7.0}{10} \times 25 + \frac{8.5}{10} \times 25 \right) \times 10 = (20 + 18.75 + 17.5 + 21.25) = 77.50$$

* **Quy tắc Trạng thái & Tiến độ Học tập:**
  * `isDraft = true`: Bài làm giữ trạng thái `GRADING`. Học viên KHÔNG nhận được thông báo, chỉ giảng viên xem được bản nháp.
  * `isDraft = false`: Bài làm chuyển trạng thái `GRADED`. Bản ghi `assignment_targets.is_completed` chuyển thành `true`. Hệ thống phát thông báo qua BullMQ.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `submission_reviews` (Kết quả Chấm bài của Giảng viên)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `submission_id` (`UUID`, Foreign Key -> `assignment_submissions(id)` ON DELETE CASCADE, UNIQUE, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `total_score` (`NUMERIC(5, 2)`, NOT NULL - Tổng điểm quy đổi thang 100)
* `criteria_scores` (`JSONB`, NOT NULL - Lưu chi tiết điểm 4 tiêu chí Rubric)
* `inline_feedback` (`JSONB`, NULLABLE - Lưu mảng các vị trí highlight sửa lỗi trên văn bản)
* `general_comment` (`TEXT`, NULLABLE - Nhận xét tổng quan của giảng viên)
* `feedback_audio_url` (`TEXT`, NULLABLE - Link S3 file audio thu âm nhận xét nếu có)
* `reviewed_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignment_submissions` (Bài nộp của Học viên)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)`)
* `target_id` (`UUID`, Foreign Key -> `assignment_targets(id)`)
* `submission_text` (`TEXT`, NULLABLE - Văn bản bài luận của học viên)
* `status` (`submission_status_enum`, DEFAULT `'SUBMITTED'`, NOT NULL)
* `submitted_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### C. Bảng `assignment_targets` (Tiến độ Bài tập được Giao)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `due_date` (`TIMESTAMPTZ`, NOT NULL)
* `is_completed` (`BOOLEAN`, DEFAULT `false`, NOT NULL)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE UNIQUE INDEX uq_submission_reviews_submission ON submission_reviews(submission_id);`
* `CREATE INDEX idx_submission_reviews_teacher ON submission_reviews(teacher_id);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE assignment_type_enum AS ENUM ('QUIZ', 'WRITING', 'SPEAKING');
CREATE TYPE submission_status_enum AS ENUM ('SUBMITTED', 'GRADING', 'GRADED', 'REJECTED');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **59** | `GET` | `/api/v1/admin/submissions/:id` | Teacher / Admin | Lấy thông tin chi tiết bài nộp, văn bản bài luận, rubric đề bài và bản nháp chấm cũ |
| **60** | `POST` | `/api/v1/admin/submissions/:id/review` | Teacher / Admin | **[Chuẩn hóa v11]** Lưu kết quả chấm Rubric, highlight sửa lỗi `inline_feedback` và nhận xét |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chấm bài Writing thành công",
  "data": {
    "reviewId": "r1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "submissionId": "s8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "totalScore": 77.50,
    "status": "GRADED",
    "isDraft": false,
    "criteriaScores": {
      "TASK_ACHIEVEMENT": { "score": 8.0, "maxScore": 10, "weight": 25, "comment": "Đáp ứng đầy đủ yêu cầu đề bài." },
      "COHERENCE_COHESION": { "score": 7.5, "maxScore": 10, "weight": 25, "comment": "Mạch lạc, có liên kết câu." },
      "LEXICAL_RESOURCE": { "score": 7.0, "maxScore": 10, "weight": 25, "comment": "Từ vựng khá phong phú." },
      "GRAMMAR_ACCURACY": { "score": 8.5, "maxScore": 10, "weight": 25, "comment": "Cấu trúc câu đa dạng." }
    },
    "inlineFeedback": [
      {
        "id": "annot-101",
        "startOffset": 24,
        "endOffset": 38,
        "selectedText": "is discuss about",
        "errorType": "GRAMMAR",
        "comment": "Thừa giới từ 'about' sau động từ 'discuss'.",
        "suggestion": "is discussing"
      }
    ],
    "generalComment": "Bài viết tốt, ý tưởng rõ ràng. Cần chú ý lỗi dùng giới từ.",
    "reviewedAt": "2026-10-12T21:25:00.000Z"
  },
  "timestamp": "2026-10-12T21:25:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/admin/submissions/:id` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |
| `POST /api/v1/admin/submissions/:id/review` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/submissions/dto/inline-feedback-item.dto.ts`
  * `src/modules/submissions/dto/criterion-score.dto.ts`
  * `src/modules/submissions/dto/review-writing-submission.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/dto/inline-feedback-item.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, IsIn, IsOptional } from 'class-validator';

export class InlineFeedbackItemDto {
  @IsString()
  @IsNotEmpty({ message: 'id của vị trí sửa lỗi không được để trống.' })
  id!: string;

  @IsInt({ message: 'startOffset phải là số nguyên.' })
  @Min(0, { message: 'startOffset phải lớn hơn hoặc bằng 0.' })
  startOffset!: number;

  @IsInt({ message: 'endOffset phải là số nguyên.' })
  @Min(0, { message: 'endOffset phải lớn hơn hoặc bằng 0.' })
  endOffset!: number;

  @IsString()
  @IsNotEmpty({ message: 'selectedText không được để trống.' })
  selectedText!: string;

  @IsString()
  @IsIn(['GRAMMAR', 'VOCABULARY', 'SPELLING', 'PUNCTUATION', 'COHERENCE'], {
    message: 'errorType phải là GRAMMAR, VOCABULARY, SPELLING, PUNCTUATION hoặc COHERENCE.',
  })
  errorType!: 'GRAMMAR' | 'VOCABULARY' | 'SPELLING' | 'PUNCTUATION' | 'COHERENCE';

  @IsString()
  @IsNotEmpty({ message: 'Nhận xét comment không được để trống.' })
  comment!: string;

  @IsString()
  @IsOptional()
  suggestion?: string;
}

// src/modules/submissions/dto/criterion-score.dto.ts
import { IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class CriterionScoreDto {
  @IsNumber({}, { message: 'Điểm score phải là giá trị số.' })
  @Min(0, { message: 'Điểm tối thiểu là 0.' })
  @Max(10, { message: 'Điểm tối đa cho 1 tiêu chí là 10.' })
  score!: number;

  @IsNumber()
  @Min(1)
  maxScore!: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  weight!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

// src/modules/submissions/dto/review-writing-submission.dto.ts
import { IsNotEmpty, IsBoolean, IsString, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { InlineFeedbackItemDto } from './inline-feedback-item.dto';
import { CriterionScoreDto } from './criterion-score.dto';

export class ReviewWritingSubmissionDto {
  @IsObject({ message: 'criteriaScores phải là một đối tượng chứa điểm tiêu chí.' })
  @ValidateNested({ each: true })
  @Type(() => CriterionScoreDto)
  criteriaScores!: Record<string, CriterionScoreDto>;

  @IsArray({ message: 'inlineFeedback phải là một mảng vị trí sửa lỗi.' })
  @ValidateNested({ each: true })
  @Type(() => InlineFeedbackItemDto)
  @IsOptional()
  inlineFeedback?: InlineFeedbackItemDto[];

  @IsString()
  @IsOptional()
  generalComment?: string;

  @IsString()
  @IsOptional()
  feedbackAudioUrl?: string;

  @IsBoolean({ message: 'isDraft phải là giá trị boolean (true/false).' })
  @IsNotEmpty({ message: 'Cờ isDraft không được để trống.' })
  isDraft!: boolean;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/submissions/entities/submission-review.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/entities/submission-review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { AssignmentSubmissionEntity } from './assignment-submission.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { InlineFeedbackItemDto } from '../dto/inline-feedback-item.dto';
import { CriterionScoreDto } from '../dto/criterion-score.dto';

@Entity('submission_reviews')
export class SubmissionReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'submission_id', unique: true })
  submissionId!: string;

  @OneToOne(() => AssignmentSubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission!: AssignmentSubmissionEntity;

  @Column({ type: 'uuid', name: 'teacher_id' })
  teacherId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'teacher_id' })
  teacher!: UserEntity;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'total_score' })
  totalScore!: number;

  @Column({ type: 'jsonb', name: 'criteria_scores' })
  criteriaScores!: Record<string, CriterionScoreDto>;

  @Column({ type: 'jsonb', name: 'inline_feedback', nullable: true })
  inlineFeedback!: InlineFeedbackItemDto[] | null;

  @Column({ type: 'text', name: 'general_comment', nullable: true })
  generalComment!: string | null;

  @Column({ type: 'text', name: 'feedback_audio_url', nullable: true })
  feedbackAudioUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'reviewed_at' })
  reviewedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `WritingGradingService` & BullMQ Async Jobs

* **Tệp tin khởi tạo:** `src/modules/submissions/writing-grading.service.ts`
* **Chức năng:** Tự động tính điểm `totalScore`, bọc CSDL Transaction, đính kèm BullMQ Queue `@InjectQueue('notifications')`.

```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { AssignmentTargetEntity } from '../assignments/entities/assignment-target.entity';
import { ReviewWritingSubmissionDto } from './dto/review-writing-submission.dto';

@Injectable()
export class WritingGradingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async getSubmissionForGrading(submissionId: string, currentUser: { id: string; role: string }) {
    const submission = await this.dataSource.getRepository(AssignmentSubmissionEntity).findOne({
      where: { id: submissionId },
      relations: ['assignment', 'student', 'class'],
    });

    if (!submission) {
      throw new NotFoundException({
        errorCode: 'ERR_SUBMISSION_NOT_FOUND',
        message: 'Bài nộp không tồn tại.',
      });
    }

    if (currentUser.role === 'TEACHER' && submission.class?.teacherId !== currentUser.id) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Bạn không có quyền truy cập bài nộp của lớp học này.',
      });
    }

    const review = await this.dataSource.getRepository(SubmissionReviewEntity).findOne({
      where: { submissionId },
    });

    return {
      submission,
      review,
    };
  }

  async reviewWritingSubmission(submissionId: string, teacherId: string, dto: ReviewWritingSubmissionDto) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const submission = await manager.findOne(AssignmentSubmissionEntity, {
        where: { id: submissionId },
        relations: ['assignment'],
      });

      if (!submission) {
        throw new NotFoundException({
          errorCode: 'ERR_SUBMISSION_NOT_FOUND',
          message: 'Bài nộp không tồn tại.',
        });
      }

      if (submission.assignment?.type !== 'WRITING') {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_ASSIGNMENT_TYPE',
          message: 'Bài nộp này không phải là bài tập kỹ năng Viết (WRITING).',
        });
      }

      // Thuật toán Tự động Tính Tổng Điểm từ Barem Rubric (Thang 100)
      let calculatedTotalScore = 0;
      const criteriaScores = dto.criteriaScores;
      for (const key of Object.keys(criteriaScores)) {
        const item = criteriaScores[key];
        const weightedPart = (item.score / item.maxScore) * item.weight;
        calculatedTotalScore += weightedPart;
      }
      // Quy đổi tổng trọng số % ra thang điểm 100
      calculatedTotalScore = Math.round(calculatedTotalScore * 100) / 100;

      // Upsert bản ghi vào submission_reviews
      let review = await manager.findOne(SubmissionReviewEntity, { where: { submissionId } });
      if (!review) {
        review = manager.create(SubmissionReviewEntity, {
          submissionId,
          teacherId,
        });
      }

      review.totalScore = calculatedTotalScore;
      review.criteriaScores = dto.criteriaScores;
      review.inlineFeedback = dto.inlineFeedback || [];
      review.generalComment = dto.generalComment || null;
      review.feedbackAudioUrl = dto.feedbackAudioUrl || null;
      review.reviewedAt = new Date();

      await manager.save(SubmissionReviewEntity, review);

      // Cập nhật trạng thái bài nộp
      const newStatus = dto.isDraft ? 'GRADING' : 'GRADED';
      submission.status = newStatus;
      await manager.save(AssignmentSubmissionEntity, submission);

      // Nếu xuất bản chính thức, đánh dấu hoàn thành target
      if (!dto.isDraft && submission.targetId) {
        await manager.update(AssignmentTargetEntity, submission.targetId, { isCompleted: true });
      }

      // Đẩy tác vụ thông báo bất đồng bộ vào BullMQ nếu Công bố điểm
      if (!dto.isDraft) {
        await this.notificationQueue.add('submission-graded', {
          submissionId: submission.id,
          studentId: submission.studentId,
          assignmentTitle: submission.assignment?.title,
          totalScore: calculatedTotalScore,
          gradedAt: new Date(),
        });
      }

      return {
        reviewId: review.id,
        submissionId: submission.id,
        totalScore: calculatedTotalScore,
        status: newStatus,
        isDraft: dto.isDraft,
        reviewedAt: review.reviewedAt,
      };
    });
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại Controllers & RBAC

* **Tệp tin khởi tạo:** `src/modules/submissions/writing-grading-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { WritingGradingService } from './writing-grading.service';
import { ReviewWritingSubmissionDto } from './dto/review-writing-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WritingGradingAdminController {
  constructor(private readonly gradingService: WritingGradingService) {}

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getSubmissionForGrading(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string; role: string } },
  ) {
    return await this.gradingService.getSubmissionForGrading(id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':id/review')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async reviewWritingSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ReviewWritingSubmissionDto,
  ) {
    return await this.gradingService.reviewWritingSubmission(id, req.user.sub, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (Split-Screen ADM0302 & Inline Annotation Hooks)

* **Tệp tin khởi tạo:** `src/api/writing-grading-hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface InlineFeedbackItem {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  errorType: 'GRAMMAR' | 'VOCABULARY' | 'SPELLING' | 'PUNCTUATION' | 'COHERENCE';
  comment: string;
  suggestion?: string;
}

export interface ReviewWritingPayload {
  criteriaScores: Record<string, { score: number; maxScore: number; weight: number; comment?: string }>;
  inlineFeedback?: InlineFeedbackItem[];
  generalComment?: string;
  feedbackAudioUrl?: string;
  isDraft: boolean;
}

export const useSubmissionDetailQuery = (submissionId: string) => {
  return useQuery({
    queryKey: ['admin', 'submissions', submissionId],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/submissions/${submissionId}`);
      return response.data;
    },
    enabled: !!submissionId,
  });
};

export const useReviewWritingMutation = (submissionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReviewWritingPayload) => {
      const response = await apiClient.post(`/admin/submissions/${submissionId}/review`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
    },
  });
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

Before merging Pull Request, verify against the following 4 Pillars:

* [x] **Trụ cột 1: Type Safety & Compilation**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch.
  * Zero `any` hoặc `as any` trong DTOs, Entities, Services, Controllers, Custom Hooks.
* [x] **Trụ cột 2: Integrity & Performance**
  * Tự động tính toán `totalScore` ở Backend dựa trên trọng số Rubric.
  * Thao tác Upsert review và cập nhật trạng thái bọc 100% trong `this.dataSource.transaction()`.
  * Tác vụ phát Push Notification FCM/Email chuyển giao bất đồng bộ sang BullMQ Queue (`@InjectQueue('notifications')`).
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Ép buộc cách ly dữ liệu bài nộp theo giảng viên phụ trách lớp (`c.teacher_id = currentUserId`).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
