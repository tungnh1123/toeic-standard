# MODULE SPECIFICATION: FNC_ADM_02 — TẠO & QUẢN LÝ NGÂN HÀNG CÂU HỎI QUIZ TRẮC NGHIỆM / NGỮ PHÁP

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_02` (Tương ứng `FNC_ADM_02`)
* **Tên Module:** Tạo & Quản lý Ngân hàng Câu hỏi Quiz Trắc nghiệm / Ngữ pháp (Grammar Question Bank & Quiz Question Manager)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_02_Ngan_Hang_Cau_Hoi_Quiz_v2.md`
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

* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn tìm kiếm, tạo mới, chỉnh sửa và xóa các câu hỏi trắc nghiệm ngữ pháp/TOEIC Part 5 & Part 6 trong ngân hàng câu hỏi để phục vụ việc biên soạn bài giảng và tạo đề bài tập.
* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn nhập hàng loạt hàng trăm câu hỏi trắc nghiệm từ tệp Excel (`.xlsx`) vào ngân hàng câu hỏi để tiết kiệm thời gian nhập liệu thủ công và đảm bảo cấu trúc chuẩn.
* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn chọn và gắn danh sách các câu hỏi từ ngân hàng vào một Bài tập dạng Quiz (`assignments` có `type = 'QUIZ'`) để giao cho học viên luyện tập.
* **Là Học viên (Student) / Khách (Guest):** Tôi bị chặn truy cập hoàn toàn khỏi các API quản trị ngân hàng câu hỏi để bảo mật đáp án và ngân hàng đề thi.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]          [ Backend NestJS ]           [ PostgreSQL 16 / Excel Parser ]
              │                                 │                                    │
  ─── 1. POST /import-excel (File .xlsx) ──────>│                                    │
                                                │── 2. Validate Buffer & Structure ──│
                                                │   (Parse Rows via ExcelJS)         │
                                                │                                    │
                                                │── 3. Validate FK (lesson_id) ─────>│
                                                │<─ (Lessons exist) ─────────────────│
                                                │                                    │
                                                │── 4. CSDL Transaction Batch ──────>│
                                                │   (INSERT INTO grammar_quiz_q...)  │
                                                │<─ (Transaction Commit) ────────────│
                                                │                                    │
  <── 5. Response 200 OK (Import Summary) ──────│                                    │
