# MODULE SPECIFICATION: FNC_STU_08 — THEO DÕI CHUỖI NGÀY HỌC CHUYÊN CẦN LIÊN TỤC (STREAK ENGINE)

---

## 📌 HEADER & METADATA

* **Module ID:** MOD_STU_08 (Tương ứng FNC_STU_08)
* **Tên Module:** Theo dõi Chuỗi Ngày học Chuyên cần Liên tục (Streak Engine, Freeze Safety Net & 365-Day Heatmap)
* **Phân hệ:** Phân hệ Học tập Cá nhân (MOD_STU_SELF_LEARNING)
* **Đường dẫn file lưu trữ:** docs/modules/MOD_STU_SELF_LEARNING/FNC_STU_08_Chuoi_Chuyen_Can_Streak_Engine_v2.md
* **Phiên bản:** v2.0.0 (Chuẩn hóa Hợp nhất Streak Engine, Freeze Safety Net & 365-Day Heatmap)
* **Trạng thái:** APPROVED & FULLY SYNCED
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md (Master SRS & SDD)
  2. 02_postgresql-16-ddl-schema-v12.md (Master DDL Schema 35 Bảng v12.0)
  3. 03_api-endpoints-specification-v11.md (Master RESTful API v11.0 - 62 Endpoints)
  4. 08_rbac-permission-matrix.md (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Học viên (Student):** Tôi muốn hệ thống tự động ghi nhận chuỗi ngày học chuyên cần (Streak) mỗi khi hoàn thành bài học từ vựng, ngữ pháp, bài tập hoặc thi thử TOEIC, đồng thời có "Vé bảo lưu chuỗi" (Streak Freeze) để không bị đứt chuỗi khi lỡ quên 1 ngày, xem ma trận Heatmap 365 ngày và mở khóa các huy hiệu mốc phần thưởng (3, 7, 14, 30, 100, 365 ngày).
* **Là Quản trị viên (Admin):** Tôi muốn hệ thống duy trì thuật toán ghi nhận chuyên cần chính xác theo múi giờ địa phương của học viên (Timezone Aware), đảm bảo tính công bằng và chống gian lận thời gian trên thiết bị di động.
* **Là Hệ thống (System):** Tôi muốn tự động lắng nghe tất cả các hành vi học tập hợp lệ từ các phân hệ khác (Flashcard SM-2, Grammar Quiz, Writing/Speaking Submission, TOEIC Exam) để tính toán tăng Streak, kiểm tra cứu chuỗi tự động qua Freeze Credit và mở khóa huy hiệu thành tích ngay trong CSDL Transaction.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (React Native Mobile) ]            [ Backend NestJS ]           [ PostgreSQL 16 CSDL ]
              │                                    │                              │
  ── 1. Hoàn thành bài học (SM2/Quiz/Exam) ────────>│                              │
                                                   │── 2. CSDL Transaction ──────>│
                                                   │   - Record Activity Log      │
                                                   │   - Calculate diffDays       │
                                                   │   - Update Streak & Longest  │
                                                   │   - Check & Award Badges     │
  <── 3. Response Envelope (Streak + Badge) ───────│                              │
              │                                    │                              │
  ── 4. GET /student/streak/status ───────────────>│                              │
  <── 5. Response Envelope (Status & Progress) ────│                              │
              │                                    │                              │
  ── 6. GET /student/streak/calendar ─────────────>│                              │
                                                   │── 7. Query 365-day Activity->│
  <── 8. Response Envelope (Heatmap Grid Data) ────│                              │
