### THIẾT KẾ CHI TIẾT: BACKEND APPLICATION LAYER (NestJS & TypeScript)
#### DỰ ÁN: HỆ THỐNG HỌC TIẾNG ANH & LUYỆN THI TOEIC TRỰC TUYẾN
*   **Phiên bản:**  1.0.0
*   **Ngày phát hành:**  12/10/2026
*   **Công nghệ cốt lõi:**  Node.js (NestJS 10+), TypeScript, PostgreSQL 16, Redis 7, BullMQ, AWS S3 / Cloudflare R2
*   **Kiến trúc áp dụng:**  Modular Architecture / Clean Architecture (DDD Lite)

--------------------------------------------------------------------------------

#### 1. TRIẾT LÝ THIẾT KẾ & NGUYÊN TẮC KIẾN TRÚC
Tầng  **Backend Application**  đóng vai trò là hạt nhân điều phối toàn bộ luồng nghiệp vụ của hệ thống. Nhằm đảm bảo khả năng mở rộng ngang (Horizontal Scaling), bảo trì thuận tiện và kiểm thử độc lập, hệ thống được xây dựng dựa trên các nguyên tắc chuẩn công nghiệp:
*   **Modular Architecture** : Mỗi phân hệ nghiệp vụ (Auth, Flashcard, TOEIC, Assignment, Grading, Analytics...) được cô lập thành một NestJS Module riêng biệt, chỉ export các Service cần thiết.
*   **Dependency Injection (DI) & Inversion of Control (IoC)** : Giảm thiểu sự phụ thuộc trực tiếp giữa các module, tách rời tầng Controller, Service và Repository.
*   **Domain-Driven Design (DDD) Lite** : Tách bạch tuyệt đối giữa Data Transfer Object (DTO), Domain Entity và Database Model.
*   **Event-Driven & Background Processing** : Tách các tác vụ nặng (xử lý tệp âm thanh, gửi email báo điểm, bắn push notification Firebase FCM) ra khỏi luồng xử lý HTTP chính thông qua hàng đợi  **BullMQ (Redis Queue)** .
```text
                  [ HTTP / WebSocket Request ]
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Global Middlewares & Interceptors      │ (CORS, Helmet, Rate Limiter)
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │             Guards & Pipes Layer             │ (JwtGuard, RolesGuard, ValidationPipe)
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │               Controller Layer               │ (REST Endpoints / WebSocket Gateways)
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │                Service Layer                 │ (Core Business Logic: SM-2, ETS Engine)
        └───────┬──────────────────────────────┬───────┘
                │                              │
                ▼                              ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │  Repository Layer    │        │  BullMQ Queue Layer  │
    │  (TypeORM / Prisma)  │        │ (Async Audio, Push)  │
    └──────────┬───────────┘        └──────────┬───────────┘
               │                               │
               ▼                               ▼
       [ PostgreSQL 16 ]               [ Redis 7 Worker ]

```

--------------------------------------------------------------------------------

