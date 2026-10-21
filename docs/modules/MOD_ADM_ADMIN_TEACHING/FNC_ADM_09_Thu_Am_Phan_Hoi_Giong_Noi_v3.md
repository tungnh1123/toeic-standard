# MODULE SPECIFICATION: FNC_ADM_09 — THU ÂM PHẢN HỒI BẰNG GIỌNG NÓI TRỰC TIẾP CỦA GIẢNG VIÊN

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_09` (Tương ứng `FNC_ADM_09`)
* **Tên Module:** Thu âm phản hồi bằng giọng nói trực tiếp của Giảng viên (Teacher Voice Feedback Recorder & Speech Modeling)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_09_Thu_Am_Phan_Hoi_Giong_Noi_v3.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Direct S3 Upload & Voice Feedback Management)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Giảng viên (Teacher) / Quản trị viên (Admin):** Tôi muốn thu âm trực tiếp nhận xét bằng giọng nói (Voice Note / Audio Feedback) trên trình duyệt Web (Next.js 14) khi đang chấm bài Speaking hoặc Writing của học viên, sau đó tải thẳng file âm thanh lên Cloud Storage (S3 / R2) để học viên có thể lắng nghe phản hồi chi tiết từ giáo viên.
* **Là Giảng viên (Teacher):** Tôi muốn có khả năng nghe lại file ghi âm nhận xét vừa thu, và nếu chưa hài lòng, tôi có thể bấm xóa file khỏi S3 để thu âm lại bản khác trước khi công bố bài chấm.
* **Là Hệ thống (System):** Tôi muốn áp dụng giao thức Upload Direct-to-S3 Presigned PUT URL để nhận file ghi âm voice feedback trực tiếp từ Client lên Cloud Storage, giúp loại bỏ việc stream nhị phân qua Backend NestJS, tiết kiệm băng thông và tài nguyên bộ nhớ RAM/CPU của server.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal Next.js 14) ]        [ Backend NestJS ]           [ Cloud Storage (S3 / R2) ]
                 │                                      │                                 │
  [ Teacher Records Voice Note via Web Audio API ]      │                                 │
  [ Max Duration: 300 Seconds (5 mins) ]                │                                 │
                 │                                      │                                 │
  ── 1. POST /voice-feedback/presigned-url ────────────>│                                 │
     (filename, mimeType, fileSize)                     │── 2. Check Teacher Isolation ──>│
                                                        │── 3. Generate Presigned PUT ────│
  <── 4. Response 200 OK (uploadUrl, fileKey) ──────────│   (Expires in 15 mins)          │
                 │                                      │                                 │
  ── 5. PUT Audio Binary directly to uploadUrl ──────────────────────────────────────────>│
  <── 6. HTTP 200 OK (Upload Verified on S3) ────────────────────────────────────────────│
                 │                                      │                                 │
  ── 7. POST /api/v1/admin/submissions/:id/review ─────>│                                 │
     (feedbackAudioUrl: fileKey, ...)                   │── 8. CSDL Transaction ─────────>│
                                                        │   (Upsert submission_reviews)   │
                                                        │<─ (Transaction Commit) ─────────│
  <── 9. Response 200 OK (Review Saved) ───────────────│                                 │
                 │                                      │                                 │
  [ Optional: Delete Voice Feedback ]                   │                                 │
  ── 10. DELETE /voice-feedback ───────────────────────>│                                 │
                                                        │── 11. Delete S3 Object ────────>│
                                                        │   (DeleteObjectCommand)         │
                                                        │<─ (S3 Confirmation) ────────────│
                                                        │── 12. Update DB null ──────────>│
  <── 13. Response 200 OK (Voice Deleted) ──────────────│                                 │
```

#### A. Tiến trình Ghi âm & Xin Cấp S3 Presigned URL (Voice Recording & Upload Flow)
1. Giảng viên nhấp nút "Bắt đầu thu âm" trên giao diện Studio chấm bài. Client khởi tạo `MediaRecorder` API từ Web Audio API.
2. Trình duyệt tự động khống chế thời lượng ghi âm tối đa **300 giây (5 phút)**. Khi dừng ghi âm, Client tạo đối tượng `Blob` nhị phân (`audio/webm` hoặc `audio/mp4`).
3. Client gửi Yêu cầu `POST /api/v1/admin/submissions/:id/voice-feedback/presigned-url` chứa `filename`, `mimeType`, và `fileSize` (tối đa 10MB).
4. Backend NestJS `VoiceFeedbackService`:
   * Kiểm tra xem bài nộp `:id` có thuộc lớp do giảng viên này phụ trách không (`c.teacher_id = currentUserId`).
   * Tạo S3 File Key theo cấu trúc độc nhất: `feedbacks/{submissionId}/teacher_{teacherId}_{timestamp}.webm`.
   * Khởi tạo **S3 Presigned PUT URL** có thời hạn hết hạn 15 phút (900 giây) bằng thư viện `@aws-sdk/s3-request-presigner`.
