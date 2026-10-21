# MODULE SPECIFICATION: FNC_ADM_03 — TẠO ĐỀ BÀI LUẬN WRITING & CẤU HÌNH RUBRIC 4 TIÊU CHÍ

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_03` (Tương ứng `FNC_ADM_03`)
* **Tên Module:** Tạo Đề bài luận Writing & Cấu hình Rubric 4 Tiêu chí (Writing Assignment Authoring & Rubric Builder)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_03_Tao_De_Writing_Rubric_v2.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất CSDL PostgreSQL 16 & API v11.0)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn tạo mới, chỉnh sửa đề bài tập tự luận kỹ năng Viết (Writing), khống chế giới hạn số từ (`minWords < maxWords`), giới hạn thời gian làm bài (`timeLimitMinutes`) và cấu hình Thang điểm Rubric 4 tiêu chí chuẩn hóa để tạo thành **Đề bài gốc / Bản mẫu (Template)** tái sử dụng nhiều lần.
* **Là Học viên (Student):** Tôi muốn xem nội dung đề bài Writing, giới hạn số từ và cấu hình Rubric chấm điểm để nắm rõ tiêu chí đánh giá trước và trong khi thực hiện bài làm.
* **Là Hệ thống (System):** Tôi muốn tách biệt việc quản lý nội dung đề bài gốc (bảng `assignments`) khỏi việc đặt hạn nộp (`due_date`) và giao bài theo lớp (bảng `assignment_targets`), giúp một đề bài gốc có thể giao cho nhiều lớp học khác nhau với deadline độc lập.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]          [ Backend NestJS ]           [ PostgreSQL 16 ]
              │                                 │                          │
  ─── 1. POST /api/v1/admin/assignments ───────>│                          │
      (title, instructions, type="WRITING",     │                          │
       rubric: { timeLimit, words, criteria })  │── 2. Validate Payload ───│
                                                │   (Check Total Weight)   │
                                                │                          │
                                                │── 3. CSDL Transaction ──>│
                                                │   (INSERT INTO           │
                                                │    assignments)          │
                                                │<─ (Transaction Commit) ──│
                                                │                          │
  <── 4. Response 201 Created (Assignment) ─────│                          │
```

#### Tiến trình Khởi tạo Đề bài Writing (Create Writing Assignment Flow)
1. Giảng viên/Admin gửi Yêu cầu `POST /api/v1/admin/assignments` chứa:
   * `title`: Tiêu đề đề bài Writing.
   * `instructions`: Nội dung câu hỏi / chủ đề bài luận.
   * `type`: Bắt buộc là `'WRITING'`.
   * `rubric`: Đối tượng JSONB chứa cấu hình khống chế (`timeLimitMinutes`, `minWords`, `maxWords`) và mảng 4 tiêu chí Rubric chấm điểm.
2. Backend `AssignmentsService` kiểm tra các ràng buộc nghiệp vụ:
   * `type` phải bằng `'WRITING'`.
   * `minWords` phải nhỏ hơn `maxWords`.
   * Mảng `criteria` trong `rubric` bắt buộc chứa đủ 4 tiêu chí với tổng trọng số \\(\sum \text{weight} = 100\%\\).
3. Bọc trong **CSDL Transaction**: Lưu bản ghi vào bảng `assignments` với `created_by = currentUserId`.
4. Phản hồi DTO dạng Response Envelope chuẩn.

#### Tiến trình Cập nhật Đề bài Writing (Update Writing Assignment Flow)
1. Giảng viên/Admin gửi Yêu cầu `PUT /api/v1/admin/assignments/:id`.
2. Backend kiểm tra xem đề bài tập gốc đã có học viên nộp bài làm chưa (truy vấn bảng `assignment_submissions` theo `assignment_id`).
   * Nếu đã có bài nộp: Phản hồi `400 Bad Request` kèm mã lỗi `ERR_ASSIGNMENT_LOCKED` để tránh làm hỏng dữ liệu điểm số đã chấm.
   * Nếu chưa có bài nộp: Tiến hành cập nhật thông tin trong **CSDL Transaction**.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation Rubric (Business Rules)

* **Cấu trúc JSONB Rubric cho Đề Writing:**
  ```json
  {
    "timeLimitMinutes": 30,
    "minWords": 150,
    "maxWords": 250,
    "criteria": [
      { "key": "TASK_ACHIEVEMENT", "name": "Task Achievement", "weight": 25, "maxScore": 10 },
      { "key": "COHERENCE_COHESION", "name": "Coherence & Cohesion", "weight": 25, "maxScore": 10 },
      { "key": "LEXICAL_RESOURCE", "name": "Lexical Resource", "weight": 25, "maxScore": 10 },
      { "key": "GRAMMAR_ACCURACY", "name": "Grammatical Accuracy", "weight": 25, "maxScore": 10 }
    ]
  }
  ```
* **Thuật toán Kiểm tra Trọng số Barem Rubric:**
  \\[\sum_{i=1}^{4} \text{criteria}[i].\text{weight} = 100\\]
  Nếu tổng trọng số \\(\neq 100\%\\), hệ thống từ chối lưu và phản hồi lỗi `ERR_RUBRIC_WEIGHT_INVALID`.