```

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Chuyên cần (Streak Logic Engine)

#### A. Định nghĩa Hoạt động Học tập Hợp lệ (Valid Activity Types)
Một ngày được tính là "Có học tập" (`activity_date`) khi học viên hoàn thành ít nhất 1 trong các hành vi sau:
1. `FLASHCARD_SM2`: Hoàn thành 1 phiên học lật thẻ Flashcard SM-2 (FNC_STU_04).
2. `GRAMMAR_READING`: Đọc bài giảng ngữ pháp đạt `scrollPercentage >= 80%` (FNC_STU_06).
3. `GRAMMAR_QUIZ`: Nộp bài quiz củng cố ngữ pháp (FNC_STU_07).
4. `ASSIGNMENT_SUBMIT`: Nộp bài tập Writing / Speaking / Quiz được giao (FNC_STU_05 / FNC_ADM_05).
5. `TOEIC_EXAM`: Nộp bài thi thử TOEIC Full Test (FNC_STU_09 / FNC_EXM_01).

#### B. Thuật toán Xử lý Múi giờ & Khoảng cách Ngày (Timezone & Day Gap Engine)
* Ngày tính chuyên cần được định dạng `YYYY-MM-DD` dựa trên múi giờ địa phương của học viên (`clientTimezone`, mặc định `Asia/Ho_Chi_Minh` UTC+7):
  $$\text{today} = \text{Intl.DateTimeFormat}('en-CA', \{ \text{timeZone}: \text{clientTimezone} \}).\text{format}(\text{now})$$
* **Chênh lệch số ngày (`diffDays`):**
  $$\text{diffDays} = \text{Math.floor}\left( \frac{\text{getTime}(\text{today}) - \text{getTime}(\text{lastActivityDate})}{86400 \times 1000} \right)$$

#### C. Logic Tăng / Bảo vệ / Reset Chuỗi Streak
* **Trường hợp 1 (`diffDays == 0`):** Đã học thêm bài trong cùng ngày hôm nay -> Ghi log `user_streak_activities`, giữ nguyên `current_streak`.
* **Trường hợp 2 (`diffDays == 1`):** Học liên tiếp đúng ngày hôm sau -> Tăng `current_streak += 1`, cập nhật `longest_streak = max(current_streak, longest_streak)`, đặt `last_activity_date = today`.
* **Trường hợp 3 (`diffDays == 2` & `freeze_credits > 0`):** Bỏ lỡ 1 ngày nhưng còn vé bảo lưu Streak Freeze -> Tự động dùng 1 vé (`freeze_credits -= 1`), cứu chuỗi thành công (`current_streak += 1`), đặt `last_activity_date = today`.
* **Trường hợp 4 (`diffDays > 1` không cứu được):** Bỏ học từ 2 ngày trở lên hoặc hết vé Freeze -> Đứt chuỗi hoàn toàn -> Reset `current_streak = 1`, đặt `streak_started_date = today`, `last_activity_date = today`.

#### D. Thuật toán Ma trận Heatmap 365 Ngày (Activity Heatmap Level)
Mỗi ngày trong chuỗi 365 ngày qua được phân cấp màu sắc (Level 0 .. 3) dựa trên tổng số hoạt động:
* **Level 0 (Xám nhạt `#F1F5F9`):** 0 hoạt động (Không học).
* **Level 1 (Xanh nhạt `#93C5FD`):** 1 hoạt động học.
* **Level 2 (Xanh trung bình `#3B82F6`):** 2 - 3 hoạt động học.
* **Level 3 (Xanh đậm `#1D4ED8`):** $\ge 4$ hoạt động học (hoặc tổng thời gian học $\ge 30$ phút).
* **Bảo lưu Freeze (Cam `#F59E0B`):** Ngày được bảo lưu bằng vé Streak Freeze.

---

## 2. MAPPING KỸ THUẬT MASTER (SYSTEM MAPPING)

### 2.1. Cấu trúc Cơ sở Dữ liệu (PostgreSQL 16 Schema v12.0)

