# MODULE SPECIFICATION: FNC_ADM_11 — CẢNH BÁO TỰ ĐỘNG HỌC VIÊN NỘP MUỘN, CHƯA LÀM BÀI HOẶC ĐIỂM TỤT DỐC

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_11` (Tương ứng `FNC_ADM_11`)
* **Tên Module:** Hệ thống Cảnh báo Sớm Rủi ro Học tập Tự động & Quản lý Nhắc nhở Học viên (Early Academic Risk Detection & Automated Alert Engine)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_11_Canh_Bao_Tu_Dong_Hoc_Vien_v3.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Cron Workers, Academic Risk Models & BullMQ Bulk Remind)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn hệ thống tự động quét và phát hiện các học viên gặp rủi ro trong học tập (quá hạn nộp bài, đứt chuỗi chuyên cần, điểm số tụt dốc) để hiển thị danh sách cảnh báo tập trung theo từng lớp học.
* **Là Giảng viên (Teacher):** Tôi muốn gửi thông báo nhắc nhở 1-chạm (`1-Click Bulk Remind`) tới danh sách nhiều học viên nộp muộn bài tập thông qua Push Notification Firebase FCM và Email để thúc giục học viên hoàn thành nhiệm vụ.
* **Là Giảng viên (Teacher):** Tôi muốn đánh giá và mở cờ gỡ cảnh báo (`resolveAlert`) sau khi đã trao đổi can thiệp trực tiếp với học viên để theo dõi chính xác danh sách các trường hợp còn tồn đọng.
* **Là Hệ thống (System / Cron Worker):** Tôi muốn chạy các tiến trình quét ngầm định kỳ (Background Cron Jobs) vào khung giờ cố định đêm/sáng sớm để tự động tạo bản ghi trong bảng `student_academic_alerts` và tự động gỡ cờ khi học viên hoàn thành bài tập, đồng thời áp dụng cơ chế chống spam cảnh báo trùng lặp.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

#### A. Tiến trình Tự động Quét Cảnh báo Hằng ngày (Background Cron Job Flow)
```text
[ Cron Scheduler (08:00 & 20:00 Daily) ]     [ AcademicRiskWorker NestJS ]          [ PostgreSQL 16 ]             [ BullMQ / FCM ]
                   │                                     │                                  │                             │
  ─── 1. Trigger Cron Scan ─────────────────────>│                                  │                             │
                                                         │── 2. Scan Overdue & Risk ───────>│                             │
                                                         │      (t.due_date < NOW())        │                             │
                                                         │<─ (Overdue / Risk Students) ─────│                             │
                                                         │                                  │                             │
                                                         │── 3. Insert Alert Records ──────>│                             │
                                                         │      (INSERT student_alerts)     │                             │
                                                         │<─ (Alerts Created) ──────────────│                             │
                                                         │                                  │                             │
                                                         │── 4. Dispatch Async Push Job ─────────────────────────────────>│
                                                         │      (send-overdue-alert)                                      │
```

#### B. Tiến trình Lọc Cảnh báo Lớp học & Nhắc nhở 1-Chạm (Teacher Bulk Remind Flow)
```text
[ Client (Web Admin Portal Next.js) ]           [ Backend NestJS ]            [ PostgreSQL 16 ]             [ BullMQ Queue ]
                 │                                       │                           │                            │
  ── 1. GET /api/v1/admin/classes/:id/alerts ───────────>│                           │                            │
                                                         │── 2. Check Teacher Role ─>│                            │
                                                         │<─ (Alerts List) ──────────│                            │
  <── 3. Response 200 OK (Alerts Array) ─────────────────│                           │                            │
                 │                                       │                           │                            │
  ── 4. POST /api/v1/admin/alerts/bulk-remind ──────────>│                           │                            │
      (alertIds: [uuid1, uuid2, ...])                    │── 5. Query Alert Details >│                            │
                                                         │<─ (Student & Task IDs) ───│                            │
                                                         │                                                        │
                                                         │── 6. Push Bulk Remind Jobs to Queue ──────────────────>│
                                                         │      (bulk-remind-notification)                        │
  <── 7. Response 200 OK (Processed Count) ──────────────│                                                        │
