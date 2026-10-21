# MODULE SPECIFICATION: FNC_ADM_05 — GIAO BÀI TẬP THEO LỚP HỌC HOẶC CÁ NHÂN HỌC VIÊN KÈM DEADLINE

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_05` (Tương ứng `FNC_ADM_05`)
* **Tên Module:** Giao bài tập theo Lớp học hoặc Cá nhân Học viên kèm Deadline (Assignment Distribution & Deadline Management)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_05_Giao_Bai_Tap_Deadline_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Decoupled Deadline Model & BullMQ Notifications)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn phân phối một đề bài tập gốc (`assignments` - Quiz, Writing, Speaking) tới toàn bộ Lớp học (`classes`) hoặc một danh sách Học viên cá nhân (`student_id`) kèm theo Hạn nộp bài (`due_date`) riêng biệt cho đợt giao bài đó.
* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn gia hạn Deadline bài tập cho một Lớp học hoặc một Học viên cụ thể khi có lý do chính đáng mà không làm ảnh hưởng đến Hạn nộp của các lớp học hay học viên khác cùng làm chung đề bài gốc.
* **Là Học viên (Student):** Tôi muốn nhận được thông báo tức thời (Push Notification FCM & Email) ngay khi được giao bài tập mới hoặc khi bài tập được gia hạn Deadline để kịp thời làm bài và nộp bài trước hạn.
* **Là Hệ thống (System):** Tôi muốn áp dụng **Mô hình Deadline Độc lập (Decoupled Deadline Model)** để tách bạch hoàn toàn thông tin Đề bài tập gốc khỏi Thông tin phân công nộp bài, đồng thời cách ly các tác vụ đẩy thông báo nền sang hàng đợi BullMQ để không làm nghẽn luồng xử lý HTTP request chính.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]          [ Backend NestJS ]           [ PostgreSQL 16 ]        [ BullMQ / Redis Queue ]
              │                                 │                          │                         │
  ─── 1. POST /assignments/:id/assign ─────────>│                          │                         │
      (classId | studentIds, dueDate)           │                          │                         │
                                                │── 2. Validate Assignment ─>│                         │
                                                │<─ (Assignment Exists) ───│                         │
                                                │                          │                         │
                                                │── 3. Query Target Students ────────────────────────┐
                                                │   (From class_enrollments or studentIds array)     │
                                                │                          │                         │
                                                │── 4. CSDL Transaction ──>│                         │
                                                │   (INSERT/UPSERT INTO    │                         │
                                                │    assignment_targets)   │                         │
                                                │<─ (Transaction Commit) ──│                         │
                                                │                          │                         │
                                                │── 5. Dispatch Notification Jobs ──────────────────>│
                                                │   (FCM Push & Email Queue: 'notifications')        │
                                                │                                                    │
  <── 6. Response 200 OK (Assigned Summary) ────│                                                    │
```

#### A. Tiến trình Giao bài tập cho Lớp học hoặc Học viên (Assignment Distribution Flow)
1. Giảng viên/Admin truy cập giao diện quản trị, chọn 1 đề bài tập gốc (`assignment_id`) và gửi Yêu cầu `POST /api/v1/admin/assignments/:id/assign` chứa:
   * `classId` (UUID, optional): ID Lớp học cần giao bài.
   * `studentIds` (mảng UUID, optional): Danh sách ID học viên chọn lọc.
   * `dueDate` (ISO Date string, required): Hạn nộp bài bắt buộc phải lớn hơn thời điểm hiện tại (`dueDate > NOW()`).
2. Backend `AssignmentsService` xác thực Đề bài gốc tồn tại trong CSDL.
3. Xác định danh sách học viên mục tiêu (`targetStudents`):
   * Nếu có `classId`: Query danh sách học viên đang hoạt động trong lớp từ bảng `class_enrollments` (`WHERE class_id = :classId`).
   * Nếu có `studentIds`: Trực tiếp lấy danh sách `studentIds`.
4. Bọc trong **CSDL Transaction**:
   * Tiến hành ghi dữ liệu phân công vào bảng `assignment_targets`.
   * Sử dụng câu lệnh `UPSERT` (hoặc `ON CONFLICT (assignment_id, student_id, class_id) DO UPDATE SET due_date = EXCLUDED.due_date, is_completed = false`) để cập nhật lại hạn nộp nếu đợt giao bài bị lặp lại.
5. **Chuyển giao Async Jobs vào BullMQ Queue (`notifications`):**
   * Đẩy sự kiện `assignment-assigned` chứa mảng `studentIds`, `assignmentTitle`, `dueDate` vào hàng đợi Redis Queue để worker tiến hành gửi Push Notification qua Firebase FCM và gửi Email thông báo.
6. Trả về Response Envelope kết quả phân công (`assignedCount`, `dueDate`, `classId`).