#### 2. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT DIRECTORY STRUCTURE)
```text
src/
├── common/                         # Các thành phần tái sử dụng toàn hệ thống
│   ├── constants/                  # Hằng số hệ thống, Mã lỗi chuẩn hóa (ERR_VAL_001,...)
│   ├── decorators/                 # Custom Decorators (@CurrentUser(), @Roles(), @Public())
│   ├── filters/                    # Global Exception Filters (AllExceptionsFilter)
│   ├── guards/                     # Authentication & Authorization (JwtAuthGuard, RolesGuard)
│   ├── interceptors/               # Logging, Transform Response Envelope
│   └── pipes/                      # Custom Pipes (ParseUUIDPipe, SanitizeHtmlPipe)
│
├── config/                         # Quản lý và validate biến môi trường (.env)
│   ├── database.config.ts          # Cấu hình Pool kết nối PostgreSQL 16
│   ├── redis.config.ts             # Cấu hình Redis Cache & BullMQ Queue
│   └── storage.config.ts           # Cấu hình AWS S3 / Cloudflare R2 Client
│
├── database/                       # Quản lý hạ tầng dữ liệu
│   ├── migrations/                 # PostgreSQL migration scripts
│   └── seeds/                      # Dữ liệu khởi tạo (Thang điểm chuẩn ETS, Decks A1-C2)
│
├── modules/                        # Các Module nghiệp vụ chức năng chính
│   ├── auth/                       # Xác thực tài khoản, cấp JWT token (Access + Refresh)
│   ├── users/                      # Quản lý tài khoản, thông tin cá nhân học viên/giáo viên
│   ├── flashcards/                 # Quản lý bộ thẻ, thẻ từ vựng và Động cơ SM-2
│   ├── grammar/                    # Bài học ngữ pháp Markdown, câu hỏi trắc nghiệm Quiz
│   ├── toeic/                      # Động cơ thi TOEIC 200 câu, Scale Mapping ETS (10-990)
│   ├── assignments/                # Quản lý đề bài (Writing/Speaking), giao bài theo lớp
│   ├── submissions/                # Nộp bài, cấp Presigned URL tải file âm thanh
│   ├── grading/                    # Studio chấm bài, Rubric 4 tiêu chí, Feedback audio
│   ├── analytics/                  # Quản lý chuỗi Streak, Radar năng lực 6 kỹ năng
│   ├── media/                      # Xử lý S3 Presigned URL, Upload handler
│   └── notifications/              # Đẩy Push Notification (FCM), Email thông báo điểm
│
├── jobs/                           # Background Workers (BullMQ Processors)
│   ├── audio-processor.consumer.ts # Chuẩn hóa bitrate & định dạng file audio bài nói
│   └── notification.consumer.ts    # Bắn push notification & email ngầm
│
├── app.module.ts                   # Root module liên kết toàn bộ phân hệ
└── main.ts                         # Entry point khởi động ứng dụng

```

--------------------------------------------------------------------------------

#### 3. THIẾT KẾ PHÂN TẦNG CHI TIẾT (LAYER BREAKDOWN)
##### 3.1. Controller Layer (Tầng Điều phối API)
*   **Trách nhiệm** : Tiếp nhận HTTP Request / WebSocket Frame, ủy quyền xác thực cho Guard, validate dữ liệu đầu vào thông qua Validation Pipe và chuyển giao xử lý cho Service tương ứng.
*   **Nguyên tắc** : Controller hoàn toàn "mỏng" (Thin Controller), tuyệt đối không chứa logic nghiệp vụ tính toán hay các câu lệnh truy vấn CSDL trực tiếp.
```typescript
// src/modules/grading/grading.controller.ts
import { Controller, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { GradingService } from './grading.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/role.enum';
import { UserEntity } from '../users/entities/user.entity';

@Controller('api/v1/admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post(':id/review')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async submitReview(
    @Param('id', ParseUUIDPipe) submissionId: string,
    @CurrentUser() teacher: UserEntity,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.gradingService.executeReview(submissionId, teacher.id, dto);
  }
}

```
##### 3.2. Guards & Security Layer
Hệ thống sử dụng cơ chế bảo vệ phân quyền nhiều lớp:
1.  **JwtAuthGuard** : Giải mã Access Token từ Header Authorization: Bearer <token>, trích xuất thông tin người dùng (userId, role).
2.  **RolesGuard** : Đối chiếu vai trò của người dùng trong token với metadata @Roles(...) được khai báo trên từng Controller/Endpoint.
```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../constants/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}

```

--------------------------------------------------------------------------------

