# MODULE SPECIFICATION: FNC_ADM_06 — QUẢN LÝ, TÌM KIẾM VÀ LỌC DANH SÁCH BÀI NỘP CỦA HỌC VIÊN

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_06` (Tương ứng `FNC_ADM_06`)
* **Tên Module:** Quản lý, tìm kiếm và lọc danh sách bài nộp của học viên (Submission Management & Advanced Filtering Dashboard)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_06_Quan_Ly_Loc_Bai_Nop_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Submissions Dashboard & Zero Duplication JOIN)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Giáo viên (Teacher) / Quản trị viên (Admin):** Tôi muốn tìm kiếm, lọc danh sách bài nộp của học viên theo lớp học, bài tập, trạng thái chấm điểm (`SUBMITTED`, `GRADING`, `GRADED`, `REJECTED`) và loại bài tập (`QUIZ`, `WRITING`, `SPEAKING`) để theo dõi tiến độ nộp bài và thực hiện chấm điểm kịp thời.
* **Là Giáo viên (Teacher):** Tôi muốn hệ thống tự động gắn nhãn cảnh báo quá hạn 48h (`isOverdue48h`) cho những bài nộp tự luận chưa được chấm để ưu tiên xử lý các bài làm bị tắc nghẽn.
* **Là Hệ thống (System):** Tôi muốn thực hiện câu lệnh JOIN trực tiếp qua `s.class_id` trên bảng `assignment_submissions` thay vì JOIN qua `class_enrollments`, nhằm loại bỏ hoàn toàn lỗi Cartesian Product / nhân bản dữ liệu khi học viên đăng ký học nhiều lớp.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]          [ Backend NestJS ]           [ PostgreSQL 16 ]
              │                                 │                          │
  ─── 1. GET /api/v1/admin/submissions ────────>│                          │
      (classId, assignmentId, status, type,     │                          │
       search, page, limit)                     │── 2. Build QueryBuilder ─│
                                                │   (JOIN s.class_id)      │
                                                │                          │
                                                │── 3. Execute SELECT ────>│
                                                │   (Filtered & Paginated) │
                                                │<─ (Submissions List) ────│
                                                │                          │
                                                │── 4. Map isOverdue48h ───│
  <── 5. Response 200 OK (Data + Meta) ─────────│                          │
```

#### Tiến trình Lọc & Lấy Danh sách Bài nộp (Submissions Filtering Flow)
1. Giảng viên/Admin truy cập Màn hình Quản lý Bài nộp ADM0301, gửi Yêu cầu `GET /api/v1/admin/submissions` với các tham số query:
   * `classId`: Lọc theo ID lớp học (UUID).
   * `assignmentId`: Lọc theo ID bài tập gốc (UUID).
   * `status`: Lọc theo trạng thái (`SUBMITTED`, `GRADING`, `GRADED`, `REJECTED`).
   * `type`: Lọc theo loại bài tập (`QUIZ`, `WRITING`, `SPEAKING`).
   * `search`: Tìm kiếm theo tên học viên hoặc tên bài tập.
   * `page` / `limit`: Phân trang dữ liệu (Mặc định `page=1`, `limit=20`).
2. Backend NestJS `SubmissionsService` thực thi:
   * Kiểm tra vai trò người dùng: Nếu người dùng là `TEACHER`, tự động thêm điều kiện bắt buộc `c.teacher_id = currentUserId` để cách ly dữ liệu giữa các giảng viên.
   * Sử dụng TypeORM `QueryBuilder` trên bảng `assignment_submissions` (alias `s`).
   * Thực hiện `LEFT JOIN` trực tiếp sang bảng `classes` (alias `c`) qua điều kiện `s.class_id = c.id`.
   * Thực hiện `LEFT JOIN` sang `users` (alias `u`) qua `s.student_id = u.id` và `assignments` (alias `a`) qua `s.assignment_id = a.id`.
3. Tính toán trường ảo `isOverdue48h`:
   * Đơn vị xử lý quét trạng thái `status IN ('SUBMITTED', 'GRADING')` và khoảng thời gian `NOW() - submittedAt > 48 hours`. Nếu thỏa mãn, gắn `isOverdue48h = true`.
4. Trả về kết quả dạng Standard Response Envelope chứa mảng `data` và thông tin phân trang `meta`.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Zero Duplication (Business Rules)

* **Thuật toán Cảnh báo Quá hạn Chấm điểm 48h (Grading SLA 48h Warning):**
  $$\text{isOverdue48h} = (\text{status} \in \{\text{'SUBMITTED'}, \text{'GRADING'}\}) \land (\text{NOW}() - \text{submitted\_at} > 48\text{ hours})$$
