# MODULE SPECIFICATION: FNC_ADM_12 — QUẢN LÝ KHO BỘ THẺ FLASHCARD DÙNG CHUNG & NHẬP ĐỀ THI TOEIC TỪ EXCEL

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_12` (Tương ứng `FNC_ADM_12`)
* **Tên Module:** Quản lý Kho Tài nguyên Flashcard Dùng chung & Nhập Đề thi TOEIC Chuẩn từ Excel (Master Content Management & Bulk TOEIC Excel Ingestion Engine)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_12_Kho_Flashcard_Va_Import_TOEIC_v3.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Master Content Management & Bulk TOEIC Ingestion Engine)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Quản trị viên (Admin) / Content Manager:** Tôi muốn khởi tạo, biên tập, nhập hàng loạt từ vựng từ tệp Excel vào bộ thẻ Flashcard và phê duyệt các bộ thẻ đóng góp (`is_public = true`) để xuất bản kho học liệu từ vựng dùng chung toàn hệ thống cho học viên.
* **Là Quản trị viên (Admin):** Tôi muốn nhập hàng loạt đề thi thử TOEIC Full Test chuẩn 200 câu hỏi từ tệp Excel chứa 7 Sheets cấu trúc (`Part 1` đến `Part 7`) chỉ bằng 1 thao tác upload duy nhất, nhằm tiết kiệm thời gian nhập liệu thủ công và đảm bảo tính chính xác 100% của đề thi.
* **Là Quản trị viên (Admin) / Giảng viên (Teacher):** Tôi muốn tải tệp Excel mẫu chuẩn (`template-excel`) gồm 7 Sheets định dạng sẵn để soạn thảo đề thi TOEIC không bị sai cấu trúc cột.
* **Là Hệ thống (System):** Tôi muốn đảm bảo quy trình nhập đề thi TOEIC mang tính **Nguyên tử (Atomic Transaction)** — nếu có bất kỳ lỗi validation nào ở 1 trong 200 câu (sai đáp án đúng, thiếu sheet, sai định dạng), toàn bộ giao dịch CSDL sẽ bị Rollback hoàn toàn để không sinh ra dữ liệu đề thi mồ côi/rác.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal) ]          [ Backend NestJS ]           [ PostgreSQL 16 / Excel Parser ]
              │                                 │                                    │
  ─── 1. POST /toeic/import-full-exam ─────────>│                                    │
      (title, audioFullUrl, file.xlsx)          │── 2. Read Workbook Buffer (xlsx) ──│
                                                │   (Check 7 Sheets: Part 1 .. 7)    │
                                                │                                    │
                                                │── 3. Parse & Validate Rows ────────│
                                                │   (Ensure exactly 200 questions)   │
                                                │   (Validate correctOption A..D)    │
                                                │                                    │
                                                │── 4. CSDL Transaction Batch ──────>│
                                                │   a. INSERT INTO toeic_exams       │
                                                │   b. INSERT INTO toeic_questions   │
                                                │      (chunk: 50)                   │
                                                │<─ (Transaction Commit / Rollback) ─│
                                                │                                    │
  <── 5. Response 201 Created Envelope ─────────│                                    │
```