```

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Phát hiện Rủi ro Học tập (Risk Detection Models)

Hệ thống định kỳ thực thi 3 Mô hình Quét Cảnh báo Tự động:

#### Mô hình 1: Cảnh báo Quá hạn Nộp bài (`OVERDUE_TASK`)
* **Thời điểm quét:** Chạy định kỳ lúc `08:00 AM` hằng ngày.
* **Điều kiện nhận diện:**
  * Học viên có bản ghi trong `assignment_targets` thỏa mãn:
    \\[\text{due\_date} < \text{NOW}() \quad \land \quad \text{is\_completed} = \text{false}\\]
  * **Chống Spam Cảnh báo (Anti-Spam Rule):** Chưa tồn tại bản ghi cảnh báo cùng loại cho bài tập này:
    \\[\text{NOT EXISTS} \left( \text{student\_academic\_alerts WHERE student\_id} = t.\text{student\_id} \land \text{reference\_id} = t.\text{assignment\_id} \land \text{alert\_type} = \text{'OVERDUE\_TASK'} \right)\\]
* **Hành động:** Tạo bản ghi mới trong `student_academic_alerts` với `alert_type = 'OVERDUE_TASK'` và `severity_level = 'WARNING'`.
* **Tự động Gỡ cờ (Auto-Resolve):** Khi học viên nộp bài thành công (`assignment_submissions` có `status = 'SUBMITTED'` hoặc `'GRADED'`), trigger/service tự động cập nhật `is_resolved = true` và `resolved_at = NOW()`.

#### Mô hình 2: Cảnh báo Chuyên cần Đứt chuỗi (`STREAK_AT_RISK`)
* **Thời điểm quét:** Chạy định kỳ lúc `20:00 PM` hằng ngày.
* **Điều kiện nhận diện:**
  * Học viên đang có chuỗi học tập `current_streak \ge 3` trong `user_streaks`.
  * Trong ngày hôm nay chưa thực hiện bất kỳ hoạt động học tập nào (`last_activity_date < CURRENT_DATE`) và không có vé bảo lưu `freeze_tickets_available = 0`.
* **Hành động:** Tạo bản ghi cảnh báo với `alert_type = 'STREAK_AT_RISK'`, `severity_level = 'CRITICAL'`.

#### Mô hình 3: Cảnh báo Tụt dốc Phong độ (`PERFORMANCE_DROP`)
* **Thời điểm quét:** Chạy khi có bài tập vừa được công bố điểm (`status = 'GRADED'`).
* **Điều kiện nhận diện:**
  * Tính điểm trung bình 3 bài làm gần nhất \\(\bar{S}_{\text{recent}}\\).
  * Tính điểm trung bình 10 bài làm trước đó \\(\bar{S}_{\text{history}}\\).
  * Phát cảnh báo nếu điểm trung bình sụt giảm trên 20%:
    \\[\frac{\bar{S}_{\text{history}} - \bar{S}_{\text{recent}}}{\bar{S}_{\text{history}}} > 0.20 \quad (20\%)\\]
* **Hành động:** Tạo bản ghi cảnh báo với `alert_type = 'PERFORMANCE_DROP'`, `severity_level = 'WARNING'`.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `student_academic_alerts` (Cảnh báo Rủi ro Học tập)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `student_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `class_id` (`UUID`, Foreign Key -> `classes(id)` ON DELETE CASCADE, NULLABLE)
* `alert_type` (`alert_type_enum`, NOT NULL - 'OVERDUE_TASK' | 'STREAK_AT_RISK' | 'PERFORMANCE_DROP' | 'ABSENTEEISM')
* `severity_level` (`alert_severity_enum`, DEFAULT `'WARNING'`, NOT NULL - 'INFO' | 'WARNING' | 'CRITICAL')
* `message` (`TEXT`, NOT NULL)
* `reference_id` (`UUID`, NULLABLE - Tham chiếu tới `assignment_id` hoặc `submission_id`)
* `is_resolved` (`BOOLEAN`, DEFAULT `false`, NOT NULL)
* `resolved_at` (`TIMESTAMPTZ`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignment_targets` (Phân công Bài tập & Hạn nộp)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)`)
* `due_date` (`TIMESTAMPTZ`, NOT NULL)
* `is_completed` (`BOOLEAN`, DEFAULT `false`, NOT NULL)

