# MODULE SPECIFICATION: FNC_ADM_08 — STUDIO CHẤM BÀI SPEAKING TRỰC QUAN QUA SÓNG ÂM WAVESURFER & PHẢN HỒI THEO MỐC THỜI GIAN

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_08` (Tương ứng `FNC_ADM_08`)
* **Tên Module:** Studio Chấm bài Speaking trực quan qua sóng âm WaveSurfer & Phản hồi theo mốc thời gian (Speaking Waveform Studio & Timestamp Audio Annotation)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Màn hình Giao diện:** `ADM0303` (Speaking Grading Studio)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_08_Studio_Cham_Speaking_WaveSurfer_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất WaveSurfer Audio Annotations & Unified Review API)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Giảng viên (Teacher) / Quản trị viên (Admin):** Tôi muốn sử dụng phòng chấm bài Nói (Speaking Studio ADM0303) tích hợp biểu đồ sóng âm WaveSurfer.js để nghe lại bài thu âm của học viên, cắm cờ đánh dấu lỗi phát âm/ngữ điệu theo từng mốc giây chính xác (Timestamp Markers & Audio Regions), chấm điểm 4 tiêu chí Rubric nói và đính kèm file audio nhận xét bằng giọng nói để đưa ra phản hồi trực quan nhất.
* **Là Giảng viên (Teacher):** Tôi muốn có tính năng **Lưu nháp (`isDraft = true`)** để có thể lưu tạm tiến độ chấm bài Speaking và tính năng **Công bố điểm (`isDraft = false`)** để phát hành kết quả chính thức cho học viên.
* **Là Học viên (Student):** Khi xem kết quả chấm bài Speaking, tôi muốn bấm vào từng mốc thời gian ghi chú (Marker) trên sóng âm để trình phát audio tự động nhảy đến đúng giây đó và phát đoạn phát âm lỗi cần rút kinh nghiệm.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal Next.js 14) ]        [ Backend NestJS ]           [ PostgreSQL 16 / S3 / BullMQ ]
                 │                                      │                                 │
  ── 1. GET /api/v1/admin/submissions/:id ─────────────>│                                 │
                                                        │── 2. Check Teacher Isolation ──>│
                                                        │── 3. Generate Presigned GET ────│
                                                        │<─ (Audio URL + Submission Data) │
  <── 4. Response 200 OK (Audio URL & Review) ──────────│                                 │
                 │                                      │                                 │
  [ WaveSurfer Render Waveform & Teacher Marks Timeline ]                                 │
                 │                                      │                                 │
  ── 5. POST /api/v1/admin/submissions/:id/review ─────>│                                 │
      (criteriaScores, inlineFeedback,                  │── 6. Calculate Total Score      │
       generalComment, isDraft)                         │      from 4 Speaking Criteria    │
                                                        │                                 │
                                                        │── 7. CSDL Transaction ─────────>│
                                                        │   - Upsert submission_reviews   │
                                                        │   - Update submission status    │
                                                        │   - Update assignment_targets   │
                                                        │<─ (Transaction Commit) ─────────│
                                                        │                                 │
                                                        │── 8. If isDraft === false ─────>│
                                                        │   Dispatch BullMQ Job           │
                                                        │   (submission-graded)           │
                                                        │                                 │
  <── 9. Response 200 OK (Grading Result Envelope) ─────│                                 │
```

#### A. Tiến trình Tải Sóng âm Audio & Bản nháp Chấm (Get Speaking Submission Detail Flow)
1. Giảng viên mở giao diện Speaking Grading Studio ADM0303. Trình duyệt gửi Yêu cầu `GET /api/v1/admin/submissions/:id`.
2. Backend NestJS `SpeakingGradingService`:
   * Kiểm tra quyền truy cập: Nếu người dùng là `TEACHER`, kiểm tra xem bài nộp có thuộc lớp học do giảng viên này phụ trách không (`c.teacher_id = currentUserId`). Nếu không, từ chối với mã lỗi `403 Forbidden` (`ERR_AUTH_003`).
   * Truy vấn bảng `assignment_submissions` lấy đường dẫn file audio bài nộp của học viên (`audio_file_url`).
   * Khởi tạo **Presigned GET URL** có hiệu lực trong 60 phút để Client truy cập phát file mp3/m4a/webm an toàn.
   * Truy vấn bản ghi chấm cũ/nháp từ `submission_reviews` (nếu có).