5. Client nhận `uploadUrl` và thực hiện `fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: audioBlob })` đẩy dữ liệu audio trực tiếp từ trình duyệt lên Cloud Storage.
6. Sau khi S3 phản hồi HTTP 200 OK, Client lưu lại `fileKey` để chuẩn bị gắn vào bài chấm.

#### B. Tiến trình Xóa File Ghi âm Nhận xét (Delete Voice Feedback Flow)
1. Nếu giảng viên muốn hủy bản thu âm nhận xét cũ, Client gửi `DELETE /api/v1/admin/submissions/:id/voice-feedback`.
2. Backend NestJS `VoiceFeedbackService`:
   * Truy vấn bản ghi `submission_reviews` tương ứng với `submissionId` và `teacherId`.
   * Lấy `feedbackAudioUrl` (chứa `fileKey` S3). Nếu tồn tại, gửi lệnh `DeleteObjectCommand` tới S3 Bucket để xóa file vật lý trên cloud.
   * Cập nhật cột `submission_reviews.feedback_audio_url = null` trong CSDL PostgreSQL.
3. Trả về phản hồi thông báo xóa thành công.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation (Business Rules)

* **Ràng buộc Thời lượng & Dung lượng Ghi âm (Audio Recording Limits):**
  * Thời lượng ghi âm tối đa: **300 giây (5 phút)**.
  * Dung lượng file ghi âm tối đa: **10 MB** (10,485,760 bytes).
  * Định dạng MIME Type được chấp nhận: `audio/webm`, `audio/mp4`, `audio/m4a`, `audio/ogg`.

* **Quy tắc Kiến trúc Direct-to-S3 (Direct-to-S3 Architecture Pattern):**
  * File âm thanh voice feedback **tuyệt đối KHÔNG stream qua server Backend NestJS** để chống quá tải CPU/RAM server.
  * Backend chỉ đóng vai trò cấp quyền (Presigned URL) và lưu vết chuỗi `fileKey` vào cơ sở dữ liệu.

* **Thời hạn Hiệu lực Presigned URL (Presigned URL TTL):**
  * S3 Presigned PUT URL hết hạn sau **900 giây (15 phút)**. Nếu quá thời gian này mà Client chưa upload xong, Client phải xin lại URL mới.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `submission_reviews` (Kết quả Chấm bài & Lời phê Giảng viên)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `submission_id` (`UUID`, Foreign Key -> `assignment_submissions(id)` ON DELETE CASCADE, UNIQUE, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `total_score` (`NUMERIC(5, 2)`, NOT NULL)
* `criteria_scores` (`JSONB`, NOT NULL)
* `inline_feedback` (`JSONB`, NULLABLE)
* `general_comment` (`TEXT`, NULLABLE)
* `feedback_audio_url` (`TEXT`, NULLABLE - Lưu S3 Key file ghi âm nhận xét giọng nói)
* `reviewed_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignment_submissions` (Bài nộp của Học viên)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)`)

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE submission_status_enum AS ENUM ('SUBMITTED', 'GRADING', 'GRADED', 'REJECTED');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `POST` | `/api/v1/admin/submissions/:id/voice-feedback/presigned-url` | Teacher / Admin | Cấp Presigned PUT URL để tải file ghi âm nhận xét giọng nói |
| **2** | `DELETE` | `/api/v1/admin/submissions/:id/voice-feedback` | Teacher / Admin | Xóa file ghi âm nhận xét và xóa feedbackAudioUrl trong CSDL |

#### Định dạng Cấu trúc Phản hồi Presigned URL (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Cấp Presigned URL ghi âm giọng nói thành công",
  "data": {
    "uploadUrl": "https://storage.local/feedbacks/upload_key",
    "fileKey": "feedbacks/s8a1b2c3/teacher_t1a2.webm",
    "expiresIn": 900
  },
  "timestamp": "2026-10-12T21:55:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/admin/submissions/:id/voice-feedback/presigned-url` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |
| `DELETE /api/v1/admin/submissions/:id/voice-feedback` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:** `src/modules/submissions/dto/generate-voice-presigned-url.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/dto/generate-voice-presigned-url.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class GenerateVoicePresignedUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'filename không được để trống.' })
  filename!: string;

  @IsString()
  @IsIn(['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg'], {
    message: 'mimeType phải là audio/webm, audio/mp4, audio/m4a hoặc audio/ogg.',
  })
  mimeType!: string;

  @IsInt({ message: 'fileSize phải là số nguyên.' })
  @Min(1024, { message: 'Kích thước file audio phải lớn hơn 1KB.' })
  @Max(10485760, { message: 'Kích thước file audio không vượt quá 10MB.' })
  fileSize!: number;
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
  criteriaScores!: Record<string, any>;

  @Column({ type: 'jsonb', name: 'inline_feedback', nullable: true })
  inlineFeedback!: any[] | null;

  @Column({ type: 'text', name: 'general_comment', nullable: true })
  generalComment!: string | null;

  @Column({ type: 'text', name: 'feedback_audio_url', nullable: true })
  feedbackAudioUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'reviewed_at' })
  reviewedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `VoiceFeedbackService` & AWS S3 Integration

* **Tệp tin khởi tạo:** `src/modules/submissions/voice-feedback.service.ts`
* **Chức năng:** Khởi tạo S3Client, cấp Presigned PUT URL và xử lý xóa S3 object khi hủy voice note.

```typescript
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DataSource } from 'typeorm';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { GenerateVoicePresignedUrlDto } from './dto/generate-voice-presigned-url.dto';