#### C. Bảng `classes` (Lớp học)
* `id` (`UUID`, Primary Key)
* `name` (`VARCHAR(150)`, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)`)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_alerts_student ON student_academic_alerts(student_id, is_resolved);`
* `CREATE INDEX idx_alerts_class ON student_academic_alerts(class_id, created_at DESC);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE alert_type_enum AS ENUM ('OVERDUE_TASK', 'STREAK_AT_RISK', 'PERFORMANCE_DROP', 'ABSENTEEISM');
CREATE TYPE alert_severity_enum AS ENUM ('INFO', 'WARNING', 'CRITICAL');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md` & `FNC_ADM_11_Canh_Bao_Tu_Dong_Hoc_Vien_v3.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `GET` | `/api/v1/admin/classes/:id/alerts` | Teacher / Admin | Lấy danh sách cảnh báo học viên trong lớp theo classId, alertType, isResolved |
| **2** | `POST` | `/api/v1/admin/alerts/bulk-remind` | Teacher / Admin | Gửi thông báo nhắc nhở 1-chạm (Push FCM + Email) cho danh sách học viên |
| **3** | `PUT` | `/api/v1/admin/alerts/:id/resolve` | Teacher / Admin | Đánh dấu cảnh báo đã được giáo viên can thiệp xử lý (`is_resolved = true`) |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Lấy danh sách cảnh báo thành công",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "studentId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "studentName": "Nguyễn Văn A",
      "studentEmail": "studenta@toeic.edu.vn",
      "classId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
      "alertType": "OVERDUE_TASK",
      "severityLevel": "WARNING",
      "message": "Học viên chưa nộp bài tập 'TOEIC Writing Part 3' đúng hạn.",
      "referenceId": "d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a",
      "isResolved": false,
      "createdAt": "2026-10-12T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "unresolvedCount": 8
  },
  "timestamp": "2026-10-12T23:30:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/admin/classes/:id/alerts` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp phụ trách) | **○** (Toàn trường) |
| `POST /api/v1/admin/alerts/bulk-remind` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp phụ trách) | **○** (Toàn trường) |
| `PUT /api/v1/admin/alerts/:id/resolve` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp phụ trách) | **○** (Toàn trường) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/alerts/dto/filter-class-alerts.dto.ts`
  * `src/modules/alerts/dto/bulk-remind-alerts.dto.ts`
  * `src/modules/alerts/dto/resolve-alert.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/alerts/dto/filter-class-alerts.dto.ts