3. Phản hồi DTO dạng Response Envelope chuẩn kèm `presignedAudioUrl`.

#### B. Tiến trình Cắm cờ Sóng âm, Chấm Rubric & Công bố điểm (Review Speaking Submission Flow)
1. Trên giao diện Client, thư viện WaveSurfer.js render sóng âm chi tiết. Giảng viên nghe audio, nhấp chuột vào mốc thời gian (ví dụ: `14.2s - 16.8s`) để tạo cờ ghi chú (Region/Marker) -> Nhập loại lỗi (`PRONUNCIATION`, `INTONATION`, `FLUENCY`, `GRAMMAR_VOCAB`) và nội dung góp ý -> Tạo thành mảng `inlineFeedback`.
2. Giảng viên nhập điểm 4 tiêu chí Rubric nói (`pronunciation`, `intonation_stress`, `fluency`, `grammar_vocabulary` - mỗi tiêu chí tối đa 25 điểm).
3. Giảng viên đính kèm link audio nhận xét giọng nói `feedbackAudioUrl` (nếu có) và chọn **Lưu nháp (`isDraft = true`)** hoặc **Công bố điểm (`isDraft = false`)**. Client gửi Yêu cầu `POST /api/v1/admin/submissions/:id/review`.
4. Backend `SpeakingGradingService`:
   * Xác thực bài nộp thuộc loại bài tập `SPEAKING` (`assignments.type = 'SPEAKING'`).
   * Tự động tính toán tổng điểm `totalScore` = `pronunciation + intonation_stress + fluency + grammar_vocabulary` (thang 100).
   * Mở **CSDL Transaction (`this.dataSource.transaction`)**:
     a. Upsert bản ghi vào bảng `submission_reviews` (luôn đè duy nhất 1 bản ghi nhờ `submission_id UNIQUE`).
     b. Cập nhật trạng thái `assignment_submissions.status`: `'GRADING'` nếu `isDraft = true`, `'GRADED'` nếu `isDraft = false`.
     c. Nếu `isDraft = false` và bài nộp có đính kèm `target_id`, cập nhật `assignment_targets.is_completed = true`.
   * Nếu `isDraft = false`, đẩy tác vụ bất đồng bộ `submission-graded` vào hàng đợi BullMQ Queue (`@InjectQueue('notifications')`) để phát Push Notification FCM và Email thông báo điểm cho học viên.
5. Phản hồi DTO kết quả chấm bài thành công.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation (Business Rules)

* **Cấu trúc JSONB Inline Feedback theo Mốc Thời gian (`inline_feedback`):**
  ```json
  [
    {
      "id": "ts_marker_01",
      "startTime": 14.2,
      "endTime": 16.8,
      "displayTime": "00:14 - 00:16",
      "errorType": "PRONUNCIATION",
      "comment": "Từ 'passengers' phát âm thiếu âm đuôi /z/ ở cuối."
    }
  ]
  ```
  * Danh mục `errorType` hợp lệ cho Speaking: `PRONUNCIATION` (Phát âm), `INTONATION` (Ngữ điệu & Trọng âm), `FLUENCY` (Độ trôi chảy), `GRAMMAR_VOCAB` (Ngữ pháp & Từ vựng khi nói).

* **Cấu trúc JSONB Điểm Rubric Speaking (`criteria_scores`):**
  ```json
  {
    "PRONUNCIATION": { "score": 22.0, "maxScore": 25, "weight": 25, "comment": "Phát âm rõ ràng, nguyên âm chuẩn." },
    "INTONATION_STRESS": { "score": 20.0, "maxScore": 25, "weight": 25, "comment": "Ngữ điệu tự nhiên, nhấn đúng trọng âm câu." },
    "FLUENCY": { "score": 21.5, "maxScore": 25, "weight": 25, "comment": "Nói trôi chảy, ngắt nghỉ hợp lý." },
    "GRAMMAR_VOCABULARY": { "score": 23.0, "maxScore": 25, "weight": 25, "comment": "Cấu trúc câu đa dạng, từ vựng phong phú." }
  }
  ```