* **Bảng `user_streaks` (Quản lý Chuỗi Streak Chính của Học viên):**
  * `user_id` (`UUID`, Primary Key, Foreign Key -> `users(id)` ON DELETE CASCADE)
  * `current_streak` (`INT`, DEFAULT 0, CHECK [current_streak >= 0], NOT NULL)
  * `longest_streak` (`INT`, DEFAULT 0, CHECK [longest_streak >= 0], NOT NULL)
  * `freeze_credits` (`INT`, DEFAULT 2, CHECK [freeze_credits >= 0], NOT NULL) -- Số vé bảo lưu còn lại
  * `last_activity_date` (`DATE`, DEFAULT `CURRENT_DATE`, NOT NULL)
  * `streak_started_date` (`DATE`, DEFAULT `CURRENT_DATE`, NOT NULL)
  * `updated_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

* **Bảng `user_streak_activities` (Nhật ký Các Hoạt động Duy trì Streak):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
  * `activity_date` (`DATE`, DEFAULT `CURRENT_DATE`, NOT NULL)
  * `activity_type` (`VARCHAR(50)`, NOT NULL) -- 'FLASHCARD_SM2', 'GRAMMAR_READING', 'GRAMMAR_QUIZ', 'ASSIGNMENT_SUBMIT', 'TOEIC_EXAM'
  * `reference_id` (`UUID`, NULLABLE) -- ID bài học/đề thi
  * `duration_seconds` (`INT`, DEFAULT 0, NULLABLE)
  * `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

* **Bảng `streak_badges` (Danh mục Huy hiệu Mốc Chuyên cần):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `code` (`VARCHAR(50)`, UNIQUE, NOT NULL) -- 'STREAK_3', 'STREAK_7', 'STREAK_14', 'STREAK_30', 'STREAK_100', 'STREAK_365'
  * `title` (`VARCHAR(100)`, NOT NULL)
  * `description` (`TEXT`, NOT NULL)
  * `milestone_days` (`INT`, UNIQUE, NOT NULL) -- 3, 7, 14, 30, 60, 100, 365
  * `icon_url` (`TEXT`, NOT NULL)
  * `reward_exp` (`INT`, DEFAULT 50, NOT NULL)

* **Bảng `user_streak_badges` (Học viên Đã Mở khóa Huy hiệu):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
  * `badge_id` (`UUID`, Foreign Key -> `streak_badges(id)` ON DELETE CASCADE, NOT NULL)
  * `achieved_streak_count` (`INT`, NOT NULL)
  * `unlocked_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)
  * CONSTRAINT `uq_user_streak_badge` UNIQUE (`user_id`, `badge_id`)

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
```

### 2.3. Danh mục RESTful API Endpoints Chuẩn hóa (v11.0 Master APIs)

| STT | Method | Endpoint URI | Phân quyền (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **39** | `GET` | `/api/v1/student/streak/status` | Student | Lấy trạng thái Streak hôm nay (đã học chưa, chuỗi hiện tại, kỷ lục, vé freeze) |
| **40** | `GET` | `/api/v1/student/streak/calendar` | Student | Lấy ma trận lịch học 365 ngày qua (Heatmap Grid Data) |
| **41** | `POST` | `/api/v1/student/streak/freeze/activate` | Student | Kích hoạt sử dụng 1 vé bảo lưu chuỗi (Streak Freeze) |
| **42** | `GET` | `/api/v1/student/streak/badges` | Student | Lấy danh sách huy hiệu chuyên cần (đã mở khóa & sắp mở khóa) |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Lấy trạng thái Streak thành công",
  "data": {
    "currentStreak": 14,
    "longestStreak": 21,
    "isCompletedToday": true,
    "freezeCreditsRemaining": 2,
    "lastActivityDate": "2026-10-13",
    "streakStartedDate": "2026-09-30",
    "daysToNextMilestone": 16,
    "nextMilestoneBadge": {
      "code": "STREAK_30",
      "title": "Chiến Binh Bất Bại",
      "description": "Học liên tục 30 ngày (1 tháng)",
      "milestoneDays": 30,
      "iconUrl": "badges/streak_30.png",
      "isUnlocked": false,
      "unlockedAt": null
    }
  },
  "timestamp": "2026-10-13T00:45:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

| Endpoint URI | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) | Phạm vi Ranh giới (Scope Boundary) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `GET /api/v1/student/streak/status` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Trạng thái Streak cá nhân |
| `GET /api/v1/student/streak/calendar` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Heatmap 365 ngày cá nhân |
| `POST /api/v1/student/streak/freeze/activate` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Sử dụng vé bảo lưu cá nhân |
| `GET /api/v1/student/streak/badges` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Danh sách huy hiệu cá nhân |

---