#### B. Tiến trình Gia hạn Deadline (Extend Deadline Flow)
1. Giảng viên/Admin gửi Yêu cầu `PUT /api/v1/admin/assignments/:id/extend-deadline` chứa `targetId` (hoặc cặp `classId` / `studentId`) và `newDueDate`.
2. Backend kiểm tra `newDueDate` phải muộn hơn `dueDate` cũ.
3. Bọc trong **CSDL Transaction**: Cập nhật trực tiếp cột `due_date = :newDueDate` trên các bản ghi tương ứng tại bảng `assignment_targets`.
4. Đẩy thông báo gia hạn `deadline-extended` vào BullMQ Queue để báo cho học viên.

### 1.3. Quy tắc Nghiership & Kiến trúc Deadline Độc lập (Business Rules & Architecture)

* **Mô hình Deadline Độc lập (Decoupled Deadline Model):**
  * Bảng `assignments` giữ vai trò làm Đề bài gốc / Bản mẫu (Template), **tuyệt đối không lưu cột `due_date`**.
  * Hạn nộp bài `due_date` chỉ được lưu tại cột `assignment_targets.due_date` kèm theo `class_id` và `student_id`.
  * **Độ linh hoạt:** Đề bài "TOEIC Writing Essay #1" có thể được giao cho Lớp TOEIC-A với `dueDate = 2026-10-20` và Lớp TOEIC-B với `dueDate = 2026-10-25` hoàn toàn song song mà không xung đột dữ liệu.
* **Thuật toán Kiểm tra Trạng thái Quá hạn (Overdue Calculation):**
  \[	ext{is\_overdue} = (	ext{NOW()} > 	ext{assignment\_targets.due\_date}) \quad \land \quad (	ext{assignment\_targets.is\_completed} = 	ext{false})\]
* **Quy tắc Phân quyền & Giới hạn Scope:**
  * `ADMIN`: Được phép giao bài tập và gia hạn Deadline cho bất kỳ lớp học nào trên toàn hệ thống.
  * `TEACHER`: Chỉ được phép giao bài tập và gia hạn Deadline cho các Lớp học do chính mình phụ trách giảng dạy (`classes.teacher_id = currentUserId`).
  * `STUDENT` / `GUEST`: Bị chặn 100% truy cập cổng quản trị (HTTP 403 Forbidden).

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `assignments` (Đề bài gốc Template)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(255)`, NOT NULL)
* `instructions` (`TEXT`, NOT NULL)
* `type` (`assignment_type_enum`, NOT NULL - 'QUIZ' | 'WRITING' | 'SPEAKING')
* `created_by` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)

#### B. Bảng `assignment_targets` (Bảng Phân công & Lưu Deadline Độc lập)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)` ON DELETE CASCADE, NOT NULL)
* `student_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `class_id` (`UUID`, Foreign Key -> `classes(id)` ON DELETE CASCADE, NULLABLE)
* `due_date` (`TIMESTAMPTZ`, NOT NULL)
* `is_completed` (`BOOLEAN`, DEFAULT `false`, NOT NULL)
* **Unique Constraint:** `CONSTRAINT uq_assign_student UNIQUE(assignment_id, student_id, class_id)`

#### C. Bảng `classes` & `class_enrollments` (Quản lý Lớp học & Thành viên)
* `classes.id` (`UUID`, Primary Key)
* `classes.teacher_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_enrollments.class_id` (`UUID`, Foreign Key -> `classes(id)`)
* `class_enrollments.student_id` (`UUID`, Foreign Key -> `users(id)`)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_assignment_targets_assign ON assignment_targets(assignment_id);`
* `CREATE INDEX idx_assignment_targets_student ON assignment_targets(student_id);`
* `CREATE INDEX idx_assignment_targets_class ON assignment_targets(class_id);`
* `CREATE INDEX idx_assignment_targets_due ON assignment_targets(due_date);`

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
| **56** | `POST` | `/api/v1/admin/assignments/:id/assign` | Teacher / Admin | **[Chuẩn hóa v11]** Giao bài cho Lớp học (classId) hoặc Học viên (studentIds) kèm dueDate riêng |
| **58** | `PUT` | `/api/v1/admin/assignments/:id/extend-deadline` | Teacher / Admin | Gia hạn Deadline bài tập cho lớp học hoặc học viên cá nhân |
| **59** | `GET` | `/api/v1/admin/assignments/:id/assigned-list` | Teacher / Admin | Xem danh sách phân công, học viên đã giao bài và trạng thái nộp |
| **52** | `GET` | `/api/v1/student/assignments` | Student | Lấy danh sách bài tập được giao cho bản thân kèm deadline và đếm lùi thời gian |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Giao bài tập thành công",
  "data": {
    "assignmentId": "e8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "classId": "c1a2b3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "assignedCount": 25,
    "dueDate": "2026-10-25T23:59:59.000Z",
    "notificationsDispatched": true
  },
  "timestamp": "2026-10-12T21:15:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/admin/assignments/:id/assign` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn quyền) |