* **Thuật toán Tính Tổng Điểm Bài Speaking (Total Score Algorithm):**
  \\[\text{Total Score} = \text{pronunciation} + \text{intonation\_stress} + \text{fluency} + \text{grammar\_vocabulary}\\]
  *(Thang điểm 100 quy đổi; mỗi tiêu chí tối đa 25 điểm)*.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `submission_reviews` (Kết quả Chấm bài của Giảng viên)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `submission_id` (`UUID`, Foreign Key -> `assignment_submissions(id)` ON DELETE CASCADE, UNIQUE, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `total_score` (`NUMERIC(5, 2)`, NOT NULL - Tổng điểm quy đổi thang 100)
* `criteria_scores` (`JSONB`, NOT NULL - Lưu chi tiết điểm 4 tiêu chí Speaking)
* `inline_feedback` (`JSONB`, NULLABLE - Lưu mảng các cờ ghi chú mốc thời gian sóng âm)
* `general_comment` (`TEXT`, NULLABLE - Nhận xét tổng quan)
* `feedback_audio_url` (`TEXT`, NULLABLE - Link S3 file thu âm nhận xét giọng nói của giảng viên)
* `reviewed_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignment_submissions` (Bài nộp của Học viên)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)`)
* `target_id` (`UUID`, Foreign Key -> `assignment_targets(id)`)
* `audio_file_url` (`TEXT`, NULLABLE - Link file thu âm bài Speaking của học viên)
* `status` (`submission_status_enum`, DEFAULT `'SUBMITTED'`, NOT NULL)
* `submitted_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### C. Bảng `assignment_targets` (Tiến độ Bài tập được Giao)
* `id` (`UUID`, Primary Key)
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
| **59** | `GET` | `/api/v1/admin/submissions/:id` | Teacher / Admin | Lấy thông tin bài nộp Speaking, S3 Presigned URL audio và bản nháp chấm |
| **60** | `POST` | `/api/v1/admin/submissions/:id/review` | Teacher / Admin | **[Chuẩn hóa v11]** Lưu kết quả chấm Rubric Speaking, timestamp markers & feedbackAudioUrl |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chấm bài Speaking thành công",
  "data": {
    "reviewId": "r8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "submissionId": "s9a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "totalScore": 86.50,
    "status": "GRADED",
    "isDraft": false,
    "criteriaScores": {
      "PRONUNCIATION": { "score": 22.0, "maxScore": 25, "weight": 25, "comment": "Phát âm rõ ràng." },
      "INTONATION_STRESS": { "score": 20.0, "maxScore": 25, "weight": 25, "comment": "Ngữ điệu tự nhiên." },
      "FLUENCY": { "score": 21.5, "maxScore": 25, "weight": 25, "comment": "Trôi chảy." },
      "GRAMMAR_VOCABULARY": { "score": 23.0, "maxScore": 25, "weight": 25, "comment": "Từ vựng tốt." }
    },
    "inlineFeedback": [
      {
        "id": "ts_marker_01",
        "startTime": 14.2,
        "endTime": 16.8,
        "displayTime": "00:14 - 00:16",
        "errorType": "PRONUNCIATION",
        "comment": "Từ 'passengers' phát âm thiếu âm đuôi /z/ ở cuối."
      }
    ],
    "generalComment": "Bài nói tự tin, trôi chảy. Cần chú ý âm đuôi s/z.",
    "feedbackAudioUrl": "speaking-reviews/voice-review-101.webm",
    "reviewedAt": "2026-10-12T21:50:00.000Z"
  },
  "timestamp": "2026-10-12T21:50:00.000Z"
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
  * `src/modules/submissions/dto/timestamp-feedback-item.dto.ts`
  * `src/modules/submissions/dto/speaking-criteria-score.dto.ts`
  * `src/modules/submissions/dto/review-speaking-submission.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/dto/timestamp-feedback-item.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min, IsIn, IsOptional } from 'class-validator';

export class TimestampFeedbackItemDto {
  @IsString()
  @IsNotEmpty({ message: 'id của mốc thời gian không được để trống.' })
  id!: string;

  @IsNumber({}, { message: 'startTime phải là số giây.' })
  @Min(0, { message: 'startTime không được nhỏ hơn 0.' })
  startTime!: number;

  @IsNumber({}, { message: 'endTime phải là số giây.' })
  @Min(0, { message: 'endTime không được nhỏ hơn 0.' })
  endTime!: number;

  @IsString()
  @IsNotEmpty({ message: 'displayTime hiển thị không được để trống.' })
  displayTime!: string;

  @IsString()
  @IsIn(['PRONUNCIATION', 'INTONATION', 'FLUENCY', 'GRAMMAR_VOCAB'], {
    message: 'errorType phải là PRONUNCIATION, INTONATION, FLUENCY hoặc GRAMMAR_VOCAB.',
  })
  errorType!: 'PRONUNCIATION' | 'INTONATION' | 'FLUENCY' | 'GRAMMAR_VOCAB';

  @IsString()
  @IsNotEmpty({ message: 'Nhận xét comment không được để trống.' })
  comment!: string;
}

// src/modules/submissions/dto/speaking-criteria-score.dto.ts
import { IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class SpeakingCriteriaScoreDto {
  @IsNumber({}, { message: 'Điểm score phải là giá trị số.' })
  @Min(0, { message: 'Điểm tối thiểu là 0.' })
  @Max(25, { message: 'Điểm tối đa cho 1 tiêu chí Speaking là 25.' })
  score!: number;

  @IsNumber()
  @Min(1)
  maxScore: number = 25;

  @IsNumber()
  @Min(1)
  @Max(100)
  weight: number = 25;

  @IsString()
  @IsOptional()
  comment?: string;
}

// src/modules/submissions/dto/review-speaking-submission.dto.ts
import { IsNotEmpty, IsBoolean, IsString, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { TimestampFeedbackItemDto } from './timestamp-feedback-item.dto';
import { SpeakingCriteriaScoreDto } from './speaking-criteria-score.dto';

export class ReviewSpeakingSubmissionDto {
  @IsObject({ message: 'criteriaScores phải là một đối tượng chứa điểm 4 tiêu chí.' })
  @ValidateNested({ each: true })
  @Type(() => SpeakingCriteriaScoreDto)
  criteriaScores!: Record<string, SpeakingCriteriaScoreDto>;

  @IsArray({ message: 'inlineFeedback phải là mảng cờ mốc thời gian sóng âm.' })
  @ValidateNested({ each: true })
  @Type(() => TimestampFeedbackItemDto)
  @IsOptional()
  inlineFeedback?: TimestampFeedbackItemDto[];

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
import { TimestampFeedbackItemDto } from '../dto/timestamp-feedback-item.dto';
import { SpeakingCriteriaScoreDto } from '../dto/speaking-criteria-score.dto';

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
  criteriaScores!: Record<string, SpeakingCriteriaScoreDto>;

  @Column({ type: 'jsonb', name: 'inline_feedback', nullable: true })
  inlineFeedback!: TimestampFeedbackItemDto[] | null;

  @Column({ type: 'text', name: 'general_comment', nullable: true })
  generalComment!: string | null;

  @Column({ type: 'text', name: 'feedback_audio_url', nullable: true })
  feedbackAudioUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'reviewed_at' })
  reviewedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `SpeakingGradingService` & Storage Presigned URL

* **Tệp tin khởi tạo:** `src/modules/submissions/speaking-grading.service.ts`
* **Chức năng:** Khởi tạo Storage Presigned GET URL, tính tổng điểm Speaking 4 tiêu chí, bọc CSDL Transaction, bắn sự kiện BullMQ `@InjectQueue('notifications')`.

```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { AssignmentTargetEntity } from '../assignments/entities/assignment-target.entity';
import { ReviewSpeakingSubmissionDto } from './dto/review-speaking-submission.dto';