* **Công thức Quy đổi Điểm Bài luận (Scoring Formula):**
  \\[\text{Total Score} = \sum_{i=1}^{4} \left( \text{Score}_i \times \frac{\text{Weight}_i}{100} \right)\\]
* **Quy tắc Kiến trúc Decoupled Deadline v2.0:**
  * Bảng `assignments` là Template đề gốc, **không lưu `due_date`**.
  * Cột `due_date` chỉ tồn tại ở bảng `assignment_targets` khi đề gốc được giao cho từng Lớp học / Học viên cụ thể.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### Bảng `assignments` (Đề bài tập Gốc Template)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(255)`, NOT NULL)
* `instructions` (`TEXT`, NOT NULL)
* `type` (`assignment_type_enum`, NOT NULL - 'WRITING' | 'SPEAKING' | 'QUIZ')
* `rubric` (`JSONB`, NULLABLE - Lưu thời gian, số từ và mảng 4 tiêu chí Rubric)
* `created_by` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_assignments_type ON assignments(type);`
* `CREATE INDEX idx_assignments_created_by ON assignments(created_by);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE assignment_type_enum AS ENUM ('QUIZ', 'WRITING', 'SPEAKING');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **55** | `POST` | `/api/v1/admin/assignments` | Teacher / Admin | **[Chuẩn hóa v11]** Tạo đề bài tập gốc (nhận title, instructions, type, rubric) |
| **58** | `PUT` | `/api/v1/admin/assignments/:id` | Teacher / Admin | Cập nhật đề bài Writing gốc (chỉ khi chưa có bài nộp) |
| **52** | `GET` | `/api/v1/student/assignments` | Student | Lấy danh sách bài tập được giao cho bản thân |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Tạo đề bài Writing gốc thành công",
  "data": {
    "id": "e8a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "title": "TOEIC Writing Part 3: Write an Opinion Essay",
    "instructions": "Write an essay responding to the prompt below...",
    "type": "WRITING",
    "rubric": {
      "timeLimitMinutes": 30,
      "minWords": 150,
      "maxWords": 250,
      "criteria": [
        { "key": "TASK_ACHIEVEMENT", "name": "Task Achievement", "weight": 25, "maxScore": 10 },
        { "key": "COHERENCE_COHESION", "name": "Coherence & Cohesion", "weight": 25, "maxScore": 10 },
        { "key": "LEXICAL_RESOURCE", "name": "Lexical Resource", "weight": 25, "maxScore": 10 },
        { "key": "GRAMMAR_ACCURACY", "name": "Grammatical Accuracy", "weight": 25, "maxScore": 10 }
      ]
    },
    "createdBy": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "createdAt": "2026-10-12T20:55:00.000Z"
  },
  "timestamp": "2026-10-12T20:55:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/admin/assignments` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Đề lớp mình) | **○** (Toàn quyền) |
| `PUT /api/v1/admin/assignments/:id` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Đề mình tạo) | **○** (Toàn quyền) |
| `GET /api/v1/student/assignments` | **×** (Chặn 403) | **○** (Cá nhân) | **○** (Lớp phụ trách) | **○** (Toàn bộ) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/assignments/dto/rubric-criterion.dto.ts`
  * `src/modules/assignments/dto/writing-rubric.dto.ts`
  * `src/modules/assignments/dto/create-writing-assignment.dto.ts`
  * `src/modules/assignments/dto/update-writing-assignment.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/assignments/dto/rubric-criterion.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';

export class RubricCriterionDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã tiêu chí key không được để trống.' })
  key!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên tiêu chí name không được để trống.' })
  name!: string;

  @IsInt({ message: 'Trọng số weight phải là số nguyên.' })
  @Min(1, { message: 'Trọng số weight phải lớn hơn 0.' })
  @Max(100, { message: 'Trọng số weight không vượt quá 100.' })
  weight!: number;

  @IsInt({ message: 'Điểm tối đa maxScore phải là số nguyên.' })
  @Min(1, { message: 'Điểm tối đa maxScore phải lớn hơn 0.' })
  @Max(100, { message: 'Điểm tối đa maxScore không vượt quá 100.' })
  maxScore!: number;
}

// src/modules/assignments/dto/writing-rubric.dto.ts
import { IsInt, Min, Max, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RubricCriterionDto } from './rubric-criterion.dto';

export class WritingRubricDto {
  @IsInt()
  @Min(5, { message: 'Thời gian làm bài tối thiểu là 5 phút.' })
  timeLimitMinutes!: number;

  @IsInt()
  @Min(10, { message: 'Số từ tối thiểu phải lớn hơn hoặc bằng 10.' })
  minWords!: number;

  @IsInt()
  @Min(50, { message: 'Số từ tối đa phải lớn hơn hoặc bằng 50.' })
  maxWords!: number;

  @IsArray()
  @ArrayMinSize(4, { message: 'Barem Rubric phải có đúng 4 tiêu chí chấm điểm.' })
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria!: RubricCriterionDto[];
}