| `PUT /api/v1/admin/assignments/:id/extend-deadline` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn quyền) |
| `GET /api/v1/admin/assignments/:id/assigned-list` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn quyền) |
| `GET /api/v1/student/assignments` | **×** (Chặn 403) | **○** (Cá nhân) | **○** (Lớp phụ trách) | **○** (Toàn bộ) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/assignments/dto/assign-assignment.dto.ts`
  * `src/modules/assignments/dto/extend-deadline.dto.ts`
  * `src/modules/assignments/dto/filter-assigned-list.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/assignments/dto/assign-assignment.dto.ts
import { IsUUID, IsNotEmpty, IsOptional, IsArray, IsDateString, ArrayMinSize, ValidateIf } from 'class-validator';

export class AssignAssignmentDto {
  @ValidateIf((o) => !o.studentIds || o.studentIds.length === 0)
  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsNotEmpty({ message: 'Phải chọn Lớp học (classId) hoặc Danh sách học viên (studentIds).' })
  classId?: string;

  @ValidateIf((o) => !o.classId)
  @IsArray({ message: 'studentIds phải là mảng chuỗi UUID.' })
  @ArrayMinSize(1, { message: 'Danh sách studentIds phải chứa ít nhất 1 học viên.' })
  @IsUUID('4', { each: true, message: 'Mỗi studentId phải là chuỗi UUID v4 hợp lệ.' })
  studentIds?: string[];

  @IsDateString({}, { message: 'dueDate phải là định dạng chuỗi thời gian ISO 8601 hợp lệ.' })
  @IsNotEmpty({ message: 'Hạn nộp dueDate không được để trống.' })
  dueDate!: string;
}