#### 4. THIẾT KẾ CÁC PHÂN HỆ NGHIỆP VỤ CỐT LÕI (CORE BUSINESS MODULES)
##### 4.1. Phân hệ Từ vựng & Động cơ Thuật toán SM-2 (FlashcardsModule)
###### Luồng xử lý:
1.  **Lấy thẻ đến hạn ôn** : GET /api/v1/flashcards/due truy vấn bảng user_flashcard_progress dựa trên chỉ mục kép (user_id, due_date) với điều kiện due_date <= CURRENT_DATE.
2.  **Đánh giá phản xạ** : POST /api/v1/flashcards/:id/review tiếp nhận đánh giá $q \in {1, 2, 3, 4}$, tính toán lại Hệ số dễ nhớ ($EF'$) và Khoảng cách ngày ôn ($I$), sau đó cập nhật trực tiếp vào cơ sở dữ liệu.
```typescript
// src/modules/flashcards/flashcards.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFlashcardProgressEntity } from './entities/user-flashcard-progress.entity';

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectRepository(UserFlashcardProgressEntity)
    private readonly progressRepo: Repository<UserFlashcardProgressEntity>,
  ) {}

  async processReview(userId: string, cardId: string, q: number) {
    let progress = await this.progressRepo.findOne({
      where: { userId, flashcardId: cardId },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        userId,
        flashcardId: cardId,
        repetitionCount: 0,
        intervalDays: 0,
        easeFactor: 2.50,
      });
    }

    // 1. Tính toán lại Hệ số Ease Factor (EF')
    const currentEf = Number(progress.easeFactor);
    const calculatedEf = currentEf + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    const newEf = Math.max(calculatedEf, 1.30); // Ngưỡng sàn tối thiểu 1.30

    // 2. Tính số lần lặp (n) và Khoảng cách ôn tập tiếp theo (I)
    let newInterval: number;
    let newRepetition: number;

    if (q >= 3) {
      newRepetition = progress.repetitionCount + 1;
      if (newRepetition === 1) {
        newInterval = 1;
      } else if (newRepetition === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(progress.intervalDays * newEf);
      }
    } else {
      // Quên từ vựng (q < 3): Reset chuỗi lặp về 0 và ôn lại vào ngày mai
      newRepetition = 0;
      newInterval = 1;
    }

    // 3. Tính toán Ngày ôn tập tiếp theo (due_date)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + newInterval);

    progress.repetitionCount = newRepetition;
    progress.intervalDays = newInterval;
    progress.easeFactor = Number(newEf.toFixed(2));
    progress.dueDate = nextDueDate;
    progress.lastReviewedAt = new Date();

    return this.progressRepo.save(progress);
  }
}

```

--------------------------------------------------------------------------------

##### 4.2. Động cơ Thi thử TOEIC & Chấm điểm Quy đổi ETS (ToeicModule)
###### Cơ chế hoạt động:
*   **Draft Syncing via Redis** : Thí sinh gửi đáp án theo từng câu qua HTTP PATCH /attempts/:id/answers. Backend ghi trực tiếp vào Redis Hash attempt:{attemptId}:answers, đảm bảo thời gian phản hồi dưới 5ms và giảm tải hoàn toàn cho PostgreSQL.
*   **Timeout Auto-Submit** : Hệ thống sử dụng Redis Key Expiration kết hợp NestJS Cron Job kiểm tra các bài thi vượt quá duration_minutes + 2 phút (thời gian ân hạn) để tự động thu bài.
*   **Chấm tự động & Quy đổi chuẩn ETS** :
```typescript
// src/modules/toeic/toeic-scoring.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ToeicExamAttemptEntity } from './entities/toeic-exam-attempt.entity';
import { ToeicAttemptAnswerEntity } from './entities/toeic-attempt-answer.entity';
import { ETS_LISTENING_SCALE, ETS_READING_SCALE } from './constants/ets-scale.constant';

@Injectable()
export class ToeicScoringService {
  constructor(private readonly dataSource: DataSource) {}

  async finalizeExamAttempt(attemptId: string) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Lấy thông tin phiên thi và bộ câu hỏi
      const attempt = await manager.findOne(ToeicExamAttemptEntity, {
        where: { id: attemptId, status: 'IN_PROGRESS' },
        relations: ['exam', 'exam.questions'],
      });
      if (!attempt) throw new BadRequestException('Phiên thi không hợp lệ hoặc đã nộp');

      const userAnswers = await manager.find(ToeicAttemptAnswerEntity, {
        where: { attemptId },
      });

      // 2. So khớp đáp án thô (Raw Score)
      let listeningRaw = 0;
      let readingRaw = 0;

      for (const question of attempt.exam.questions) {
        const studentAns = userAnswers.find((a) => a.questionId === question.id);
        const isCorrect = studentAns?.selectedOption === question.correctOption;

        if (studentAns) {
          studentAns.isCorrect = isCorrect;
          await manager.save(studentAns);
        }

        if (isCorrect) {
          if (question.partNumber <= 4) listeningRaw++;
          else readingRaw++;
        }
      }

      // 3. Tra bảng quy đổi điểm chuẩn ETS (ETS Scale Table)
      const listeningScale = ETS_LISTENING_SCALE[listeningRaw] ?? 5;
      const readingScale = ETS_READING_SCALE[readingRaw] ?? 5;
      const totalScore = listeningScale + readingScale;

      // 4. Lưu kết quả bài thi chính thức
      attempt.listeningRawScore = listeningRaw;
      attempt.readingRawScore = readingRaw;
      attempt.listeningScaleScore = listeningScale;
      attempt.readingScaleScore = readingScale;
      attempt.totalScore = totalScore;
      attempt.status = 'COMPLETED';
      attempt.submittedAt = new Date();

      return manager.save(attempt);
    });
  }
}

```

--------------------------------------------------------------------------------

##### 4.3. Quản lý Đa phương tiện & S3 Presigned URL (MediaModule)
Nhằm giải phóng băng thông cho máy chủ chính khi học viên nộp bài thi Speaking dạng âm thanh (dung lượng từ 10MB đến 25MB), Backend chỉ đóng vai trò cấp phép tạm thời (Presigned URL) để ứng dụng Client nộp trực tiếp lên S3/R2.
```typescript
// src/modules/media/media.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaService {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generateSpeakingUploadUrl(studentId: string, assignmentId: string, mimeType: string) {
    const allowedMime = ['audio/mp4', 'audio/m4a', 'audio/webm', 'audio/mpeg'];
    if (!allowedMime.includes(mimeType)) {
      throw new BadRequestException('Định dạng âm thanh không hợp lệ');
    }

    const fileExtension = mimeType.split('/')[1];
    const fileKey = `submissions/${assignmentId}/${studentId}_${Date.now()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
      Key: fileKey,
      ContentType: mimeType,
    });

    // Tạo URL có hiệu lực trong 15 phút (900 giây)
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      fileKey,
      expiresIn: 900,
    };
  }
}