```

#### A. Tiến trình Thêm/Sửa/Xóa Câu hỏi Thủ công (CRUD Flow)
1. Giảng viên/Admin gửi Yêu cầu `POST /api/v1/admin/grammar/questions` hoặc `PUT /api/v1/admin/grammar/questions/:id` chứa thông tin câu hỏi, bài học liên kết `lesson_id`, danh sách phương án `options` (JSONB A, B, C, D), phương án đúng `correct_option` ('A'|'B'|'C'|'D'), lời giải chi tiết `explanation`, bản dịch `translation` và độ khó `difficulty_level` ('EASY'|'MEDIUM'|'HARD').
2. Backend kiểm tra tính hợp lệ của `lesson_id` (phải tồn tại trong bảng `grammar_lessons`).
3. Kiểm tra cấu trúc JSONB `options` phải chứa đủ 4 keys: `A`, `B`, `C`, `D` với nội dung text không rỗng.
4. Lưu bản ghi vào bảng `grammar_quiz_questions`.
5. Phản hồi DTO dạng Response Envelope chuẩn.

#### B. Tiến trình Nhập hàng loạt từ Excel (Excel Import Flow)
1. Giảng viên/Admin chọn tệp `.xlsx` và gửi request `POST /api/v1/admin/grammar/questions/import-excel` (Multipart FormData hoặc Base64 Buffer).
2. Backend sử dụng thư viện `exceljs` để parse dữ liệu từng dòng từ dòng 2 (dòng 1 là Header).
3. Kiểm tra ràng buộc cho từng dòng:
   * `lesson_id` bắt buộc đúng định dạng UUID và tồn tại trong CSDL.
   * `question_text` không được rỗng.
   * Đủ 4 phương án `option_a`, `option_b`, `option_c`, `option_d`.
   * `correct_option` thuộc tập `['A', 'B', 'C', 'D']`.
   * `difficulty_level` thuộc tập `['EASY', 'MEDIUM', 'HARD']`.
4. Nếu phát hiện dòng lỗi validation: Trả về danh sách chi tiết các dòng bị lỗi (Line Number, Column, Error Message) để người dùng điều chỉnh.
5. Nếu 100% dòng hợp lệ: Bọc trong **CSDL Transaction Batch Insert** để lưu toàn bộ danh sách câu hỏi vào bảng `grammar_quiz_questions` chỉ bằng 1 câu lệnh SQL duy nhất (`values(...).execute()`).

#### C. Tiến trình Gắn Câu hỏi vào Bài tập Quiz (Attach Questions to Assignment Flow)
1. Giảng viên/Admin gửi `POST /api/v1/admin/assignments/:id/questions` chứa mảng `questionIds` và `assignmentId`.
2. Backend xác thực Bài tập tồn tại trong bảng `assignments` và có `type = 'QUIZ'`.
3. Bọc trong **CSDL Transaction**:
   * Kiểm tra các `question_id` có tồn tại trong `grammar_quiz_questions`.
   * Xóa các liên kết cũ trong `assignment_questions` nếu thực hiện ghi đè toàn bộ, hoặc Insert các bản ghi mới kèm `order_index` thứ tự.
   * Sử dụng cấu trúc Unique Constraint `uq_assignment_question(assignment_id, question_id)` để đảm bảo không bị trùng lặp câu hỏi trong cùng một bài tập.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation (Business Rules)

* **Cấu trúc Mẫu Dữ liệu JSONB Options:**
  ```json
  {
    "A": "is working",
    "B": "works",
    "C": "has worked",
    "D": "will work"
  }
  ```
* **Thuật toán Validate Phương án Đúng (`correct_option`):**
  $$\text{correct\_option} \in \{'A', 'B', 'C', 'D'\} \quad \land \quad \text{options}[\text{correct\_option}] \neq \text{null}$$
* **Quy tắc Phân loại Độ khó:**
  * `EASY`: Ngữ pháp cơ bản (Thì hiện tại đơn, Danh từ số ít/số nhiều, Đại từ nhân xưng).
  * `MEDIUM`: Ngữ pháp trung cấp (Thì hoàn thành, Mệnh đề quan hệ, Cấu trúc câu điều kiện).
  * `HARD`: Ngữ pháp nâng cao / TOEIC Part 5 bẫy từ loại, Đảo ngữ, Mệnh đề phân từ rút gọn.
* **Phân quyền RBAC:**
  * `ADMIN`: Toàn quyền thao tác trên mọi câu hỏi và bài tập.
  * `TEACHER`: Được phép quản lý câu hỏi và gắn vào bài tập do mình khởi tạo (`assignments.created_by = userId`).
  * `STUDENT` / `GUEST`: Bị chặn hoàn toàn (HTTP 403 Forbidden).

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `grammar_quiz_questions` (Ngân hàng Câu hỏi Quiz Ngữ pháp)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `lesson_id` (`UUID`, Foreign Key -> `grammar_lessons(id)` ON DELETE CASCADE, NOT NULL)
* `question_number` (`INT`, NOT NULL)
* `question_text` (`TEXT`, NOT NULL)
* `options` (`JSONB`, NOT NULL - Lưu { "A": "...", "B": "...", "C": "...", "D": "..." })
* `correct_option` (`CHAR(1)`, NOT NULL, CHECK `correct_option IN ('A', 'B', 'C', 'D')`)
* `explanation` (`TEXT`, NOT NULL)
* `translation` (`TEXT`, NULLABLE)
* `difficulty_level` (`VARCHAR(10)`, DEFAULT `'MEDIUM'`, NOT NULL - 'EASY' | 'MEDIUM' | 'HARD')
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `assignments` (Bài tập Gốc Template)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(255)`, NOT NULL)
* `instructions` (`TEXT`, NOT NULL)
* `type` (`assignment_type_enum`, NOT NULL - 'QUIZ' | 'WRITING' | 'SPEAKING')
* `rubric` (`JSONB`, NULLABLE)
* `created_by` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### C. Bảng `assignment_questions` (Liên kết Bài tập Quiz & Câu hỏi Ngân hàng)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)` ON DELETE CASCADE, NOT NULL)
* `question_id` (`UUID`, NOT NULL - UUID tham chiếu tới `grammar_quiz_questions(id)`)
* `question_type` (`VARCHAR(50)`, DEFAULT `'GRAMMAR_QUIZ'`, NOT NULL)
* `order_index` (`INT`, DEFAULT 0, NOT NULL)
* **Constraint:** `CONSTRAINT uq_assignment_question UNIQUE(assignment_id, question_id)`

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_grammar_quiz_questions_lesson ON grammar_quiz_questions(lesson_id);`
* `CREATE INDEX idx_assignment_questions_assign ON assignment_questions(assignment_id);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE assignment_type_enum AS ENUM ('QUIZ', 'WRITING', 'SPEAKING');
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `GET` | `/api/v1/admin/grammar/questions` | Teacher / Admin | Tìm kiếm & Lọc câu hỏi trong ngân hàng theo lesson_id, difficulty, keyword |
| **2** | `POST` | `/api/v1/admin/grammar/questions` | Teacher / Admin | Thêm mới 1 câu hỏi trắc nghiệm vào ngân hàng câu hỏi |
| **3** | `PUT` | `/api/v1/admin/grammar/questions/:id` | Teacher / Admin | Cập nhật thông tin câu hỏi, phương án, đáp án và giải thích |
| **4** | `DELETE` | `/api/v1/admin/grammar/questions/:id` | Teacher / Admin | Xóa 1 câu hỏi khỏi ngân hàng |
| **5** | `POST` | `/api/v1/admin/grammar/questions/import-excel` | Teacher / Admin | Nhập hàng loạt câu hỏi từ file Excel (.xlsx) |
| **57** | `POST` | `/api/v1/admin/assignments/:id/questions` | Teacher / Admin | **[Mới v11]** Gắn danh sách câu hỏi từ ngân hàng vào Bài tập dạng Quiz |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Thao tác thành công",
  "data": {
    "id": "c7a2b3d4-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
    "lessonId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "questionNumber": 1,
    "questionText": "She ______ in Hanoi since 2020.",
    "options": {
      "A": "lives",
      "B": "has lived",
      "C": "lived",
      "D": "is living"
    },
    "correctOption": "B",
    "explanation": "Dùng thì Hiện tại hoàn thành với 'since + mốc thời gian'.",
    "translation": "Cô ấy đã sống ở Hà Nội từ năm 2020.",
    "difficultyLevel": "MEDIUM",
    "createdAt": "2026-10-12T20:45:00.000Z"
  },
  "timestamp": "2026-10-12T20:45:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/admin/grammar/questions` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `POST /api/v1/admin/grammar/questions` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `PUT /api/v1/admin/grammar/questions/:id` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `DELETE /api/v1/admin/grammar/questions/:id` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `POST /api/v1/admin/grammar/questions/import-excel` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền) | **○** (Toàn quyền) |