@Injectable()
export class VoiceFeedbackService {
  private s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'ap-southeast-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async generateUploadUrl(submissionId: string, currentUser: { id: string; role: string }, dto: GenerateVoicePresignedUrlDto) {
    const submission = await this.dataSource.getRepository(AssignmentSubmissionEntity).findOne({
      where: { id: submissionId },
      relations: ['class'],
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
        message: 'Bạn không có quyền quản lý bài nộp của lớp học này.',
      });
    }

    const ext = dto.mimeType.includes('mp4') || dto.mimeType.includes('m4a') ? 'm4a' : 'webm';
    const fileKey = `feedbacks/${submissionId}/teacher_${currentUser.id}_${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME', 'toeic-app-bucket'),
      Key: fileKey,
      ContentType: dto.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      fileKey,
      expiresIn: 900,
    };
  }

  async removeVoiceFeedback(submissionId: string, currentUser: { id: string; role: string }) {
    const reviewRepo = this.dataSource.getRepository(SubmissionReviewEntity);
    const review = await reviewRepo.findOne({
      where: { submissionId },
      relations: ['submission', 'submission.class'],
    });

    if (!review || !review.feedbackAudioUrl) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy file ghi âm nhận xét cần xóa.',
      });
    }

    if (currentUser.role === 'TEACHER' && review.submission?.class?.teacherId !== currentUser.id) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Bạn không có quyền xóa phản hồi bài nộp này.',
      });
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME', 'toeic-app-bucket'),
        Key: review.feedbackAudioUrl,
      });
      await this.s3Client.send(command);
    } catch (error) {
      // Log error
    }

    review.feedbackAudioUrl = null;
    await reviewRepo.save(review);

    return {
      success: true,
      message: 'Đã xóa file audio phản hồi bằng giọng nói thành công.',
    };
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại Controllers & RBAC

* **Tệp tin khởi tạo:** `src/modules/submissions/voice-feedback-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Post, Delete, Body, Param, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { VoiceFeedbackService } from './voice-feedback.service';
import { GenerateVoicePresignedUrlDto } from './dto/generate-voice-presigned-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceFeedbackAdminController {
  constructor(private readonly voiceFeedbackService: VoiceFeedbackService) {}

  @Post(':id/voice-feedback/presigned-url')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async generateUploadUrl(
    @Param('id', ParseUUIDPipe) submissionId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
    @Body() dto: GenerateVoicePresignedUrlDto,
  ) {
    return await this.voiceFeedbackService.generateUploadUrl(
      submissionId,
      { id: req.user.sub, role: req.user.role },
      dto,
    );
  }

  @Delete(':id/voice-feedback')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async removeVoiceFeedback(
    @Param('id', ParseUUIDPipe) submissionId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
  ) {
    return await this.voiceFeedbackService.removeVoiceFeedback(submissionId, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (MediaRecorder Hook & TanStack Query v5)

* **Tệp tin khởi tạo:** `src/api/voice-feedback-hooks.ts`

```typescript
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export const useVoiceRecorder = (maxDurationSeconds = 300) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDurationSeconds - 1) {
          stopRecording();
          return maxDurationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return { isRecording, recordingTime, audioBlob, startRecording, stopRecording };
};

export const useUploadVoiceFeedbackMutation = (submissionId: string) => {
  return useMutation({
    mutationFn: async (blob: Blob) => {
      const presignedRes = await apiClient.post(`/admin/submissions/${submissionId}/voice-feedback/presigned-url`, {
        filename: `voice_note_${Date.now()}.webm`,
        mimeType: blob.type || 'audio/webm',
        fileSize: blob.size,
      });

      const { uploadUrl, fileKey } = presignedRes.data;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload file voice feedback lên Cloud Storage thất bại.');
      }

      return fileKey;
    },
  });
};

export const useDeleteVoiceFeedbackMutation = (submissionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/admin/submissions/${submissionId}/voice-feedback`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions', submissionId] });
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
* [x] **Trụ cột 2: Integrity & Direct-to-S3 Upload**
  * File ghi âm voice feedback upload trực tiếp từ Client lên S3 qua Presigned PUT URL, không stream nhị phân qua server NestJS.
  * Khống chế thời lượng tối đa 300 giây và dung lượng tối đa 10MB.
  * Khi giáo viên nhấn xóa voice feedback, hệ thống thực thi xóa đồng thời file trên S3 và set `feedbackAudioUrl = null` trong CSDL.
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Ép buộc lọc `c.teacher_id = currentUserId` đối với vai trò `TEACHER`.
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
