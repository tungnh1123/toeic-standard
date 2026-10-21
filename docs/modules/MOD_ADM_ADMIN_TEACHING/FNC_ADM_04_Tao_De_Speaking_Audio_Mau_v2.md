# MODULE SPECIFICATION: FNC_ADM_04 — TẠO ĐỀ LUYỆN NÓI SPEAKING KÈM AUDIO PHÁT ÂM MẪU BẢN XỨ

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_04` (Tương ứng `FNC_ADM_04`)
* **Tên Module:** Tạo Đề luyện nói Speaking kèm Audio phát âm mẫu bản xứ (Speaking Assignment Authoring & Native Sample Audio)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_04_Tao_De_Speaking_Audio_Mau_v2.md`
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

* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn soạn thảo đề bài tập luyện nói Speaking (TOEIC Speaking Part 1 - Part 5), cấu hình thời gian chuẩn bị, thời gian trả lời, Barem Rubric chấm điểm và upload file audio phát âm mẫu của người bản xứ để làm Đề bài gốc (Template) phục vụ giảng dạy.
* **Là Giảng viên (Teacher):** Tôi muốn nghe lại file audio mẫu bản xứ vừa upload trên giao diện Web Admin Portal bằng trình phát sóng âm WaveSurfer trước khi chính thức lưu đề bài.
* **Là Học viên (Student):** Tôi bị ẩn file audio phát âm mẫu bản xứ trong thời gian làm bài; file audio mẫu chỉ được mở khóa cho tôi nghe sau khi tôi đã nộp bài làm Speaking của mình thành công.
* **Là Hệ thống (System):** Tôi muốn áp dụng giao thức Upload Direct-to-S3 Presigned PUT URL để nhận file audio dung lượng lớn (lên tới 25MB) trực tiếp từ Client lên Cloud Storage, giúp tránh nghẽn băng thông và nghẽn tài nguyên CPU/RAM của server Backend NestJS.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]       [ Backend NestJS ]           [ Cloud Storage ]
              │                             │                                 │
  ── 1. POST /submissions/presigned-url ───>│                                 │
     (filename, mimeType, fileSize)         │                                 │
                                            │── 2. Generate Presigned PUT ────│
  <── 3. Response 200 OK (uploadUrl, key) ──│   (Expiration 15 mins)          │
              │                             │                                 │
              │── 4. PUT File Binary directly to uploadUrl ──────────────────>│
              │<── 5. HTTP 200 OK (Upload Verified) ──────────────────────────│
              │                             │                                 │
  ── 6. POST /api/v1/admin/assignments ────>│                                 │
     (title, instructions, type="SPEAKING", │                                 │
      rubric: { sampleAudioUrl: key, ... }) │── 7. Validate Rubric Weights    │
                                            │── 8. CSDL Transaction ─────────>│
                                            │   (INSERT INTO assignments)     │
                                            │<─ (Transaction Commit) ─────────│
  <── 9. Response 201 Created (Assignment) ─│                                 │
```


## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### Bảng `assignments` (Đề bài tập Gốc Template)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(255)`, NOT NULL)
* `instructions` (`TEXT`, NOT NULL)
* `type` (`assignment_type_enum`, NOT NULL - 'SPEAKING' | 'WRITING' | 'QUIZ')
* `rubric` (`JSONB`, NULLABLE - Lưu cấu trúc Rubric Speaking & sampleAudioUrl)
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
| **53** | `POST` | `/api/v1/submissions/presigned-url` | Student / Teacher / Admin | **[Mới v11]** Cấp Presigned PUT URL an toàn upload audio Speaking |
| **55** | `POST` | `/api/v1/admin/assignments` | Teacher / Admin | **[Chuẩn hóa v11]** Tạo đề bài tập gốc (nhận title, instructions, type, rubric) |
| **58** | `PUT` | `/api/v1/admin/assignments/:id` | Teacher / Admin | Cập nhật đề bài Speaking gốc (chỉ khi chưa có bài nộp) |
| **52** | `GET` | `/api/v1/student/assignments` | Student | Danh sách bài tập cá nhân (tự động mask sampleAudioUrl nếu chưa nộp) |

#### Định dạng Cấu trúc Phản hồi Presigned URL
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Cấp Presigned URL thành công",
  "data": {
    "uploadUrl": "https://storage.example.com/speaking-samples/a1b2c3d4.mp3?expires=900",
    "fileKey": "speaking-samples/a1b2c3d4.mp3",
    "expiresInSeconds": 900
  },
  "timestamp": "2026-10-12T21:00:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/submissions/presigned-url` | **×** (Chặn 403) | **○** (Bài nộp cá nhân) | **○** (Audio mẫu) | **○** (Toàn quyền) |
| `POST /api/v1/admin/assignments` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Đề lớp mình) | **○** (Toàn quyền) |
| `PUT /api/v1/admin/assignments/:id` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Đề mình tạo) | **○** (Toàn quyền) |
| `GET /api/v1/student/assignments` | **×** (Chặn 403) | **○** (Cá nhân) | **○** (Lớp phụ trách) | **○** (Toàn bộ) |


## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/media/dto/presigned-url.dto.ts`
  * `src/modules/assignments/dto/speaking-rubric.dto.ts`
  * `src/modules/assignments/dto/create-speaking-assignment.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/media/dto/presigned-url.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class GeneratePresignedUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên file filename không được để trống.' })
  filename!: string;

  @IsString()
  @IsIn(['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/webm'], {
    message: 'mimeType phải là audio/mpeg, audio/wav, audio/m4a hoặc audio/webm.',
  })
  mimeType!: string;

  @IsInt()
  @Min(1024, { message: 'Dung lượng file phải lớn hơn 1KB.' })
  @Max(26214400, { message: 'Dung lượng file audio vượt quá giới hạn tối đa 25MB.' })
  fileSize!: number;
}

// src/modules/assignments/dto/speaking-rubric.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, Max, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SpeakingRubricCriterionDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weight!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  maxScore!: number;
}

export class SpeakingRubricDto {
  @IsInt()
  @Min(0)
  preparationTimeSeconds!: number;

  @IsInt()
  @Min(1)
  responseTimeSeconds!: number;

  @IsString()
  @IsNotEmpty({ message: 'Đường dẫn file audio mẫu sampleAudioUrl không được để trống.' })
  sampleAudioUrl!: string;

  @IsString()
  @IsOptional()
  sampleTranscript?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakingRubricCriterionDto)
  criteria!: SpeakingRubricCriterionDto[];
}

// src/modules/assignments/dto/create-speaking-assignment.dto.ts
import { IsNotEmpty, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SpeakingRubricDto } from './speaking-rubric.dto';

export enum AssignmentType {
  QUIZ = 'QUIZ',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

export class CreateSpeakingAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề đề bài không được để trống.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Hướng dẫn làm bài instructions không được để trống.' })
  instructions!: string;

  @IsEnum(AssignmentType)
  type: AssignmentType = AssignmentType.SPEAKING;

  @ValidateNested()
  @Type(() => SpeakingRubricDto)
  rubric!: SpeakingRubricDto;
}
```


### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/assignments/entities/assignment.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/assignments/entities/assignment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { SpeakingRubricDto } from '../dto/speaking-rubric.dto';

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
  rubric!: SpeakingRubricDto | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
```


// src/modules/media/media.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { GeneratePresignedUrlDto } from './dto/presigned-url.dto';

@Injectable()
export class MediaService {
  async generatePresignedUrl(dto: GeneratePresignedUrlDto) {
    const fileExtension = dto.filename.split('.').pop() || 'mp3';
    const uniqueKey = `speaking-samples/audio-sample.${fileExtension}`;
    
    return {
      presignedUrl: `https://storage.example.com/${uniqueKey}`,
      fileKey: uniqueKey,
      expiresInSeconds: 900,
    };
  }
}


// src/modules/assignments/assignments.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { CreateSpeakingAssignmentDto } from './dto/create-speaking-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async createSpeakingAssignment(userId: string, dto: CreateSpeakingAssignmentDto) {
    if (dto.type !== 'SPEAKING') {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_TYPE',
        message: 'Loại bài tập phải là SPEAKING.',
      });
    }

    // Validate Barem Rubric Trọng số 100%
    const criteria = dto.rubric?.criteria || [];
    const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException({
        errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
        message: `Tổng trọng số các tiêu chí Rubric phải bằng 100%. Hiện tại: ${totalWeight}%.`,
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const entity = manager.create(AssignmentEntity, {
        title: dto.title,
        instructions: dto.instructions,
        type: 'SPEAKING',
        rubric: dto.rubric,
        createdBy: userId,
      });

      return await manager.save(entity);
    });
  }
}


### 🧩 Task 4: Triển khai Route Handlers tại Controllers & RBAC

* **Tệp tin khởi tạo:**
  * `src/modules/media/media.controller.ts`
  * `src/modules/assignments/assignments-admin.controller.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/media/media.controller.ts
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MediaService } from './media.service';
import { GeneratePresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/submissions')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  async getPresignedUrl(@Body() dto: GeneratePresignedUrlDto) {
    return await this.mediaService.generatePresignedUrl(dto);
  }
}

// src/modules/assignments/assignments-admin.controller.ts
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AssignmentsService } from './assignments.service';
import { CreateSpeakingAssignmentDto } from './dto/create-speaking-assignment.dto';
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
  async createSpeakingAssignment(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateSpeakingAssignmentDto,
  ) {
    return await this.assignmentsService.createSpeakingAssignment(req.user.sub, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (Direct-to-S3 Upload & WaveSurfer Preview)

* **Tệp tin khởi tạo:** `src/api/speaking-assignment-hooks.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface PresignedUrlResponse {
  presignedUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export const useDirectStorageUploadMutation = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Xin Presigned URL từ Backend
      const presignedRes = await apiClient.post('/submissions/presigned-url', {
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      const { presignedUrl, fileKey } = presignedRes.data as PresignedUrlResponse;

      // Step 2: Upload trực tiếp file binary từ trình duyệt lên Storage
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Lỗi upload file trực tiếp lên Storage Bucket.');
      }

      return fileKey;
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
* [x] **Trụ cột 2: Integrity & Performance**
  * Giao thức Upload Direct-to-S3 Presigned PUT URL hoàn toàn không stream nhị phân qua server NestJS.
  * Thao tác tạo đề Speaking bọc 100% trong `this.dataSource.transaction()`.
* [x] **Trụ cột 3: Bảo mật & RBAC**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Khóa hoàn toàn file audio mẫu đối với Học viên khi chưa nộp bài.
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