| `POST /api/v1/admin/assignments/:id/questions` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Đề bài mình tạo) | **○** (Toàn quyền) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/grammar-questions/dto/options.dto.ts`
  * `src/modules/grammar-questions/dto/create-grammar-question.dto.ts`
  * `src/modules/grammar-questions/dto/update-grammar-question.dto.ts`
  * `src/modules/grammar-questions/dto/filter-grammar-question.dto.ts`
  * `src/modules/grammar-questions/dto/attach-questions-assignment.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/grammar-questions/dto/options.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class QuestionOptionsDto {
  @IsString()
  @IsNotEmpty({ message: 'Phương án A không được để trống.' })
  A!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án B không được để trống.' })
  B!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án C không được để trống.' })
  C!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án D không được để trống.' })
  D!: string;
}

// src/modules/grammar-questions/dto/create-grammar-question.dto.ts
import { IsUUID, IsNotEmpty, IsString, IsInt, Min, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionOptionsDto } from './options.dto';

export class CreateGrammarQuestionDto {
  @IsUUID('4', { message: 'lessonId phải là chuỗi UUID v4 hợp lệ.' })
  @IsNotEmpty({ message: 'lessonId không được để trống.' })
  lessonId!: string;

  @IsInt({ message: 'questionNumber phải là số nguyên.' })
  @Min(1, { message: 'questionNumber phải lớn hơn hoặc bằng 1.' })
  questionNumber!: number;