#### A. Tiến trình Nhập Đề thi TOEIC Full Test từ Excel 7 Sheets (Bulk TOEIC Excel Ingestion Flow)
1. Admin chọn tệp Excel `.xlsx` đề thi và nhập thông tin `title` (Tên đề thi) cùng `audioFullUrl` (Link S3 đĩa mp3 nghe toàn bộ đề 120 phút). Trình duyệt gửi Yêu cầu `POST /api/v1/admin/toeic/import-full-exam`.
2. Backend NestJS `ToeicExcelImportService` tiếp nhận buffer tệp Excel và dùng thư viện `xlsx` để đọc workbook:
   * Kiểm tra sự tồn tại bắt buộc của đúng **7 Sheets** đặt tên theo chuẩn: `"Part 1"`, `"Part 2"`, `"Part 3"`, `"Part 4"`, `"Part 5"`, `"Part 6"`, `"Part 7"`. Thiếu bất kỳ sheet nào sẽ ném lỗi `ERR_VAL_001`.
   * Lặp qua từng sheet, parse các dòng dữ liệu thành danh sách câu hỏi `ToeicQuestionEntity`.
   * Kiểm tra tính hợp lệ của `correct_option` (bắt buộc thuộc tập `['A', 'B', 'C', 'D']`).
   * **Xử lý Part 1 & Part 2 (NULLable Options):** Kiểm tra nếu không có text phương án (do câu hỏi Part 1 & Part 2 trong đề thi chuẩn chỉ nghe audio không in text), thuộc tính `options` được gán giá trị `null` tự nhiên trong CSDL.
3. Kiểm tra tổng số lượng câu hỏi đã parse từ 7 Sheets:
   \[\sum_{p=1}^{7} N_{\text{part}_p} = 200\]
   Nếu tổng số câu \neq 200, hệ thống ngắt tiến trình và phản hồi lỗi `ERR_VAL_001` kèm thông số câu bị thiếu/thừa.
4. Mở **CSDL Transaction nguyên tử (`this.dataSource.transaction`)**:
   a. Insert 1 bản ghi đề thi mới vào bảng `toeic_exams` với `duration_minutes = 120`.
   b. Batch Insert 200 câu hỏi vào bảng `toeic_questions` chia thành các chunk 50 bản ghi (`chunk: 50`) để tối ưu bộ nhớ.
5. Phản hồi Response Envelope trả về `examId` và xác nhận nhập thành công.

#### B. Tiến trình Nhập Từ vựng vào Bộ thẻ Flashcard (Flashcard Excel Import Flow)
1. Content Manager chọn bộ thẻ target (`deck_id`) và upload tệp Excel từ vựng. Trình duyệt gửi Yêu cầu `POST /api/v1/admin/flashcards/decks/:id/import-words`.
2. Backend parse các cột `term`, `phonetic_ipa`, `part_of_speech`, `definition`, `example_sentence`, `example_translation`, `audio_url`, `collocations`, `synonyms`.
3. Mở **CSDL Transaction**: Batch Insert các từ vựng mới vào bảng `flashcards` liên kết với `deck_id`.

#### C. Tiến trình Phê duyệt Bộ thẻ Flashcard Công khai (Approve Deck Flow)
1. Admin kiểm tra nội dung bộ thẻ do giáo viên khởi tạo -> Gửi Yêu cầu `PUT /api/v1/admin/flashcards/decks/:id/approve`.
2. Backend cập nhật `flashcard_decks.is_public = true`. Bộ thẻ chính thức xuất hiện trên thư viện công khai dành cho toàn bộ học viên.

### 1.3. Quy tắc Nghiệp vụ & Barem Đề thi TOEIC ETS (Business Rules)

* **Phân bổ 200 Câu hỏi theo 7 Parts Đề thi TOEIC Chuẩn ETS:**

| Part | Tên Phần Thi | Loại Bài | Số Câu | Quy tắc Text & Phương án Options |
| :---: | :--- | :---: | :---: | :--- |
| **Part 1** | Photographs | Listening | 6 câu (1..6) | `options` có thể `null` (chỉ nghe Audio), `imageUrl` bắt buộc |
| **Part 2** | Question - Response | Listening | 25 câu (7..31) | `options` có thể `null` (chỉ 3 phương án A, B, C trong audio) |
| **Part 3** | Short Conversations | Listening | 39 câu (32..70) | `options` có đủ {A, B, C, D}, `audioUrl` / `transcript` đầy đủ |
| **Part 4** | Short Talks | Listening | 30 câu (71..100) | `options` có đủ {A, B, C, D}, `audioUrl` / `transcript` đầy đủ |
| **Part 5** | Incomplete Sentences | Reading | 30 câu (101..130) | `options` có đủ {A, B, C, D}, `questionText` bắt buộc |
| **Part 6** | Text Completion | Reading | 16 câu (131..146) | `options` có đủ {A, B, C, D}, `passageText` chứa đoạn văn khuyết |
| **Part 7** | Reading Comprehension | Reading | 54 câu (147..200)| `options` có đủ {A, B, C, D}, `passageText` chứa đoạn văn đọc |

