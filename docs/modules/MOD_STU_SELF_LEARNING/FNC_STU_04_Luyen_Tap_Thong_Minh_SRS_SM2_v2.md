# MODULE SPECIFICATION: FNC_STU_04 — LUYỆN TẬP THÔNG MINH THEO THUẬT TOÁN SPACED REPETITION SM-2

---

## 📌 HEADER & METADATA

* **Module ID:** MOD_STU_04 (Tương ứng FNC_STU_04)
* **Tên Module:** Luyện tập thông minh theo thuật toán lặp lại ngắt quãng SM-2 (Spaced Repetition System Engine & Adaptive Flashcard Scheduler)
* **Phân hệ:** Phân hệ Học tập Cá nhân (MOD_STU_SELF_LEARNING)
* **Đường dẫn file lưu trữ:** docs/modules/MOD_STU_SELF_LEARNING/STU_04_flashcard_sm2_engine.md
* **Phiên bản:** v2.0.0 (Chuẩn hóa Hợp nhất Spaced Repetition Engine, SM-2 Mathematics & In-Session Queue)
* **Trạng thái:** APPROVED & FULLY SYNCED
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md (Master SRS & SDD)
  2. 02_postgresql-16-ddl-schema-v12.md (Master DDL Schema 35 Bảng v12.0)
  3. 03_api-endpoints-specification-v11.md (Master RESTful API v11.0 - 62 Endpoints)
  4. 08_rbac-permission-matrix.md (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Học viên (Student):** Tôi muốn luyện tập ôn thẻ từ vựng theo thuật toán lặp lại ngắt quãng thông minh (Spaced Repetition System - SM-2) để tối ưu hóa khả năng ghi nhớ dài hạn, tự động lên lịch ôn tập đúng thời điểm vàng trước khi quên.
* **Là Học viên (Student):** Tôi muốn đánh giá độ phản xạ trí nhớ của mình theo 4 mức (1: Quên, 2: Khó, 3: Tốt, 4: Dễ) sau khi mở mặt sau thẻ, để hệ thống tự động tính toán khoảng cách số ngày ôn tiếp theo ($I$) và cập nhật Hệ số dễ nhớ ($EF$).
* **Là Học viên (Student):** Tôi muốn các thẻ từ vựng mà tôi đánh giá "Quên" ($q < 3$) trong phiên học sẽ tự động được chuyển về cuối hàng đợi phiên học hiện tại (In-Session Relearning Queue) để tôi gặp lại và ghi nhớ thành công trước khi kết thúc phiên.
* **Là Học viên (Student):** Tôi muốn chuỗi chuyên cần (Streak) của mình được tự động cập nhật ngay khi hoàn thành các lượt đánh giá thẻ từ vựng trong ngày.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (React Native Mobile) ]          [ Backend NestJS ]           [ PostgreSQL 16 ]
              │                                 │                             │
  ─── 1. POST /student/flashcards/:id/review ──>│                             │
      (rating = q, studyDurationMs)             │── 2. Sm2EngineService ──────│
                                                │   (Calculate EF', n, I, due)│
                                                │                             │
                                                │── 3. CSDL Transaction ──────>│
                                                │   - Upsert progress         │
                                                │   - INSERT study_logs       │
                                                │   - Touch user_streaks      │
                                                │<─ (Transaction Commit) ─────│
                                                │                             │
  <── 4. Response 200 OK (New Interval/Due) ────│                             │
```

#### A. Tiến trình Đánh giá Thẻ SRS Đơn lẻ (Single Card SRS Review Flow)
1. Học viên mở màn hình học Flashcard, lật mặt sau thẻ từ vựng và chọn 1 trong 4 nút đánh giá phản xạ trí nhớ ($q \in \{1, 2, 3, 4\}$).
2. Mobile Client gửi Yêu cầu `POST /api/v1/student/flashcards/:id/review` chứa `{ rating: q, studyDurationMs, reviewedAt }`.
3. Backend NestJS `Sm2EngineService` thực thi thuật toán toán học SM-2:
   a. Cập nhật Hệ số Ease Factor: $EF' = EF + (0.1 - (5 - q) 	imes (0.08 + (5 - q) 	imes 0.02))$, khống chế $EF_{	ext{mới}} = \max(EF', 1.30)$.
   b. Nếu $q \ge 3$ (Thành công): $n_{	ext{mới}} = n + 1$. Tính $I(1) = 1$, $I(2) = 6$, $I(n) = 	ext{round}(I_{	ext{cũ}} 	imes EF_{	ext{mới}})$ với $n > 2$.
   c. Nếu $q < 3$ (Thất bại/Quên): $n_{	ext{mới}} = 0$, $I_{	ext{mới}} = 1$ ngày.
   d. Tính mốc ngày đến hạn ôn kế tiếp: $	ext{dueDate} = 	ext{CURRENT\_DATE} + I_{	ext{mới}}$.
4. Backend bọc trong **CSDL Transaction (`this.dataSource.transaction`)**:
   a. Upsert bản ghi trong bảng `user_flashcard_progress` (với constraint `uq_user_flashcard`).
   b. Insert bản ghi lịch sử đánh giá vào bảng `flashcard_study_logs`.
   c. Gọi hàm `touchUserStreak` để cập nhật chuỗi chuyên cần học tập trong `user_streaks`.
5. Phản hồi DTO dạng Standard Response Envelope chứa khoảng cách ngày mới và thông điệp trạng thái.

#### B. Cơ chế Hàng đợi Luân chuyển trong Phiên (In-Session Relearning Queue)
1. Trong một phiên học 20 thẻ (`activeQueue`):
2. Học viên đánh giá nút $q$:
   * Nếu $q \ge 3$: Thẻ được ghi nhận tốt nghiệp phiên học (`GRADUATED`), tăng `graduatedCount` và gửi API cập nhật SM-2 về Backend.
   * Nếu $q < 3$: Thẻ chuyển trạng thái `RELEARN`, tự động **đẩy về cuối mảng `activeQueue`** của phiên học.
3. Phiên học chỉ hoàn tất khi mảng `activeQueue` không còn thẻ nào chưa tốt nghiệp.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán SM-2 Toán học (Mathematical Engine)

#### A. Các biến số SM-2 cốt lõi:
* **$q$ (Rating / Quality of Response):** Điểm phản xạ trí nhớ ($q \in \{1, 2, 3, 4\}$: 1=Quên, 2=Khó, 3=Tốt, 4=Dễ).
* **$EF$ (Ease Factor):** Hệ số phản ánh độ khó của từ vựng ($EF \ge 1.30$, mặc định $EF_0 = 2.50$).
* **$n$ (Repetition Count):** Số lần học viên ghi nhớ thành công liên tiếp ($q \ge 3$).
* **$I$ (Inter-repetition Interval):** Khoảng cách số ngày chờ cho đến lần ôn tập tiếp theo ($I \ge 1$ ngày).
* **$	ext{due\_date}$ (Next Due Date):** Ngày đến hạn ôn tiếp theo = $	ext{CURRENT\_DATE} + I$.

#### B. Công thức tính toán tuần tự:
\[EF' = EF + \left(0.1 - (5 - q) 	imes (0.08 + (5 - q) 	imes 0.02)
ight)\]
\[EF_{	ext{mới}} = \max(EF',\, 1.30)\]

\[n_{	ext{mới}} = egin{cases} n + 1 & 	ext{khi } q \ge 3 \ 0 & 	ext{khi } q < 3 \end{cases}\]

\[I(n) = egin{cases} 1 	ext{ ngày} & 	ext{khi } q \ge 3 \land n_{	ext{mới}} = 1 \ 6 	ext{ ngày} & 	ext{khi } q \ge 3 \land n_{	ext{mới}} = 2 \ 	ext{round}(I_{	ext{cũ}} 	imes EF_{	ext{mới}}) & 	ext{khi } q \ge 3 \land n_{	ext{mới}} > 2 \ 1 	ext{ ngày} & 	ext{khi } q < 3 \end{cases}\]

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `user_flashcard_progress` (Tiến trình Học SRS)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `flashcard_id` (`UUID`, Foreign Key -> `flashcards(id)` ON DELETE CASCADE, NOT NULL)
* `repetition_count` (`INT`, DEFAULT 0, CHECK `repetition_count >= 0`, NOT NULL)
* `interval_days` (`INT`, DEFAULT 0, CHECK `interval_days >= 0`, NOT NULL)
* `ease_factor` (`NUMERIC(4, 2)`, DEFAULT 2.50, CHECK `ease_factor >= 1.30`, NOT NULL)
* `due_date` (`DATE`, DEFAULT `CURRENT_DATE`, NOT NULL)
* `last_reviewed_at` (`TIMESTAMPTZ`, NULLABLE)
* **Constraint:** `CONSTRAINT uq_user_flashcard UNIQUE(user_id, flashcard_id)`

#### B. Bảng `flashcard_study_logs` (Nhật ký Đánh giá SRS)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `flashcard_id` (`UUID`, Foreign Key -> `flashcards(id)` ON DELETE CASCADE, NOT NULL)
* `rating` (`SMALLINT`, CHECK `rating BETWEEN 1 AND 4`, NOT NULL)
* `previous_interval` (`INT`, NOT NULL)
* `new_interval` (`INT`, NOT NULL)
* `previous_ef` (`NUMERIC(4, 2)`, NOT NULL)
* `new_ef` (`NUMERIC(4, 2)`, NOT NULL)
* `study_duration_ms` (`INT`, DEFAULT 0, NULLABLE)
* `reviewed_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### C. Bảng `user_streaks` (Chuỗi Chuyên cần Học tập)
* `user_id` (`UUID`, Primary Key, Foreign Key -> `users(id)`)
* `current_streak` (`INT`, DEFAULT 0, NOT NULL)
* `longest_streak` (`INT`, DEFAULT 0, NOT NULL)
* `last_activity_date` (`DATE`, NULLABLE)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_user_flashcard_due_query ON user_flashcard_progress(user_id, due_date ASC);`
* `CREATE INDEX idx_study_logs_user_date ON flashcard_study_logs(user_id, reviewed_at DESC);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE flashcard_status_enum AS ENUM ('NEW', 'LEARNING', 'MASTERED');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **31** | `GET` | `/api/v1/student/flashcards/due-summary` | Student | Lấy tổng quan số thẻ đến hạn ôn hôm nay chia theo từng bộ thẻ |
| **32** | `POST` | `/api/v1/student/flashcards/:id/review` | Student | Gửi đánh giá phản xạ $q$, tính toán SM-2, cập nhật CSDL và Streak |
| **33** | `POST` | `/api/v1/student/flashcards/batch-review` | Student | Gửi danh sách nhiều thẻ đã hoàn thành trong phiên học cùng lúc |
| **34** | `GET` | `/api/v1/student/flashcards/retention-stats` | Student | Thống kê tỷ lệ ghi nhớ dài hạn (% thành thạo, % quên theo tuần) |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Đã ghi nhận đánh giá thẻ từ vựng thành công",
  "data": {
    "flashcardId": "c1a2b3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "rating": 3,
    "repetitionCount": 3,
    "intervalDays": 15,
    "easeFactor": 2.36,
    "dueDate": "2026-10-28",
    "isMastered": false,
    "message": "Hẹn gặp lại từ này sau 15 ngày."
  },
  "timestamp": "2026-10-13T00:20:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/student/flashcards/due-summary` | **×** (Chặn 403) | **○** (Phạm vi cá nhân) | **×** (Chặn 403) | **○** (Toàn quyền) |
| `POST /api/v1/student/flashcards/:id/review` | **×** (Chặn 403) | **○** (Phạm vi cá nhân) | **×** (Chặn 403) | **○** (Toàn quyền) |
| `POST /api/v1/student/flashcards/batch-review` | **×** (Chặn 403) | **○** (Phạm vi cá nhân) | **×** (Chặn 403) | **○** (Toàn quyền) |
| `GET /api/v1/student/flashcards/retention-stats` | **×** (Chặn 403) | **○** (Phạm vi cá nhân) | **×** (Chặn 403) | **○** (Toàn quyền) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/flashcards/dto/review-card.dto.ts`
  * `src/modules/flashcards/dto/batch-review-card.dto.ts`
  * `src/modules/flashcards/dto/review-response.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/flashcards/dto/review-card.dto.ts
import { IsInt, Min, Max, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class ReviewCardDto {
  @IsInt({ message: 'Điểm phản xạ rating phải là số nguyên.' })
  @Min(1, { message: 'Mức đánh giá rating tối thiểu là 1 (Quên).' })
  @Max(4, { message: 'Mức đánh giá rating tối đa là 4 (Dễ).' })
  rating!: number;

  @IsOptional()
  @IsInt({ message: 'studyDurationMs phải là số nguyên miligiây.' })
  studyDurationMs?: number;

  @IsOptional()
  @IsDateString({}, { message: 'reviewedAt phải là chuỗi ngày ISO-8601 hợp lệ.' })
  reviewedAt?: string;
}

// src/modules/flashcards/dto/batch-review-card.dto.ts
import { IsArray, ValidateNested, ArrayMinSize, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchReviewItemDto {
  @IsUUID('4', { message: 'flashcardId phải là định dạng UUID v4 hợp lệ.' })
  flashcardId!: string;

  @IsInt()
  @Min(1)
  @Max(4)
  rating!: number;

  @IsOptional()
  @IsInt()
  studyDurationMs?: number;
}

export class BatchReviewCardDto {
  @IsArray({ message: 'reviews phải là một mảng danh sách lượt đánh giá.' })
  @ArrayMinSize(1, { message: 'Mảng reviews phải chứa ít nhất 1 lượt đánh giá.' })
  @ValidateNested({ each: true })
  @Type(() => BatchReviewItemDto)
  reviews!: BatchReviewItemDto[];
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * `src/modules/flashcards/entities/user-flashcard-progress.entity.ts`
  * `src/modules/flashcards/entities/flashcard-study-log.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/flashcards/entities/user-flashcard-progress.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { FlashcardEntity } from './flashcard.entity';

@Entity('user_flashcard_progress')
@Unique('uq_user_flashcard', ['userId', 'flashcardId'])
export class UserFlashcardProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'uuid', name: 'flashcard_id' })
  flashcardId!: string;

  @ManyToOne(() => FlashcardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flashcard_id' })
  flashcard!: FlashcardEntity;

  @Column({ type: 'int', name: 'repetition_count', default: 0 })
  repetitionCount!: number;

  @Column({ type: 'int', name: 'interval_days', default: 0 })
  intervalDays!: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'ease_factor', default: 2.50 })
  easeFactor!: number;

  @Column({ type: 'date', name: 'due_date', default: () => 'CURRENT_DATE' })
  dueDate!: string;

  @Column({ type: 'timestamptz', name: 'last_reviewed_at', nullable: true })
  lastReviewedAt!: Date | null;
}

// src/modules/flashcards/entities/flashcard-study-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('flashcard_study_logs')
export class FlashcardStudyLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'flashcard_id' })
  flashcardId!: string;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'int', name: 'previous_interval' })
  previousInterval!: number;

  @Column({ type: 'int', name: 'new_interval' })
  newInterval!: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'previous_ef' })
  previousEf!: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'new_ef' })
  newEf!: number;

  @Column({ type: 'int', name: 'study_duration_ms', default: 0 })
  studyDurationMs!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'reviewed_at' })
  reviewedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Sm2EngineService & FlashcardSrsService

* **Tệp tin khởi tạo:**
  * `src/modules/flashcards/services/sm2-engine.service.ts`
  * `src/modules/flashcards/services/flashcard-srs.service.ts`

```typescript
// src/modules/flashcards/services/sm2-engine.service.ts
import { Injectable } from '@nestjs/common';

export interface Sm2Input {
  currentRepetition: number;
  currentInterval: number;
  currentEaseFactor: number;
  rating: number;
  baseDate?: Date;
}

export interface Sm2Output {
  nextRepetition: number;
  nextInterval: number;
  nextEaseFactor: number;
  nextDueDate: string;
}

@Injectable()
export class Sm2EngineService {
  private readonly MIN_EF = 1.30;
  private readonly DEFAULT_EF = 2.50;

  calculateNextSchedule(input: Sm2Input): Sm2Output {
    const { currentRepetition, currentInterval, currentEaseFactor, rating, baseDate = new Date() } = input;

    // 1. Cập nhật Ease Factor
    const prevEf = Number(currentEaseFactor) || this.DEFAULT_EF;
    const deltaEf = 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02);
    let nextEf = prevEf + deltaEf;
    if (nextEf < this.MIN_EF) nextEf = this.MIN_EF;

    // 2. Tính Repetition & Interval
    let nextRepetition: number;
    let nextInterval: number;

    if (rating >= 3) {
      nextRepetition = currentRepetition + 1;
      if (nextRepetition === 1) {
        nextInterval = 1;
      } else if (nextRepetition === 2) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(currentInterval * nextEf);
      }
    } else {
      nextRepetition = 0;
      nextInterval = 1;
    }

    // 3. Tính Due Date (YYYY-MM-DD)
    const calcDate = new Date(baseDate);
    calcDate.setDate(calcDate.getDate() + nextInterval);
    const nextDueDate = calcDate.toISOString().split('T')[0];

    return {
      nextRepetition,
      nextInterval,
      nextEaseFactor: Number(nextEf.toFixed(2)),
      nextDueDate,
    };
  }
}

// src/modules/flashcards/services/flashcard-srs.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UserFlashcardProgressEntity } from '../entities/user-flashcard-progress.entity';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { Sm2EngineService } from './sm2-engine.service';
import { ReviewCardDto } from '../dto/review-card.dto';
import { UserStreakEntity } from '../../users/entities/user-streak.entity';

@Injectable()
export class FlashcardSrsService {
  constructor(
    private readonly sm2Engine: Sm2EngineService,
    private readonly dataSource: DataSource,
  ) {}

  async processReview(userId: string, cardId: string, dto: ReviewCardDto) {
    const card = await this.dataSource.getRepository(FlashcardEntity).findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Thẻ từ vựng không tồn tại' });

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      let progress = await manager.findOne(UserFlashcardProgressEntity, {
        where: { userId, flashcardId: cardId },
      });

      if (!progress) {
        progress = manager.create(UserFlashcardProgressEntity, {
          userId,
          flashcardId: cardId,
          repetitionCount: 0,
          intervalDays: 0,
          easeFactor: 2.50,
        });
      }

      const prevInterval = progress.intervalDays;
      const prevEf = progress.easeFactor;

      const sm2 = this.sm2Engine.calculateNextSchedule({
        currentRepetition: progress.repetitionCount,
        currentInterval: progress.intervalDays,
        currentEaseFactor: Number(progress.easeFactor),
        rating: dto.rating,
        baseDate: dto.reviewedAt ? new Date(dto.reviewedAt) : new Date(),
      });

      progress.repetitionCount = sm2.nextRepetition;
      progress.intervalDays = sm2.nextInterval;
      progress.easeFactor = sm2.nextEaseFactor;
      progress.dueDate = sm2.nextDueDate;
      progress.lastReviewedAt = dto.reviewedAt ? new Date(dto.reviewedAt) : new Date();

      await manager.save(progress);

      await manager.query(
        `INSERT INTO flashcard_study_logs (user_id, flashcard_id, rating, previous_interval, new_interval, previous_ef, new_ef, study_duration_ms, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, cardId, dto.rating, prevInterval, sm2.nextInterval, prevEf, sm2.nextEaseFactor, dto.studyDurationMs || 0, progress.lastReviewedAt],
      );

      await this.touchUserStreak(manager, userId);

      const isMastered = progress.intervalDays > 21 && progress.repetitionCount >= 3;

      return {
        flashcardId: cardId,
        rating: dto.rating,
        repetitionCount: progress.repetitionCount,
        intervalDays: progress.intervalDays,
        easeFactor: progress.easeFactor,
        dueDate: progress.dueDate,
        isMastered,
        message: isMastered ? 'Từ vựng đã đạt cấp độ thành thạo!' : `Hẹn gặp lại từ này sau ${progress.intervalDays} ngày.`,
      };
    });
  }

  private async touchUserStreak(manager: EntityManager, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    let streak = await manager.findOne(UserStreakEntity, { where: { userId } });

    if (!streak) {
      streak = manager.create(UserStreakEntity, { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today });
      return await manager.save(streak);
    }

    if (streak.lastActivityDate === today) return;

    const diffDays = Math.floor((new Date(today).getTime() - new Date(streak.lastActivityDate).getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.longestStreak) streak.longestStreak = streak.currentStreak;
    } else {
      streak.currentStreak = 1;
    }
    streak.lastActivityDate = today;
    await manager.save(streak);
  }
}
```

---

### 🧩 Task 4: Triển khai Controller & Guards

* **Tệp tin khởi tạo:** `src/modules/flashcards/flashcard-srs.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { FlashcardSrsService } from './services/flashcard-srs.service';
import { ReviewCardDto } from './dto/review-card.dto';
import { BatchReviewCardDto } from './dto/batch-review-card.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/student/flashcards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FlashcardSrsController {
  constructor(private readonly srsService: FlashcardSrsService) {}

  @Post(':id/review')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async reviewCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ReviewCardDto,
  ) {
    return await this.srsService.processReview(req.user.sub, id, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (React Native Zustand Store & Rating Buttons)

* **Tệp tin khởi tạo:**
  * `mobile-client/src/stores/useSrsStudyStore.ts`
  * `mobile-client/src/components/SrsRatingButtons.tsx`

```typescript
// mobile-client/src/stores/useSrsStudyStore.ts
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export interface SrsCard {
  id: string;
  term: string;
  definition: string;
}

interface SrsStudyState {
  activeQueue: SrsCard[];
  relearnList: SrsCard[];
  graduatedCount: number;
  currentIndex: number;
  handleRate: (rating: 1 | 2 | 3 | 4) => void;
}

export const useSrsStudyStore = create<SrsStudyState>((set, get) => ({
  activeQueue: [],
  relearnList: [],
  graduatedCount: 0,
  currentIndex: 0,

  handleRate: (rating) => {
    const { activeQueue, currentIndex, relearnList, graduatedCount } = get();
    const currentCard = activeQueue[currentIndex];

    Haptics.impactAsync(rating < 3 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    let updatedQueue = [...activeQueue];
    let updatedRelearn = [...relearnList];
    let newGraduatedCount = graduatedCount;

    if (rating < 3) {
      updatedQueue.push(currentCard);
      if (!updatedRelearn.some((c) => c.id === currentCard.id)) updatedRelearn.push(currentCard);
    } else {
      newGraduatedCount += 1;
    }

    set({
      activeQueue: updatedQueue,
      relearnList: updatedRelearn,
      graduatedCount: newGraduatedCount,
      currentIndex: currentIndex + 1,
    });
  },
}));
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

Before merging Pull Request, verify against the following 4 Pillars:

* [x] **Trụ cột 1: Type Safety & Compilation**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch. Zero `any` trong DTOs, Entities, Services, Controllers, Stores.
* [x] **Trụ cột 2: Integrity & SM-2 Precision**
  * Thuật toán SM-2 tính toán chính xác $EF'$, $n$, $I(n)$, và $due\_date$.
  * Bọc 100% trong `this.dataSource.transaction()` khi ghi progress, logs và touch streak.
* [x] **Trụ cột 3: Bảo mật & RBAC Scope**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.STUDENT, UserRole.ADMIN)`.
  * Khóa tuyệt đối đối với `GUEST` và `TEACHER` (HTTP 403 Forbidden).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