* **Giải pháp Khắc phục Lỗi Cartesian Product (Zero Duplication Query):**
  * *Nguyên nhân lỗi cũ:* JOIN qua `class_enrollments` khiến 1 bản ghi bài nộp bị nhân bản thành $N$ dòng nếu học viên đó đang tham gia $N$ lớp học trong trường.
  * *Giải pháp v2.0:* Bảng `assignment_submissions` lưu trực tiếp `class_id`. Câu lệnh SQL QueryBuilder thực thi JOIN trực tiếp:
    $$\text{FROM assignment\_submissions } s \quad \text{LEFT JOIN classes } c \text{ ON } s.\text{class\_id} = c.\text{id}$$
* **Chính sách Phân quyền Dữ liệu Giảng viên (Teacher Data Isolation):**
  * `ADMIN`: Xem được bài nộp của toàn bộ lớp học trên toàn trường.
  * `TEACHER`: Chỉ xem được các bài nộp thuộc các lớp mà mình phụ trách (`classes.teacher_id = userId`).

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `assignment_submissions` (Quản lý Bài nộp của Học viên)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)` ON DELETE CASCADE, NOT NULL)
* `student_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `class_id` (`UUID`, Foreign Key -> `classes(id)` ON DELETE CASCADE, NULLABLE)
* `target_id` (`UUID`, Foreign Key -> `assignment_targets(id)` ON DELETE CASCADE, NULLABLE)
* `submission_text` (`TEXT`, NULLABLE - Bài làm tự luận Writing)
* `audio_file_url` (`TEXT`, NULLABLE - S3 Key bài làm Speaking)
* `duration_seconds` (`INT`, NULLABLE - Thời gian thực hiện bài)
* `status` (`submission_status_enum`, DEFAULT `'SUBMITTED'`, NOT NULL)
* `submitted_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignments` (Đề bài gốc)
* `id` (`UUID`, Primary Key)
* `title` (`VARCHAR(255)`, NOT NULL)
* `type` (`assignment_type_enum`, NOT NULL - 'QUIZ' | 'WRITING' | 'SPEAKING')