* **Cấu trúc JSONB Options trong CSDL:**
  ```json
  // Trường hợp Part 3 - Part 7 (Đầy đủ 4 phương án):
  { "A": "increases", "B": "increasing", "C": "increased", "D": "increasingly" }

  // Trường hợp Part 1 - Part 2 (Audio Only / Không in text):
  null
  ```

* **Quy tắc Giao dịch Nguyên tử (Atomic Transaction Rule):**
  \[\text{Commit Transaction} \iff \left( \text{Excel Valid} \land \sum \text{Questions} = 200 \land \forall q, \text{correctOption}_q \in \{'A','B','C','D'\} \right)\]
  Nếu vi phạm bất kỳ điều kiện nào, câu lệnh `ROLLBACK` lập tức được thực thi, đảm bảo 0 bản ghi rác được lưu vào CSDL.

---
## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `toeic_exams` (Đề Thi Thử TOEIC Full Test)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(200)`, NOT NULL - Tên đề thi, e.g. "ETS TOEIC 2024 Test 01")
* `duration_minutes` (`INT`, DEFAULT 120, NOT NULL)
* `audio_full_url` (`TEXT`, NULLABLE - Link S3 file audio tổng 120 phút)
* `is_active` (`BOOLEAN`, DEFAULT `true`, NOT NULL)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### B. Bảng `toeic_questions` (Ngân hàng 200 Câu hỏi Đề thi TOEIC)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `exam_id` (`UUID`, Foreign Key -> `toeic_exams(id)` ON DELETE CASCADE, NOT NULL)
* `part_number` (`SMALLINT`, NOT NULL, CHECK `part_number BETWEEN 1 AND 7`)
* `question_number` (`INT`, NOT NULL - Số thứ tự câu từ 1 đến 200)
* `passage_text` (`TEXT`, NULLABLE - Đoạn văn bài đọc Part 6 & Part 7)
* `image_url` (`TEXT`, NULLABLE - Ảnh minh họa Part 1 & Part 7)
* `audio_url` (`TEXT`, NULLABLE - File audio câu hỏi riêng)
* `question_text` (`TEXT`, NULLABLE - Nội dung câu hỏi)
* `options` (`JSONB`, NULLABLE - { "A": "...", "B": "...", "C": "...", "D": "..." } hoặc NULL)
* `correct_option` (`CHAR(1)`, NOT NULL, CHECK `correct_option IN ('A', 'B', 'C', 'D')`)
* `explanation` (`TEXT`, NULLABLE - Lời giải chi tiết)
* `transcript` (`TEXT`, NULLABLE - Lời thoại bài nghe Part 1 - Part 4)