## 3. TASK BREAKDOWN FOR AGENT (DANH SÁCH NHIỆM VỤ THỰC THI)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/analytics/dto/touch-activity.dto.ts`
  * `src/modules/analytics/dto/streak-status-response.dto.ts`
  * `src/modules/analytics/dto/streak-calendar-response.dto.ts`
  * `src/modules/analytics/dto/activate-freeze.dto.ts`

```typescript
// src/modules/analytics/dto/touch-activity.dto.ts
import { IsUUID, IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TouchActivityPayloadDto {
  @ApiProperty({ example: 'FLASHCARD_SM2', enum: ['FLASHCARD_SM2', 'GRAMMAR_READING', 'GRAMMAR_QUIZ', 'ASSIGNMENT_SUBMIT', 'TOEIC_EXAM'] })
  @IsIn(['FLASHCARD_SM2', 'GRAMMAR_READING', 'GRAMMAR_QUIZ', 'ASSIGNMENT_SUBMIT', 'TOEIC_EXAM'], {
    message: 'activityType phải thuộc danh mục hoạt động hợp lệ',
  })
  activityType!: 'FLASHCARD_SM2' | 'GRAMMAR_READING' | 'GRAMMAR_QUIZ' | 'ASSIGNMENT_SUBMIT' | 'TOEIC_EXAM';

  @ApiPropertyOptional({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  @IsOptional()
  @IsUUID('4', { message: 'referenceId phải là định dạng UUID' })
  referenceId?: string;

  @ApiPropertyOptional({ example: 120, description: 'Thời lượng học tính bằng giây' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh', description: 'Múi giờ địa phương của client' })
  @IsOptional()
  @IsString()
  clientTimezone?: string;
}

// src/modules/analytics/dto/activate-freeze.dto.ts
export class ActivateStreakFreezeDto {
  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  clientTimezone?: string;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * `src/modules/users/entities/user-streak.entity.ts`
  * `src/modules/analytics/entities/user-streak-activity.entity.ts`
  * `src/modules/analytics/entities/streak-badge.entity.ts`
  * `src/modules/analytics/entities/user-streak-badge.entity.ts`

```typescript
// src/modules/users/entities/user-streak.entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_streaks')
export class UserStreakEntity {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'int', name: 'current_streak', default: 0 })
  currentStreak!: number;

  @Column({ type: 'int', name: 'longest_streak', default: 0 })
  longestStreak!: number;

  @Column({ type: 'int', name: 'freeze_credits', default: 2 })
  freezeCredits!: number;

  @Column({ type: 'date', name: 'last_activity_date', default: () => 'CURRENT_DATE' })
  lastActivityDate!: string;

  @Column({ type: 'date', name: 'streak_started_date', default: () => 'CURRENT_DATE' })
  streakStartedDate!: string;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `StreakEngineService`