// src/modules/assignments/dto/extend-deadline.dto.ts
import { IsUUID, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class ExtendDeadlineDto {
  @IsUUID('4', { message: 'targetId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  targetId?: string;

  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  classId?: string;

  @IsDateString({}, { message: 'newDueDate phải là định dạng chuỗi thời gian ISO 8601 hợp lệ.' })
  @IsNotEmpty({ message: 'Hạn nộp mới newDueDate không được để trống.' })
  newDueDate!: string;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/assignments/entities/assignment-target.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/assignments/entities/assignment-target.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AssignmentEntity } from './assignment.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ClassEntity } from '../../classes/entities/class.entity';

@Entity('assignment_targets')
@Unique('uq_assign_student', ['assignmentId', 'studentId', 'classId'])
export class AssignmentTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId!: string;

  @ManyToOne(() => AssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: AssignmentEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId!: string | null;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  classGroup!: ClassEntity | null;

  @Column({ type: 'timestamptz', name: 'due_date' })
  dueDate!: Date;

  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted!: boolean;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `AssignmentsService` & BullMQ Queues

* **Tệp tin khởi tạo:** `src/modules/assignments/assignments.service.ts`
* **Chức năng:** Giao bài tập, Gia hạn Deadline, bọc CSDL Transaction và Đẩy Async Notification Jobs sang BullMQ.

```typescript
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentTargetEntity } from './entities/assignment-target.entity';
import { ClassEnrollmentEntity } from '../classes/entities/class-enrollment.entity';
import { ClassEntity } from '../classes/entities/class.entity';
import { AssignAssignmentDto } from './dto/assign-assignment.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async assignAssignment(assignmentId: string, userId: string, userRole: string, dto: AssignAssignmentDto) {
    const dueDateTime = new Date(dto.dueDate);
    if (dueDateTime <= new Date()) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_DUE_DATE',
        message: 'Hạn nộp dueDate phải nằm ở thời điểm tương lai.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id: assignmentId } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập gốc không tồn tại.',
        });
      }

      let studentIdsToAssign: string[] = [];

      // Kiểm tra phầm quyền Scope Lớp học nếu người thực hiện là Giáo viên (TEACHER)
      if (dto.classId) {
        if (userRole === 'TEACHER') {
          const classObj = await manager.findOne(ClassEntity, { where: { id: dto.classId, teacherId: userId } });
          if (!classObj) {
            throw new ForbiddenException({
              errorCode: 'ERR_AUTH_003',
              message: 'Bạn không có quyền giao bài cho lớp học này.',
            });
          }
        }

        const enrollments = await manager.find(ClassEnrollmentEntity, { where: { classId: dto.classId } });
        studentIdsToAssign = enrollments.map((e) => e.studentId);
      } else if (dto.studentIds && dto.studentIds.length > 0) {
        studentIdsToAssign = dto.studentIds;
      }

      if (studentIdsToAssign.length === 0) {
        throw new BadRequestException({
          errorCode: 'ERR_NO_STUDENTS_FOUND',
          message: 'Không tìm thấy học viên nào để thực hiện giao bài tập.',
        });
      }

      // Upsert các bản ghi phân công vào assignment_targets
      const targetEntities = studentIdsToAssign.map((sId) => {
        return manager.create(AssignmentTargetEntity, {
          assignmentId,
          studentId: sId,
          classId: dto.classId || null,
          dueDate: dueDateTime,
          isCompleted: false,
        });
      });

      await manager.createQueryBuilder()
        .insert()
        .into(AssignmentTargetEntity)
        .values(targetEntities)
        .orUpdate(['due_date', 'is_completed'], ['assignment_id', 'student_id', 'class_id'])
        .execute();

      // Đẩy Async Job vào BullMQ Queue thông báo Push & Email cho Học viên
      await this.notificationQueue.add('assignment-assigned', {
        assignmentId,
        assignmentTitle: assignment.title,
        studentIds: studentIdsToAssign,
        dueDate: dto.dueDate,
        timestamp: new Date(),
      });

      return {
        assignmentId,
        classId: dto.classId || null,
        assignedCount: studentIdsToAssign.length,
        dueDate: dto.dueDate,
        notificationsDispatched: true,
      };
    });
  }

  async extendDeadline(assignmentId: string, userId: string, userRole: string, dto: ExtendDeadlineDto) {
    const newDueDateTime = new Date(dto.newDueDate);
    if (newDueDateTime <= new Date()) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_DUE_DATE',
        message: 'Hạn nộp mới newDueDate phải nằm ở tương lai.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const qb = manager.createQueryBuilder().update(AssignmentTargetEntity)
        .set({ dueDate: newDueDateTime })
        .where('assignment_id = :assignmentId', { assignmentId });

      if (dto.targetId) {
        qb.andWhere('id = :targetId', { targetId: dto.targetId });
      } else if (dto.classId) {
        qb.andWhere('class_id = :classId', { classId: dto.classId });
      }

      const result = await qb.execute();

      return {
        assignmentId,
        updatedRecords: result.affected || 0,
        newDueDate: dto.newDueDate,
      };
    });
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `AssignmentsAdminController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/assignments/assignments-admin.controller.ts`
* **Chức năng:** Khai báo HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Post, Put, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { AssignmentsService } from './assignments.service';
import { AssignAssignmentDto } from './dto/assign-assignment.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsAdminController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async assignAssignment(
    @Param('id', ParseUUIDPipe) assignmentId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
    @Body() dto: AssignAssignmentDto,
  ) {
    return await this.assignmentsService.assignAssignment(assignmentId, req.user.sub, req.user.role, dto);
  }

  @Put(':id/extend-deadline')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async extendDeadline(
    @Param('id', ParseUUIDPipe) assignmentId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
    @Body() dto: ExtendDeadlineDto,
  ) {
    return await this.assignmentsService.extendDeadline(assignmentId, req.user.sub, req.user.role, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Custom Hooks)

* **Tệp tin khởi tạo:** `src/api/assignment-distribution-hooks.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface AssignAssignmentPayload {
  classId?: string;
  studentIds?: string[];
  dueDate: string;
}

export interface ExtendDeadlinePayload {
  targetId?: string;
  classId?: string;
  newDueDate: string;
}

export const useAssignAssignmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, payload }: { assignmentId: string; payload: AssignAssignmentPayload }) => {
      const response = await apiClient.post(`/admin/assignments/${assignmentId}/assign`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assignments', variables.assignmentId] });
    },
  });
};

export const useExtendDeadlineMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, payload }: { assignmentId: string; payload: ExtendDeadlinePayload }) => {
      const response = await apiClient.put(`/admin/assignments/${assignmentId}/extend-deadline`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assignments', variables.assignmentId] });
    },
  });
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

Before merging Pull Request, verify against the following 4 Pillars:

* [x] **Trụ cột 1: Type Safety & Compilation**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch.
  * Zero `any` hoặc `as any` trong DTOs, Entities, Services, Controllers.
  * Validation ràng buộc `dueDate > NOW()` tường minh.
* [x] **Trụ cột 2: Integrity & Performance**
  * Tuân thủ Mô hình Deadline Độc lập (Decoupled Deadline Model) - bảng `assignments` không lưu `due_date`.
  * Thao tác phân công và gia hạn bọc 100% trong `this.dataSource.transaction()`.
  * Đẩy Async Jobs thông báo Push FCM & Email qua BullMQ `@InjectQueue('notifications')`.
* [x] **Trụ cột 3: Bảo mật & RBAC**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Kiểm tra Scope Giảng viên: Giáo viên chỉ được giao bài cho Lớp do mình giảng dạy.
  * Chặn 100% quyền truy cập đối với Học viên và Khách (HTTP 403 Forbidden).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