// src/modules/assignments/dto/create-writing-assignment.dto.ts
import { IsNotEmpty, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WritingRubricDto } from './writing-rubric.dto';

export enum AssignmentType {
  QUIZ = 'QUIZ',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

export class CreateWritingAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề đề bài không được để trống.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Hướng dẫn đề bài instructions không được để trống.' })
  instructions!: string;

  @IsEnum(AssignmentType)
  type: AssignmentType = AssignmentType.WRITING;

  @ValidateNested()
  @Type(() => WritingRubricDto)
  rubric!: WritingRubricDto;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/assignments/entities/assignment.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/assignments/entities/assignment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { WritingRubricDto } from '../dto/writing-rubric.dto';

@Entity('assignments')
export class AssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  instructions!: string;

  @Column({ type: 'enum', enum: ['QUIZ', 'WRITING', 'SPEAKING'] })
  type!: 'QUIZ' | 'WRITING' | 'SPEAKING';

  @Column({ type: 'jsonb', nullable: true })
  rubric!: WritingRubricDto | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `AssignmentsService` & CSDL Transaction

* **Tệp tin khởi tạo:** `src/modules/assignments/assignments.service.ts`
* **Chức năng:** Tạo/Sửa đề bài gốc Writing, kiểm tra tổng trọng số Rubric = 100%, bọc Transaction.

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { CreateWritingAssignmentDto } from './dto/create-writing-assignment.dto';
import { AssignmentSubmissionEntity } from '../submissions/entities/assignment-submission.entity';

@Injectable()
export class AssignmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async createWritingAssignment(userId: string, dto: CreateWritingAssignmentDto) {
    if (dto.type !== 'WRITING') {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_TYPE',
        message: 'Loại bài tập phải là WRITING.',
      });
    }

    if (dto.rubric.minWords >= dto.rubric.maxWords) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_WORD_LIMIT',
        message: 'Số từ tối thiểu minWords phải nhỏ hơn số từ tối đa maxWords.',
      });
    }

    // Validate Barem Rubric 4 tiêu chí - Tổng trọng số phải bằng 100%
    const totalWeight = dto.rubric.criteria.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException({
        errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
        message: `Tổng trọng số các tiêu chí Rubric phải đúng bằng 100%. Hiện tại: ${totalWeight}%.`,
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const entity = manager.create(AssignmentEntity, {
        title: dto.title,
        instructions: dto.instructions,
        type: 'WRITING',
        rubric: dto.rubric,
        createdBy: userId,
      });

      return await manager.save(entity);
    });
  }

  async updateWritingAssignment(assignmentId: string, userId: string, dto: CreateWritingAssignmentDto) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id: assignmentId } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập không tồn tại.',
        });
      }

      // Kiểm tra xem đề đã có bài nộp chưa
      const submissionCount = await manager.count(AssignmentSubmissionEntity, { where: { assignmentId } });
      if (submissionCount > 0) {
        throw new BadRequestException({
          errorCode: 'ERR_ASSIGNMENT_LOCKED',
          message: 'Không thể chỉnh sửa đề bài đã có học viên nộp bài làm.',
        });
      }

      assignment.title = dto.title;
      assignment.instructions = dto.instructions;
      assignment.rubric = dto.rubric;

      return await manager.save(assignment);
    });
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `AssignmentsAdminController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/assignments/assignments-admin.controller.ts`
* **Chức năng:** Định tuyến HTTP Endpoints, đính kèm `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Post, Put, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { AssignmentsService } from './assignments.service';
import { CreateWritingAssignmentDto } from './dto/create-writing-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsAdminController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createWritingAssignment(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateWritingAssignmentDto,
  ) {
    return await this.assignmentsService.createWritingAssignment(req.user.sub, dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async updateWritingAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateWritingAssignmentDto,
  ) {
    return await this.assignmentsService.updateWritingAssignment(id, req.user.sub, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/writing-assignment-hooks.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface CreateWritingAssignmentPayload {
  title: string;
  instructions: string;
  type: 'WRITING';
  rubric: {
    timeLimitMinutes: number;
    minWords: number;
    maxWords: number;
    criteria: Array<{
      key: string;
      name: string;
      weight: number;
      maxScore: number;
    }>;
  };
}

export const useCreateWritingAssignmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWritingAssignmentPayload) => {
      const response = await apiClient.post('/admin/assignments', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assignments'] });
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
  * Ràng buộc `minWords < maxWords` và `type = 'WRITING'` tường minh.
* [x] **Trụ cột 2: Integrity & Performance**
  * Kiểm tra tổng trọng số Rubric \\(\sum \text{weight} = 100\%\\) trước khi ghi CSDL.
  * Khóa không cho phép sửa đề gốc khi đã có bản ghi bài nộp trong `assignment_submissions`.
  * Thao tác tạo/sửa bọc 100% trong `this.dataSource.transaction()`.
* [x] **Trụ cột 3: Bảo mật & RBAC**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Khóa 100% quyền truy cập đối với Học viên và Khách (HTTP 403 Forbidden).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