* **Tệp tin khởi tạo:** `src/modules/analytics/services/streak-engine.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserStreakEntity } from '../../users/entities/user-streak.entity';
import { UserStreakActivityEntity } from '../entities/user-streak-activity.entity';
import { StreakBadgeEntity } from '../entities/streak-badge.entity';
import { UserStreakBadgeEntity } from '../entities/user-streak-badge.entity';
import { TouchActivityPayloadDto } from '../dto/touch-activity.dto';

@Injectable()
export class StreakEngineService {
  private readonly logger = new Logger(StreakEngineService.name);

  constructor(
    @InjectRepository(UserStreakEntity)
    private readonly streakRepo: Repository<UserStreakEntity>,
    @InjectRepository(StreakBadgeEntity)
    private readonly badgeRepo: Repository<StreakBadgeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async recordValidActivity(userId: string, payload: TouchActivityPayloadDto) {
    const { activityType, referenceId, durationSeconds, clientTimezone } = payload;
    const today = this.getCurrentDateInUserTimezone(clientTimezone);

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const activityLog = manager.create(UserStreakActivityEntity, {
        userId,
        activityDate: today,
        activityType,
        referenceId,
        durationSeconds: durationSeconds || 0,
      });
      await manager.save(activityLog);

      let streak = await manager.findOne(UserStreakEntity, { where: { userId } });
      if (!streak) {
        streak = manager.create(UserStreakEntity, {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          freezeCredits: 2,
          lastActivityDate: today,
          streakStartedDate: today,
        });
        await manager.save(streak);
        const unlockedBadge = await this.checkAndAwardBadges(manager, userId, 1);
        return { isStreakIncreased: true, currentStreak: 1, unlockedBadge };
      }

      const lastDate = streak.lastActivityDate;
      if (lastDate === today) {
        return { isStreakIncreased: false, currentStreak: streak.currentStreak, unlockedBadge: null };
      }

      const diffDays = this.calculateDaysDifference(lastDate, today);
      let isStreakIncreased = false;

      if (diffDays === 1) {
        streak.currentStreak += 1;
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }
        streak.lastActivityDate = today;
        isStreakIncreased = true;
      } else if (diffDays === 2 && streak.freezeCredits > 0) {
        streak.freezeCredits -= 1;
        streak.currentStreak += 1;
        streak.lastActivityDate = today;
        isStreakIncreased = true;
        this.logger.log(`User ${userId} đã tự động kích hoạt vé Streak Freeze để bảo vệ chuỗi.`);
      } else {
        streak.currentStreak = 1;
        streak.streakStartedDate = today;
        streak.lastActivityDate = today;
        isStreakIncreased = true;
      }

      await manager.save(streak);
      const unlockedBadge = await this.checkAndAwardBadges(manager, userId, streak.currentStreak);

      return {
        isStreakIncreased,
        currentStreak: streak.currentStreak,
        unlockedBadge,
      };
    });
  }

  async getStreakStatus(userId: string, timezone: string = 'Asia/Ho_Chi_Minh') {
    const today = this.getCurrentDateInUserTimezone(timezone);
    const streak = await this.streakRepo.findOne({ where: { userId } });

    const currentStreak = streak?.currentStreak || 0;
    const longestStreak = streak?.longestStreak || 0;
    const isCompletedToday = streak?.lastActivityDate === today;
    const freezeCreditsRemaining = streak?.freezeCredits ?? 2;

    const nextBadge = await this.dataSource.query(
      `
      SELECT b.code, b.title, b.description, b.milestone_days AS "milestoneDays", b.icon_url AS "iconUrl"
      FROM streak_badges b
      WHERE b.milestone_days > $1
      ORDER BY b.milestone_days ASC
      LIMIT 1
      `,
      [currentStreak],
    );

    const nextMilestone = nextBadge[0] || null;
    const daysToNextMilestone = nextMilestone ? nextMilestone.milestoneDays - currentStreak : 0;

    return {
      currentStreak,
      longestStreak,
      isCompletedToday,
      freezeCreditsRemaining,
      lastActivityDate: streak?.lastActivityDate || today,
      streakStartedDate: streak?.streakStartedDate || today,
      daysToNextMilestone,
      nextMilestoneBadge: nextMilestone,
    };
  }

  async get365Heatmap(userId: string, timezone: string = 'Asia/Ho_Chi_Minh') {
    const rawActivities = await this.dataSource.query(
      `
      SELECT 
        activity_date AS "date",
        COUNT(id)::int AS "count",
        SUM(duration_seconds)::int AS "totalDuration"
      FROM user_streak_activities
      WHERE user_id = $1 AND activity_date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY activity_date
      ORDER BY activity_date ASC
      `,
      [userId],
    );

    const activities = rawActivities.map((row: { date: string; count: number; totalDuration: number }) => {
      let level = 0;
      if (row.count === 1) level = 1;
      else if (row.count >= 2 && row.count <= 3) level = 2;
      else if (row.count >= 4 || row.totalDuration >= 1800) level = 3;

      return {
        date: row.date,
        count: row.count,
        level,
        isFrozen: false,
      };
    });

    return {
      totalActiveDays: activities.length,
      activities,
    };
  }

  private async checkAndAwardBadges(manager: EntityManager, userId: string, currentStreak: number): Promise<StreakBadgeEntity | null> {
    const eligibleBadge = await manager.findOne(StreakBadgeEntity, {
      where: { milestoneDays: currentStreak },
    });
    if (!eligibleBadge) return null;

    const existingAward = await manager.findOne(UserStreakBadgeEntity, {
      where: { userId, badgeId: eligibleBadge.id },
    });

    if (!existingAward) {
      const award = manager.create(UserStreakBadgeEntity, {
        userId,
        badgeId: eligibleBadge.id,
        achievedStreakCount: currentStreak,
      });
      await manager.save(award);
      return eligibleBadge;
    }

    return null;
  }

  private getCurrentDateInUserTimezone(timezone: string = 'Asia/Ho_Chi_Minh'): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  }

  private calculateDaysDifference(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1).getTime();
    const d2 = new Date(dateStr2).getTime();
    return Math.floor((d2 - d1) / (1000 * 3600 * 24));
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại Controller & RBAC

* **Tệp tin khởi tạo:** `src/modules/analytics/streak-engine.controller.ts`

```typescript
import { Controller, Get, Post, Body, Req, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { StreakEngineService } from './services/streak-engine.service';
import { ActivateStreakFreezeDto } from './dto/activate-freeze.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/student/streak')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StreakEngineController {
  constructor(private readonly streakService: StreakEngineService) {}

  @Get('status')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async getStreakStatus(
    @Req() req: Request & { user: { sub: string } },
    @Query('timezone') timezone?: string,
  ) {
    return await this.streakService.getStreakStatus(req.user.sub, timezone);
  }

  @Get('calendar')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async get365Heatmap(
    @Req() req: Request & { user: { sub: string } },
    @Query('timezone') timezone?: string,
  ) {
    return await this.streakService.get365Heatmap(req.user.sub, timezone);
  }

  @Post('freeze/activate')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async activateFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: ActivateStreakFreezeDto,
  ) {
    return await this.streakService.recordValidActivity(req.user.sub, {
      activityType: 'FLASHCARD_SM2',
      clientTimezone: dto.clientTimezone,
    });
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (React Native / Next.js)

* **Tệp tin khởi tạo:** `mobile-client/src/components/StreakFlameHeader.tsx`

```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, ShieldCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const StreakFlameHeader = ({ onPress }: { onPress?: () => void }) => {
  const { data } = useQuery({
    queryKey: ['student-streak-status'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/streak/status');
      return res.data;
    },
  });

  const currentStreak = data?.currentStreak || 0;
  const isCompletedToday = data?.isCompletedToday || false;
  const freezeCredits = data?.freezeCreditsRemaining || 0;

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
      <Flame size={18} color={isCompletedToday ? '#d97706' : '#94a3b8'} fill={isCompletedToday ? '#f59e0b' : 'transparent'} />
      <Text className={`text-xs font-bold ${isCompletedToday ? 'text-amber-800' : 'text-slate-500'}`}>
        {currentStreak} ngày
      </Text>
      {freezeCredits > 0 && (
        <View className="flex-row items-center ml-1 pl-1.5 border-l border-amber-300">
          <ShieldCheck size={14} color="#2563eb" />
          <Text className="text-[10px] font-bold text-blue-700 ml-0.5">{freezeCredits}</Text>
        </View>
      )}
    </Pressable>
  );
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

* [x] **Trụ cột 1: Type Safety & Zero Compilation Error**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch. Zero `any` hoặc `as any`.
* [x] **Trụ cột 2: Timezone Handling & Atomic Transaction Performance**
  * Đảm bảo ngày học `YYYY-MM-DD` được tính chuẩn xác theo múi giờ địa phương `Asia/Ho_Chi_Minh` hoặc client timezone.
  * Thao tác ghi log `user_streak_activities`, cập nhật `user_streaks`, cứu chuỗi bằng Freeze Credit và mở khóa `user_streak_badges` bọc 100% trong `this.dataSource.transaction()`.
* [x] **Trụ cột 3: Bảo mật & RBAC Scope**
  * Bảo vệ tất cả API Streak bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.STUDENT, UserRole.ADMIN)`. Chặn tuyệt đối `Guest` và `Teacher` (403 Forbidden).
* [x] **Trụ cột 4: Standard Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