import { IsOptional, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum AlertTypeEnum {
  OVERDUE_TASK = 'OVERDUE_TASK',
  STREAK_AT_RISK = 'STREAK_AT_RISK',
  PERFORMANCE_DROP = 'PERFORMANCE_DROP',
  ABSENTEEISM = 'ABSENTEEISM',
}

export enum AlertSeverityEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export class FilterClassAlertsDto {
  @IsEnum(AlertTypeEnum, { message: 'alertType không hợp lệ.' })
  @IsOptional()
  alertType?: AlertTypeEnum;

  @IsEnum(AlertSeverityEnum, { message: 'severityLevel không hợp lệ.' })
  @IsOptional()
  severityLevel?: AlertSeverityEnum;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isResolved?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

// src/modules/alerts/dto/bulk-remind-alerts.dto.ts
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class BulkRemindAlertsDto {
  @IsArray({ message: 'alertIds phải là mảng các chuỗi UUID.' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 cảnh báo để gửi nhắc nhở.' })
  @IsUUID('4', { each: true, message: 'Mỗi alertId phải là chuỗi UUID v4 hợp lệ.' })
  alertIds!: string[];
}

// src/modules/alerts/dto/resolve-alert.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ResolveAlertDto {
  @IsString()
  @IsOptional()
  note?: string;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/alerts/entities/student-academic-alert.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/alerts/entities/student-academic-alert.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ClassEntity } from '../../classes/entities/class.entity';

@Entity('student_academic_alerts')
@Index('idx_alerts_student', ['studentId', 'isResolved'])
@Index('idx_alerts_class', ['classId', 'createdAt'])
export class StudentAcademicAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId!: string | null;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class!: ClassEntity | null;

  @Column({ type: 'enum', enum: ['OVERDUE_TASK', 'STREAK_AT_RISK', 'PERFORMANCE_DROP', 'ABSENTEEISM'], name: 'alert_type' })
  alertType!: 'OVERDUE_TASK' | 'STREAK_AT_RISK' | 'PERFORMANCE_DROP' | 'ABSENTEEISM';

  @Column({ type: 'enum', enum: ['INFO', 'WARNING', 'CRITICAL'], name: 'severity_level', default: 'WARNING' })
  severityLevel!: 'INFO' | 'WARNING' | 'CRITICAL';

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'uuid', name: 'reference_id', nullable: true })
  referenceId!: string | null;

  @Column({ type: 'boolean', name: 'is_resolved', default: false })
  isResolved!: boolean;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Background Cron Worker & AcademicAlertsService

* **Tệp tin khởi tạo:**
  * `src/modules/alerts/workers/academic-risk.worker.ts`
  * `src/modules/alerts/academic-alerts.service.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/alerts/workers/academic-risk.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AcademicRiskWorker {
  private readonly logger = new Logger(AcademicRiskWorker.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notifyQueue: Queue,
  ) {}

  @Cron('0 8 * * *') // 08:00 AM Daily
  async scanOverdueAssignments() {
    this.logger.log('Đang thực thi Cron Job quét bài tập quá hạn chưa nộp...');

    const overdueList = await this.dataSource.query(`
      SELECT 
        t.student_id,
        t.assignment_id,
        t.class_id,
        a.title AS assignment_title,
        u.full_name
      FROM assignment_targets t
      INNER JOIN assignments a ON a.id = t.assignment_id
      INNER JOIN users u ON u.id = t.student_id
      WHERE t.is_completed = false
        AND t.due_date < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM student_academic_alerts al 
          WHERE al.student_id = t.student_id 
            AND al.reference_id = a.id 
            AND al.alert_type = 'OVERDUE_TASK'
        )
    `);

    for (const item of overdueList) {
      await this.dataSource.query(
        `
        INSERT INTO student_academic_alerts 
          (student_id, class_id, alert_type, severity_level, message, reference_id)
        VALUES 
          ($1, $2, 'OVERDUE_TASK', 'WARNING', $3, $4)
        `,
        [
          item.student_id,
          item.class_id,
          `Học viên chưa nộp bài tập "${item.assignment_title}" đúng hạn.`,
          item.assignment_id,
        ],
      );

      await this.notifyQueue.add('send-overdue-alert', {
        studentId: item.student_id,
        assignmentTitle: item.assignment_title,
      });
    }

    this.logger.log(`Hoàn tất Cron Job: Đã ghi nhận ${overdueList.length} trường hợp nộp muộn.`);
  }
}

// src/modules/alerts/academic-alerts.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StudentAcademicAlertEntity } from './entities/student-academic-alert.entity';
import { ClassEntity } from '../classes/entities/class.entity';
import { FilterClassAlertsDto } from './dto/filter-class-alerts.dto';
import { BulkRemindAlertsDto } from './dto/bulk-remind-alerts.dto';

@Injectable()
export class AcademicAlertsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notifyQueue: Queue,
  ) {}

  async getClassAlerts(classId: string, currentUser: { id: string; role: string }, filters: FilterClassAlertsDto) {
    const classInfo = await this.dataSource.getRepository(ClassEntity).findOne({ where: { id: classId } });
    if (!classInfo) {
      throw new NotFoundException({ errorCode: 'ERR_CLASS_NOT_FOUND', message: 'Lớp học không tồn tại.' });
    }

    if (currentUser.role === 'TEACHER' && classInfo.teacherId !== currentUser.id) {
      throw new ForbiddenException({ errorCode: 'ERR_AUTH_003', message: 'Bạn không phụ trách lớp học này.' });
    }

    const qb = this.dataSource
      .getRepository(StudentAcademicAlertEntity)
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.student', 'u')
      .where('a.class_id = :classId', { classId });

    if (filters.alertType) {
      qb.andWhere('a.alert_type = :alertType', { alertType: filters.alertType });
    }

    if (filters.severityLevel) {
      qb.andWhere('a.severity_level = :severityLevel', { severityLevel: filters.severityLevel });
    }

    if (filters.isResolved !== undefined) {
      qb.andWhere('a.is_resolved = :isResolved', { isResolved: filters.isResolved });
    }

    qb.orderBy('a.createdAt', 'DESC');
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const unresolvedCount = await this.dataSource
      .getRepository(StudentAcademicAlertEntity)
      .count({ where: { classId, isResolved: false } });

    return {
      data: items.map((item) => ({
        id: item.id,
        studentId: item.studentId,
        studentName: item.student?.fullName || '',
        studentEmail: item.student?.email || '',
        classId: item.classId,
        alertType: item.alertType,
        severityLevel: item.severityLevel,
        message: item.message,
        referenceId: item.referenceId,
        isResolved: item.isResolved,
        resolvedAt: item.resolvedAt,
        createdAt: item.createdAt,
      })),
      meta: {
        total,
        unresolvedCount,
        page,
        limit,
      },
    };
  }

  async bulkRemindStudents(dto: BulkRemindAlertsDto) {
    const alerts = await this.dataSource.getRepository(StudentAcademicAlertEntity).find({
      where: { id: In(dto.alertIds) },
      relations: ['student'],
    });

    for (const alert of alerts) {
      await this.notifyQueue.add('bulk-remind-notification', {
        alertId: alert.id,
        studentId: alert.studentId,
        studentEmail: alert.student?.email,
        message: alert.message,
      });
    }

    return {
      remindedCount: alerts.length,
      message: `Đã phát lệnh nhắc nhở thành công tới ${alerts.length} học viên.`,
    };
  }

  async resolveAlert(alertId: string) {
    const repository = this.dataSource.getRepository(StudentAcademicAlertEntity);
    const alert = await repository.findOne({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException({ errorCode: 'ERR_ALERT_NOT_FOUND', message: 'Cảnh báo không tồn tại.' });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await repository.save(alert);

    return {
      alertId,
      isResolved: true,
      resolvedAt: alert.resolvedAt,
    };
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `AcademicAlertsAdminController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/alerts/academic-alerts-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { AcademicAlertsService } from './academic-alerts.service';
import { FilterClassAlertsDto } from './dto/filter-class-alerts.dto';
import { BulkRemindAlertsDto } from './dto/bulk-remind-alerts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicAlertsAdminController {
  constructor(private readonly alertsService: AcademicAlertsService) {}

  @Get('classes/:id/alerts')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getClassAlerts(
    @Param('id', ParseUUIDPipe) classId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
    @Query() filters: FilterClassAlertsDto,
  ) {
    return await this.alertsService.getClassAlerts(classId, { id: req.user.sub, role: req.user.role }, filters);
  }

  @Post('alerts/bulk-remind')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async bulkRemindStudents(@Body() dto: BulkRemindAlertsDto) {
    return await this.alertsService.bulkRemindStudents(dto);
  }

  @Put('alerts/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async resolveAlert(@Param('id', ParseUUIDPipe) id: string) {
    return await this.alertsService.resolveAlert(id);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/academic-alerts-hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface ClassAlertsFilterParams {
  alertType?: string;
  severityLevel?: string;
  isResolved?: boolean;
  page?: number;
  limit?: number;
}

export const useClassAlertsQuery = (classId: string, filters: ClassAlertsFilterParams) => {
  return useQuery({
    queryKey: ['admin', 'classes', classId, 'alerts', filters],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/classes/${classId}/alerts`, { params: filters });
      return response.data;
    },
    enabled: !!classId,
  });
};

export const useBulkRemindMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertIds: string[]) => {
      const response = await apiClient.post('/admin/alerts/bulk-remind', { alertIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] });
    },
  });
};

export const useResolveAlertMutation = (classId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiClient.put(`/admin/alerts/${alertId}/resolve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes', classId, 'alerts'] });
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
  * Cron Job quét `assignment_targets.due_date < NOW()` chính xác và áp dụng chống spam cảnh báo trùng lặp.
  * Tác vụ phát tin nhắn nhắc nhở chuyển giao bất đồng bộ qua BullMQ Queue (`@InjectQueue('notifications')`).
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Khóa quyền chỉ cho phép Giáo viên xem cảnh báo của lớp do mình trực tiếp phụ trách.
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, meta, timestamp }`.