```

--------------------------------------------------------------------------------

##### 4.4. Phân hệ Chấm điểm & Đánh giá Rubric (GradingModule)
Cho phép giảng viên chấm điểm Rubric 4 tiêu chí, highlight sửa lỗi văn bản trực tiếp (Writing) và gắn ghi chú mốc thời gian trên sóng âm thanh (Speaking) trong một Transaction CSDL duy nhất:
```typescript
// src/modules/grading/grading.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssignmentSubmissionEntity } from '../submissions/entities/assignment-submission.entity';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { AssignmentTargetEntity } from '../assignments/entities/assignment-target.entity';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Injectable()
export class GradingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notifyQueue: Queue,
  ) {}

  async executeReview(submissionId: string, teacherId: string, dto: SubmitReviewDto) {
    return this.dataSource.transaction(async (manager) => {
      const submission = await manager.findOne(AssignmentSubmissionEntity, {
        where: { id: submissionId },
        relations: ['assignment'],
      });
      if (!submission) throw new NotFoundException('Không tìm thấy bài nộp');

      // 1. Tính toán tổng điểm theo các tiêu chí rubric
      const criteria = dto.criteriaScores;
      const calculatedTotal = Object.values(criteria).reduce((acc, curr) => acc + curr, 0);

      // 2. Upsert bản ghi kết quả chấm điểm (submission_reviews)
      let review = await manager.findOne(SubmissionReviewEntity, { where: { submissionId } });
      if (!review) {
        review = manager.create(SubmissionReviewEntity, { submissionId, teacherId });
      }

      review.totalScore = calculatedTotal;
      review.criteriaScores = criteria;
      review.inlineFeedback = dto.inlineFeedback; // JSONB mảng highlight text hoặc timestamp audio
      review.generalComment = dto.generalComment;
      review.feedbackAudioUrl = dto.feedbackAudioUrl;
      review.reviewedAt = new Date();

      await manager.save(review);

      // 3. Cập nhật trạng thái bài nộp sang GRADED
      submission.status = 'GRADED';
      await manager.save(submission);

      // 4. Đánh dấu hoàn thành bài tập cho học viên
      await manager.update(
        AssignmentTargetEntity,
        { assignmentId: submission.assignmentId, studentId: submission.studentId },
        { isCompleted: true },
      );

      // 5. Đẩy tác vụ ngầm gửi Push Notification qua BullMQ
      await this.notifyQueue.add('send-graded-notification', {
        studentId: submission.studentId,
        assignmentTitle: submission.assignment.title,
        totalScore: calculatedTotal,
      });

      return { success: true, totalScore: calculatedTotal };
    });
  }
}