#### C. Bảng `flashcard_decks` (Kho Bộ thẻ Từ vựng Dùng chung)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `title` (`VARCHAR(200)`, NOT NULL)
* `description` (`TEXT`, NULLABLE)
* `level` (`cefr_level_enum`, DEFAULT `'A1'`, NOT NULL)
* `topic_code` (`VARCHAR(50)`, DEFAULT `'GENERAL'`, NOT NULL)
* `thumbnail_url` (`TEXT`, NULLABLE)
* `is_public` (`BOOLEAN`, DEFAULT `true`, NOT NULL)
* `created_by` (`UUID`, Foreign Key -> `users(id)` ON DELETE SET NULL, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### D. Bảng `flashcards` (Danh mục Từ vựng trong Bộ thẻ)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `deck_id` (`UUID`, Foreign Key -> `flashcard_decks(id)` ON DELETE CASCADE, NOT NULL)
* `term` (`VARCHAR(150)`, NOT NULL - Từ vựng gốc)
* `phonetic_ipa` (`VARCHAR(100)`, NULLABLE)
* `part_of_speech` (`VARCHAR(50)`, NULLABLE)
* `definition` (`TEXT`, NOT NULL)
* `example_sentence` (`TEXT`, NULLABLE)
* `example_translation` (`TEXT`, NULLABLE)
* `audio_url` (`TEXT`, NULLABLE)
* `audio_slow_url` (`TEXT`, NULLABLE)
* `image_url` (`TEXT`, NULLABLE)
* `collocations` (`JSONB`, DEFAULT `'[]'::jsonb`)
* `synonyms` (`JSONB`, DEFAULT `'[]'::jsonb`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_toeic_questions_exam_part ON toeic_questions(exam_id, part_number, question_number);`
* `CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);`
* `CREATE INDEX idx_decks_level ON flashcard_decks(level);`

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE flashcard_status_enum AS ENUM ('NEW', 'LEARNING', 'MASTERED');
```

### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: `03_api-endpoints-specification-v11.md`.

| STT | Method | Endpoint URI | Phân quyền | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `POST` | `/api/v1/admin/flashcards/decks/:id/import-words` | Admin / Content Manager | Nhập từ vựng hàng loạt vào bộ thẻ Flashcard từ file Excel |
| **2** | `PUT` | `/api/v1/admin/flashcards/decks/:id/approve` | Admin | Phê duyệt bộ thẻ do giáo viên đóng góp lên thư viện công khai (`is_public = true`) |
| **3** | `POST` | `/api/v1/admin/toeic/import-full-exam` | Admin | Nhập đề thi TOEIC Full Test 200 câu từ file Excel (7 Sheets) |
| **4** | `GET` | `/api/v1/admin/toeic/template-excel` | Admin / Teacher | Tải tệp Excel mẫu chuẩn 7 Sheets phục vụ biên soạn đề thi |
| **62** | `POST` | `/api/v1/admin/toeic/exams` | Admin | **[Chuẩn hóa v11]** Tạo hoặc cập nhật cấu hình đề thi TOEIC 200 câu mới |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Nhập đề thi TOEIC Full Test thành công",
  "data": {
    "examId": "e1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "examTitle": "ETS TOEIC 2024 Test 01",
    "totalQuestions": 200,
    "durationMinutes": 120,
    "audioFullUrl": "https://storage.toeic.edu.vn/audio/ets2024_test01_full.mp3",
    "importedParts": [
      {
        "partNumber": 1,
        "questionCount": 6
      },
      {
        "partNumber": 2,
        "questionCount": 25
      },
      {
        "partNumber": 3,
        "questionCount": 39
      },
      {
        "partNumber": 4,
        "questionCount": 30
      },
      {
        "partNumber": 5,
        "questionCount": 30
      },
      {
        "partNumber": 6,
        "questionCount": 16
      },
      {
        "partNumber": 7,
        "questionCount": 54
      }
    ]
  },
  "timestamp": "2026-10-12T23:30:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/admin/flashcards/decks/:id/import-words` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Bộ thẻ mình tạo) | **○** (Toàn quyền) |
| `PUT /api/v1/admin/flashcards/decks/:id/approve` | **×** (Chặn 403) | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền Admin) |
| `POST /api/v1/admin/toeic/import-full-exam` | **×** (Chặn 403) | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền Admin) |
| `GET /api/v1/admin/toeic/template-excel` | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Cho phép) | **○** (Toàn quyền) |
| `POST /api/v1/admin/toeic/exams` | **×** (Chặn 403) | **×** (Chặn 403) | **×** (Chặn 403) | **○** (Toàn quyền Admin) |

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * `src/modules/toeic-admin/entities/toeic-exam.entity.ts`
  * `src/modules/toeic-admin/entities/toeic-question.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/toeic-admin/entities/toeic-exam.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ToeicQuestionEntity } from './toeic-question.entity';

@Entity('toeic_exams')
export class ToeicExamEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'int', default: 120, name: 'duration_minutes' })
  durationMinutes!: number;

  @Column({ type: 'text', nullable: true, name: 'audio_full_url' })
  audioFullUrl!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ToeicQuestionEntity, (question) => question.exam)
  questions!: ToeicQuestionEntity[];
}

// src/modules/toeic-admin/entities/toeic-question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ToeicExamEntity } from './toeic-exam.entity';

@Entity('toeic_questions')
export class ToeicQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'exam_id' })
  examId!: string;

  @ManyToOne(() => ToeicExamEntity, (exam) => exam.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: ToeicExamEntity;

  @Column({ type: 'smallint', name: 'part_number' })
  partNumber!: number;

  @Column({ type: 'int', name: 'question_number' })
  questionNumber!: number;

  @Column({ type: 'text', nullable: true, name: 'passage_text' })
  passageText!: string | null;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'audio_url' })
  audioUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'question_text' })
  questionText!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options!: Record<string, string> | null;

  @Column({ type: 'char', length: 1, name: 'correct_option' })
  correctOption!: 'A' | 'B' | 'C' | 'D';

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'text', nullable: true })
  transcript!: string | null;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại Services & Transaction Batch

* **Tệp tin khởi tạo:** `src/modules/toeic-admin/toeic-excel-import.service.ts`
* **Chức năng:** Parse tệp Excel 7 Sheets, validate đúng 200 câu hỏi, bọc Transaction nguyên tử và lưu chunk 50.

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { DataSource, EntityManager } from 'typeorm';
import { ToeicExamEntity } from './entities/toeic-exam.entity';
import { ToeicQuestionEntity } from './entities/toeic-question.entity';

@Injectable()
export class ToeicExcelImportService {
  private readonly logger = new Logger(ToeicExcelImportService.name);

  constructor(private readonly dataSource: DataSource) {}

  async importFullExam(title: string, audioFullUrl: string | undefined, fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const questionsToInsert: Partial<ToeicQuestionEntity>[] = [];

    // Parse lần lượt từ Sheet Part 1 đến Part 7
    for (let part = 1; part <= 7; part++) {
      const sheetName = `Part ${part}`;
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new BadRequestException({
          errorCode: 'ERR_VAL_001',
          message: `Tệp Excel thiếu Sheet cấu trúc bắt buộc: "${sheetName}".`,
        });
      }

      const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet);
      rows.forEach((row, index) => {
        const qNum = parseInt(String(row['question_number'] || row['STT'] || index + 1), 10);
        const correctOpt = String(row['correct_option'] || row['Đáp án đúng'] || '').toUpperCase().trim();

        if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
          throw new BadRequestException({
            errorCode: 'ERR_VAL_001',
            message: `Lỗi tại Sheet ${sheetName}, Dòng ${index + 2} (Câu ${qNum}): Đáp án đúng không hợp lệ ("${correctOpt}").`,
          });
        }

        // Xử lý Part 1 & Part 2: options có thể NULL nếu đề thi không in text phương án
        let options: Record<string, string> | null = null;
        const optA = String(row['option_a'] || row['A'] || '').trim();
        const optB = String(row['option_b'] || row['B'] || '').trim();
        const optC = String(row['option_c'] || row['C'] || '').trim();
        const optD = String(row['option_d'] || row['D'] || '').trim();

        if (optA || optB || optC || part >= 3) {
          options = { A: optA, B: optB, C: optC };
          if (optD) options.D = optD;
        }

        questionsToInsert.push({
          partNumber: part,
          questionNumber: qNum,
          questionText: (row['question_text'] || row['Nội dung câu hỏi'] || null) as string | null,
          passageText: (row['passage_text'] || row['Đoạn văn đọc'] || null) as string | null,
          imageUrl: (row['image_url'] || row['Ảnh đính kèm'] || null) as string | null,
          audioUrl: (row['audio_url'] || row['Audio riêng'] || null) as string | null,
          options,
          correctOption: correctOpt as 'A' | 'B' | 'C' | 'D',
          explanation: (row['explanation'] || row['Giải thích chi tiết'] || null) as string | null,
          transcript: (row['transcript'] || row['Lời thoại bài nghe'] || null) as string | null,
        });
      });
    }

    // Kiểm tra tổng số lượng câu hỏi bắt buộc phải đúng 200 câu
    if (questionsToInsert.length !== 200) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: `Đề thi TOEIC Full Test bắt buộc phải có đúng 200 câu. Tệp của bạn hiện có: ${questionsToInsert.length} câu.`,
      });
    }

    // CSDL Transaction Nguyên tử (Atomic)
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const exam = manager.create(ToeicExamEntity, {
        title,
        durationMinutes: 120,
        audioFullUrl: audioFullUrl || null,
        isActive: true,
      });
      const savedExam = await manager.save(exam);

      const finalQuestions = questionsToInsert.map((q) => ({
        ...q,
        examId: savedExam.id,
      }));

      // Batch Insert 200 câu hỏi chia thành các chunk 50
      await manager.save(ToeicQuestionEntity, finalQuestions, { chunk: 50 });
      this.logger.log(`Đã nhập thành công đề thi TOEIC: "${title}" (200 câu hỏi).`);

      return {
        examId: savedExam.id,
        examTitle: savedExam.title,
        totalQuestions: 200,
        durationMinutes: 120,
        audioFullUrl: savedExam.audioFullUrl,
      };
    });
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại Controllers & RBAC

* **Tệp tin khởi tạo:** `src/modules/toeic-admin/toeic-excel-import-admin.controller.ts`
* **Chức năng:** Route HTTP `POST /api/v1/admin/toeic/import-full-exam`, gắn Interceptor `UseInterceptors(FileInterceptor('file'))`, Guard `@Roles(UserRole.ADMIN)`.

```typescript
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ToeicExcelImportService } from './toeic-excel-import.service';
import { ImportToeicExamDto } from './dto/import-toeic-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/toeic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ToeicExcelImportAdminController {
  constructor(private readonly importService: ToeicExcelImportService) {}

  @Post('import-full-exam')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importFullExam(
    @Body() dto: ImportToeicExamDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Vui lòng chọn tệp Excel (.xlsx) đề thi TOEIC để tải lên.',
      });
    }

    return await this.importService.importFullExam(dto.title, dto.audioFullUrl, file.buffer);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/toeic-admin-hooks.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface ImportToeicExamPayload {
  title: string;
  audioFullUrl?: string;
  file: File;
}

export const useImportToeicFullExamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, audioFullUrl, file }: ImportToeicExamPayload) => {
      const formData = new FormData();
      formData.append('title', title);
      if (audioFullUrl) formData.append('audioFullUrl', audioFullUrl);
      formData.append('file', file);

      const response = await apiClient.post('/admin/toeic/import-full-exam', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'toeic-exams'] });
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
* [x] **Trụ cột 2: Integrity & Atomic Import Performance**
  * Đảm bảo giao dịch CSDL mang tính **Nguyên tử (Atomic Transaction)** — 200 câu được lưu hoặc Rollback 100%.
  * Batch Insert chia chunk 50 bản ghi (`chunk: 50`) để tối ưu hiệu năng và bộ nhớ RAM.
* [x] **Trụ cột 3: Bảo mật & RBAC Scope**
  * Bào vệ Endpoint nhập đề thi bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN)`.
  * Khóa tuyệt đối đối với vai trò `STUDENT` và `GUEST` (HTTP 403 Forbidden).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