  @IsString({ message: 'questionText phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống.' })
  questionText!: string;

  @ValidateNested()
  @Type(() => QuestionOptionsDto)
  @IsNotEmpty({ message: 'Danh sách phương án options không được để trống.' })
  options!: QuestionOptionsDto;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'correctOption phải là một trong các giá trị A, B, C, D.' })
  @IsNotEmpty({ message: 'Đáp án đúng correctOption không được để trống.' })
  correctOption!: 'A' | 'B' | 'C' | 'D';

  @IsString({ message: 'explanation phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Lời giải explanation không được để trống.' })
  explanation!: string;

  @IsString()
  @IsOptional()
  translation?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'], { message: 'difficultyLevel phải là EASY, MEDIUM hoặc HARD.' })
  @IsOptional()
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
}

// src/modules/grammar-questions/dto/attach-questions-assignment.dto.ts
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AttachQuestionsToAssignmentDto {
  @IsArray({ message: 'questionIds phải là một mảng chuỗi UUID.' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 câu hỏi để gắn vào bài tập.' })
  @IsUUID('4', { each: true, message: 'Mỗi questionId phải là chuỗi UUID v4 hợp lệ.' })
  questionIds!: string[];
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * `src/modules/grammar-questions/entities/grammar-quiz-question.entity.ts`
  * `src/modules/assignments/entities/assignment-question.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/grammar-questions/entities/grammar-quiz-question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { QuestionOptionsDto } from '../dto/options.dto';

@Entity('grammar_quiz_questions')
export class GrammarQuizQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId!: string;

  @Column({ type: 'int', name: 'question_number' })
  questionNumber!: number;

  @Column({ type: 'text', name: 'question_text' })
  questionText!: string;

  @Column({ type: 'jsonb' })
  options!: QuestionOptionsDto;

  @Column({ type: 'char', length: 1, name: 'correct_option' })
  correctOption!: 'A' | 'B' | 'C' | 'D';

  @Column({ type: 'text' })
  explanation!: string;

  @Column({ type: 'text', nullable: true })
  translation!: string | null;

  @Column({ type: 'varchar', length: 10, name: 'difficulty_level', default: 'MEDIUM' })
  difficultyLevel!: 'EASY' | 'MEDIUM' | 'HARD';

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

// src/modules/assignments/entities/assignment-question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('assignment_questions')
@Unique('uq_assignment_question', ['assignmentId', 'questionId'])
export class AssignmentQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId!: string;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId!: string;

  @Column({ type: 'varchar', length: 50, name: 'question_type', default: 'GRAMMAR_QUIZ' })
  questionType!: string;

  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex!: number;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `GrammarQuestionsService` & Transaction

* **Tệp tin khởi tạo:** `src/modules/grammar-questions/grammar-questions.service.ts`
* **Chức năng:** CRUD Ngân hàng câu hỏi, Excel Import Batch Insert, Gắn câu hỏi vào Assignment.

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { GrammarQuizQuestionEntity } from './entities/grammar-quiz-question.entity';
import { AssignmentQuestionEntity } from '../assignments/entities/assignment-question.entity';
import { AssignmentEntity } from '../assignments/entities/assignment.entity';
import { CreateGrammarQuestionDto } from './dto/create-grammar-question.dto';
import { AttachQuestionsToAssignmentDto } from './dto/attach-questions-assignment.dto';

@Injectable()
export class GrammarQuestionsService {
  constructor(private readonly dataSource: DataSource) {}

  async getQuestions(lessonId?: string, difficulty?: string, search?: string, page = 1, limit = 20) {
    const qb = this.dataSource.getRepository(GrammarQuizQuestionEntity).createQueryBuilder('q');

    if (lessonId) {
      qb.andWhere('q.lessonId = :lessonId', { lessonId });
    }
    if (difficulty) {
      qb.andWhere('q.difficultyLevel = :difficulty', { difficulty });
    }
    if (search) {
      qb.andWhere('q.questionText ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('q.questionNumber', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createQuestion(dto: CreateGrammarQuestionDto) {
    const repository = this.dataSource.getRepository(GrammarQuizQuestionEntity);
    const entity = repository.create({
      ...dto,
      difficultyLevel: dto.difficultyLevel || 'MEDIUM',
    });
    return await repository.save(entity);
  }

  async attachQuestionsToAssignment(assignmentId: string, dto: AttachQuestionsToAssignmentDto) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id: assignmentId } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Bài tập không tồn tại.',
        });
      }

      if (assignment.type !== 'QUIZ') {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_ASSIGNMENT_TYPE',
          message: 'Chỉ có thể gắn câu hỏi trắc nghiệm vào bài tập dạng QUIZ.',
        });
      }

      // Xóa các liên kết cũ nếu có
      await manager.delete(AssignmentQuestionEntity, { assignmentId });

      // Insert Batch các liên kết mới
      const entities = dto.questionIds.map((qId, index) => {
        return manager.create(AssignmentQuestionEntity, {
          assignmentId,
          questionId: qId,
          questionType: 'GRAMMAR_QUIZ',
          orderIndex: index + 1,
        });
      });

      await manager.save(AssignmentQuestionEntity, entities);

      return {
        assignmentId,
        attachedCount: entities.length,
      };
    });
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `GrammarQuestionsController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/grammar-questions/grammar-questions.controller.ts`
* **Chức năng:** Khai báo HTTP Endpoints, bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { GrammarQuestionsService } from './grammar-questions.service';
import { CreateGrammarQuestionDto } from './dto/create-grammar-question.dto';
import { AttachQuestionsToAssignmentDto } from './dto/attach-questions-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GrammarQuestionsController {
  constructor(private readonly questionsService: GrammarQuestionsService) {}

  @Get('grammar/questions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getQuestions(
    @Query('lessonId') lessonId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.questionsService.getQuestions(lessonId, difficulty, search, page, limit);
  }

  @Post('grammar/questions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createQuestion(@Body() dto: CreateGrammarQuestionDto) {
    return await this.questionsService.createQuestion(dto);
  }

  @Post('assignments/:id/questions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async attachQuestionsToAssignment(
    @Param('id', ParseUUIDPipe) assignmentId: string,
    @Body() dto: AttachQuestionsToAssignmentDto,
  ) {
    return await this.questionsService.attachQuestionsToAssignment(assignmentId, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/grammar-questions-hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface GrammarQuestion {
  id: string;
  lessonId: string;
  questionNumber: number;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  translation: string | null;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
}

export const useGrammarQuestionsQuery = (filters: { lessonId?: string; difficulty?: string; page?: number }) => {
  return useQuery({
    queryKey: ['admin', 'grammar-questions', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/grammar/questions', { params: filters });
      return response.data;
    },
  });
};

export const useAttachQuestionsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, questionIds }: { assignmentId: string; questionIds: string[] }) => {
      const response = await apiClient.post(`/admin/assignments/${assignmentId}/questions`, { questionIds });
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
* [x] **Trụ cột 2: Integrity & Performance**
  * Thao tác gắn câu hỏi vào Bài tập bọc 100% trong `this.dataSource.transaction()`.
  * Không có câu lệnh SQL query DB trong vòng lặp (`No N+1 Query`).
* [x] **Trụ cột 3: Bảo mật & RBAC**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Khóa hoàn toàn truy cập đối với `STUDENT` và `GUEST` (mã lỗi 403 Forbidden).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