```

--------------------------------------------------------------------------------

#### 5. XỬ LÝ TÁC VỤ NỀN (BACKGROUND WORKER VIA BULLMQ)
Các tác vụ tốn thời gian được cách ly khỏi tiến trình chính để duy trì thời gian phản hồi API dưới 100ms:
```typescript
// src/jobs/notification.consumer.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FirebaseAdminService } from '../modules/notifications/firebase-admin.service';
import { MailerService } from '../modules/notifications/mailer.service';

@Processor('notifications')
export class NotificationConsumer extends WorkerHost {
  constructor(
    private readonly firebaseService: FirebaseAdminService,
    private readonly mailerService: MailerService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    switch (job.name) {
      case 'send-graded-notification': {
        const { studentId, assignmentTitle, totalScore } = job.data;
        
        // 1. Gửi Firebase Cloud Messaging (FCM)
        await this.firebaseService.sendPushToUser(studentId, {
          title: 'Bài tập của bạn đã được chấm điểm!',
          body: `Bài tập "${assignmentTitle}" đạt ${totalScore}/100 điểm. Xem nhận xét ngay.`,
        });

        // 2. Gửi Email thông báo tổng hợp kết quả
        await this.mailerService.sendGradingSummaryEmail(studentId, assignmentTitle, totalScore);
        break;
      }
    }
  }
}

```

--------------------------------------------------------------------------------

#### 6. XỬ LÝ LỖI TOÀN CỤC & CHUẨN HÓA DỮ LIỆU TRẢ VỀ
##### 6.1. Chuẩn hóa Response Envelope Interceptor
Mọi kết quả thành công trả về từ Controller đều được bọc tự động theo format chuẩn:
```json
{
  "statusCode": 200,
  "success": true,
  "data": { ... },
  "timestamp": "2026-10-12T14:51:00.000Z"
}

```
##### 6.2. Bộ lọc Ngoại lệ Toàn cục (AllExceptionsFilter)
Tất cả các lỗi nghiệp vụ, lỗi ràng buộc cơ sở dữ liệu (Duplicate Key, Foreign Key Constraint) đều được bắt lại, ghi log vào hệ thống và phản hồi về client theo format an toàn:
```json
{
  "statusCode": 400,
  "success": false,
  "errorCode": "ERR_VAL_003",
  "message": "Điểm tiêu chí phải nằm trong khoảng từ 0.0 đến 25.0.",
  "timestamp": "2026-10-12T14:51:00.000Z"
}

```