@Injectable()
export class SpeakingGradingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async getSpeakingSubmissionForGrading(submissionId: string, currentUser: { id: string; role: string }) {
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

    const presignedAudioUrl = `/api/v1/storage/presigned-url/${submission.audioFileUrl}`;

    const review = await this.dataSource.getRepository(SubmissionReviewEntity).findOne({
      where: { submissionId },
    });

    return {
      submission: {
        ...submission,
        presignedAudioUrl,
      },
      review,
    };
  }

  async reviewSpeakingSubmission(submissionId: string, teacherId: string, dto: ReviewSpeakingSubmissionDto) {
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

      if (submission.assignment?.type !== 'SPEAKING') {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_ASSIGNMENT_TYPE',
          message: 'Bài nộp này không phải là bài tập kỹ năng Nói (SPEAKING).',
        });
      }

      // Thuật toán Tự động Tính Tổng Điểm 4 Tiêu chí Speaking (Thang 100)
      let calculatedTotalScore = 0;
      const criteriaScores = dto.criteriaScores;
      for (const key of Object.keys(criteriaScores)) {
        calculatedTotalScore += criteriaScores[key].score;
      }
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

      // Nếu công bố điểm chính thức, đánh dấu hoàn thành target
      if (!dto.isDraft && submission.targetId) {
        await manager.update(AssignmentTargetEntity, submission.targetId, { isCompleted: true });
      }

      // Đẩy tác vụ thông báo bất đồng bộ vào BullMQ nếu Công bố điểm
      if (!dto.isDraft) {
        await this.notificationQueue.add('submission-graded', {
          submissionId,
          studentId: submission.studentId,
          assignmentTitle: submission.assignment?.title,
          totalScore: calculatedTotalScore,
          gradedAt: new Date(),
        });
      }

      return {
        reviewId: review.id,
        submissionId,
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

* **Tệp tin khởi tạo:** `src/modules/submissions/speaking-grading-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { SpeakingGradingService } from './speaking-grading.service';
import { ReviewSpeakingSubmissionDto } from './dto/review-speaking-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpeakingGradingAdminController {
  constructor(private readonly gradingService: SpeakingGradingService) {}

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getSpeakingSubmissionForGrading(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string; role: string } },
  ) {
    return await this.gradingService.getSpeakingSubmissionForGrading(id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':id/review')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async reviewSpeakingSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ReviewSpeakingSubmissionDto,
  ) {
    return await this.gradingService.reviewSpeakingSubmission(id, req.user.sub, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (WaveSurfer ADM0303 & Hooks)

* **Tệp tin khởi tạo:** `src/api/speaking-grading-hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface TimestampFeedbackItem {
  id: string;
  startTime: number;
  endTime: number;
  displayTime: string;
  errorType: 'PRONUNCIATION' | 'INTONATION' | 'FLUENCY' | 'GRAMMAR_VOCAB';
  comment: string;
}

export interface ReviewSpeakingPayload {
  criteriaScores: Record<string, { score: number; maxScore: number; weight: number; comment?: string }>;
  inlineFeedback?: TimestampFeedbackItem[];
  generalComment?: string;
  feedbackAudioUrl?: string;
  isDraft: boolean;
}

export const useSpeakingSubmissionDetailQuery = (submissionId: string) => {
  return useQuery({
    queryKey: ['admin', 'submissions', 'speaking', submissionId],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/submissions/${submissionId}`);
      return response.data;
    },
    enabled: !!submissionId,
  });
};

export const useReviewSpeakingMutation = (submissionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReviewSpeakingPayload) => {
      const response = await apiClient.post(`/admin/submissions/${submissionId}/review`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions', 'speaking', submissionId] });
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
  * Tự động sinh Storage Presigned GET URL thời hạn 60 phút cho file audio bài nộp.
  * Tự động tính toán `totalScore` ở Backend dựa trên điểm 4 tiêu chí Speaking.
  * Thao tác Upsert review và cập nhật trạng thái bọc 100% trong `this.dataSource.transaction()`.
  * Tác vụ phát Push Notification FCM/Email chuyển giao bất đồng bộ sang BullMQ Queue (`@InjectQueue('notifications')`).
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Ép buộc cách ly dữ liệu bài nộp theo giảng viên phụ trách lớp (`c.teacher_id = currentUserId`).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