#### C. Bảng `classes` (Lớp học)
* `id` (`UUID`, Primary Key)
* `name` (`VARCHAR(150)`, NOT NULL)
* `code` (`VARCHAR(50)`, UNIQUE, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)`, NOT NULL)

#### D. Bảng `users` (Thông tin Học viên)
* `id` (`UUID`, Primary Key)
* `full_name` (`VARCHAR(150)`, NOT NULL)
* `email` (`VARCHAR(255)`, NOT NULL)
* `avatar_url` (`TEXT`, NULLABLE)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_submissions_class_status ON assignment_submissions(class_id, status);`
* `CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);`

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
| **59** | `GET` | `/api/v1/admin/submissions` | Teacher / Admin | **[Thống nhất v11]** Tìm kiếm & Lọc bài nộp theo classId, assignmentId, status, type |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Lấy danh sách bài nộp thành công",
  "data": [
    {
      "id": "f8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "assignmentId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "assignmentTitle": "TOEIC Writing Part 3 Essay",
      "assignmentType": "WRITING",
      "studentId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "studentName": "Nguyễn Văn Học Viên",
      "studentEmail": "student@toeic.edu.vn",
      "classId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
      "className": "Lớp TOEIC Intensive K25",
      "status": "SUBMITTED",
      "isOverdue48h": true,
      "submittedAt": "2026-10-10T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "timestamp": "2026-10-12T21:20:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/admin/submissions` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:** `src/modules/submissions/dto/filter-submissions.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/dto/filter-submissions.dto.ts
import { IsOptional, IsUUID, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SubmissionStatusEnum {
  SUBMITTED = 'SUBMITTED',
  GRADING = 'GRADING',
  GRADED = 'GRADED',
  REJECTED = 'REJECTED',
}

export enum AssignmentTypeEnum {
  QUIZ = 'QUIZ',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

export class FilterSubmissionsDto {
  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  classId?: string;

  @IsUUID('4', { message: 'assignmentId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  assignmentId?: string;

  @IsEnum(SubmissionStatusEnum, { message: 'status phải là SUBMITTED, GRADING, GRADED hoặc REJECTED.' })
  @IsOptional()
  status?: SubmissionStatusEnum;

  @IsEnum(AssignmentTypeEnum, { message: 'type phải là QUIZ, WRITING hoặc SPEAKING.' })
  @IsOptional()
  type?: AssignmentTypeEnum;

  @IsString()
  @IsOptional()
  search?: string;

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
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/submissions/entities/assignment-submission.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/submissions/entities/assignment-submission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AssignmentEntity } from '../../assignments/entities/assignment.entity';
import { ClassEntity } from '../../classes/entities/class.entity';

@Entity('assignment_submissions')
export class AssignmentSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId!: string;

  @ManyToOne(() => AssignmentEntity)
  @JoinColumn({ name: 'assignment_id' })
  assignment!: AssignmentEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId!: string | null;

  @ManyToOne(() => ClassEntity)
  @JoinColumn({ name: 'class_id' })
  class!: ClassEntity | null;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId!: string | null;

  @Column({ type: 'text', name: 'submission_text', nullable: true })
  submissionText!: string | null;

  @Column({ type: 'text', name: 'audio_file_url', nullable: true })
  audioFileUrl!: string | null;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null;

  @Column({ type: 'enum', enum: ['SUBMITTED', 'GRADING', 'GRADED', 'REJECTED'], default: 'SUBMITTED' })
  status!: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';

  @CreateDateColumn({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `SubmissionsService` & SLA 48h Filter

* **Tệp tin khởi tạo:** `src/modules/submissions/submissions.service.ts`
* **Chức năng:** Xây dựng QueryBuilder với JOIN trực tiếp `s.class_id`, áp dụng quyền Teacher Isolation và gắn cờ `isOverdue48h`.

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { FilterSubmissionsDto } from './dto/filter-submissions.dto';

@Injectable()
export class SubmissionsService {
  constructor(private readonly dataSource: DataSource) {}

  async getSubmissions(currentUser: { id: string; role: string }, filters: FilterSubmissionsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const qb = this.dataSource
      .getRepository(AssignmentSubmissionEntity)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.assignment', 'a')
      .leftJoinAndSelect('s.student', 'u')
      .leftJoinAndSelect('s.class', 'c');

    // Cách ly dữ liệu: Nếu là TEACHER, chỉ cho phép xem lớp mình phụ trách
    if (currentUser.role === 'TEACHER') {
      qb.andWhere('c.teacher_id = :teacherId', { teacherId: currentUser.id });
    }

    if (filters.classId) {
      qb.andWhere('s.class_id = :classId', { classId: filters.classId });
    }

    if (filters.assignmentId) {
      qb.andWhere('s.assignment_id = :assignmentId', { assignmentId: filters.assignmentId });
    }

    if (filters.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    if (filters.type) {
      qb.andWhere('a.type = :type', { type: filters.type });
    }

    if (filters.search) {
      qb.andWhere('(u.full_name ILIKE :search OR a.title ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('s.submittedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const now = new Date().getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;

    const mappedData = items.map((item) => {
      const submittedTime = new Date(item.submittedAt).getTime();
      const isOverdue48h =
        ['SUBMITTED', 'GRADING'].includes(item.status) && now - submittedTime > fortyEightHoursMs;

      return {
        id: item.id,
        assignmentId: item.assignmentId,
        assignmentTitle: item.assignment?.title || '',
        assignmentType: item.assignment?.type || '',
        studentId: item.studentId,
        studentName: item.student?.fullName || '',
        studentEmail: item.student?.email || '',
        classId: item.classId,
        className: item.class?.name || '',
        status: item.status,
        isOverdue48h,
        submittedAt: item.submittedAt,
      };
    });

    return {
      data: mappedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `SubmissionsAdminController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/submissions/submissions-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP `GET /api/v1/admin/submissions`, bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SubmissionsService } from './submissions.service';
import { FilterSubmissionsDto } from './dto/filter-submissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsAdminController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getSubmissions(
    @Req() req: Request & { user: { sub: string; role: string } },
    @Query() filters: FilterSubmissionsDto,
  ) {
    return await this.submissionsService.getSubmissions(
      { id: req.user.sub, role: req.user.role },
      filters,
    );
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/submissions-hooks.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface SubmissionFilterParams {
  classId?: string;
  assignmentId?: string;
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const useSubmissionsQuery = (filters: SubmissionFilterParams) => {
  return useQuery({
    queryKey: ['admin', 'submissions', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/submissions', { params: filters });
      return response.data;
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
* [x] **Trụ cột 2: Integrity & Performance (Zero Duplication JOIN)**
  * Thực thi JOIN trực tiếp qua `s.class_id` thay vì `class_enrollments`, loại bỏ hoàn toàn lỗi Cartesian Product.
  * Gắn cờ `isOverdue48h` chính xác cho các bài nộp chưa chấm trên 48 giờ.
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Ép buộc lọc `c.teacher_id = currentUserId` đối với tài khoản vai trò `TEACHER`.
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, meta, timestamp }`.
