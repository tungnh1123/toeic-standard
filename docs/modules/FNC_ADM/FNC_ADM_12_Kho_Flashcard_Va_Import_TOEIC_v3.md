### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_12 — QUẢN LÝ KHO BỘ THẺ FLASHCARD DÙNG CHUNG & NHẬP ĐỀ THI TOEIC TỪ EXCEL - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_12
* **Tên chức năng:** Quản lý kho tài nguyên Flashcard dùng chung & Nhập đề thi TOEIC chuẩn từ Excel (Master Content Management & Bulk TOEIC Excel Ingestion)
* **Đối tượng sử dụng (Actors):** Quản trị viên (Admin), Giảng viên phân quyền Content Manager
* **Mục tiêu nghiệp vụ:**
  * Khởi tạo, biên tập & phê duyệt kho bộ thẻ Flashcard công khai (`is_public = true`).
  * Nhập hàng loạt đề thi TOEIC chuẩn ETS Full Test (200 câu hỏi từ 7 Sheets Excel).
  * **Chuẩn hóa v2.0 (Xử lý TOEIC Part 1 & Part 2 NULLable Options):** Đối với câu hỏi Part 1 & Part 2 không có text phương án, `options` được gán `null` tự nhiên trong CSDL.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 2.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/admin/flashcards/decks/:id/import-words | Admin | Nhập từ vựng hàng loạt vào bộ thẻ từ file Excel |
| 2 | PUT | /api/v1/admin/flashcards/decks/:id/approve | Admin | Phê duyệt bộ thẻ do giáo viên đóng góp lên công khai |
| 3 | POST | /api/v1/admin/toeic/import-full-exam | Admin | Nhập đề thi TOEIC Full Test 200 câu từ file Excel (7 Sheets) |
| 4 | GET | /api/v1/admin/toeic/template-excel | Admin/Teacher | Tải tệp Excel mẫu chuẩn 7 Sheets phục vụ nhập đề |

##### 2.2. Dịch vụ Xử lý Import Đề thi TOEIC (ToeicExcelImportService)
```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { DataSource } from 'typeorm';
import { ToeicExamEntity } from '../entities/toeic-exam.entity';
import { ToeicQuestionEntity } from '../entities/toeic-question.entity';

@Injectable()
export class ToeicExcelImportService {
  private readonly logger = new Logger(ToeicExcelImportService.name);

  constructor(private readonly dataSource: DataSource) {}

  async importFullExam(title: string, audioFullUrl: string, fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const questionsToInsert: Partial<ToeicQuestionEntity>[] = [];

    for (let part = 1; part <= 7; part++) {
      const sheetName = `Part ${part}`;
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new BadRequestException({ errorCode: 'ERR_VAL_001', message: `Tệp Excel thiếu Sheet cấu trúc: "${sheetName}"` });
      }

      const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet);
      rows.forEach((row) => {
        const qNum = parseInt(row['question_number'] || row['STT']);
        const correctOpt = (row['correct_option'] || row['Đáp án đúng'] || '').toString().toUpperCase().trim();

        if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
          throw new BadRequestException({ errorCode: 'ERR_VAL_001', message: `Lỗi tại Part ${part}, Câu ${qNum}: Đáp án đúng không hợp lệ ("${correctOpt}")` });
        }

        // Với Part 1 & Part 2: options có thể NULL nếu không in text phương án
        let options: Record<string, string> | null = null;
        if (part >= 3 || row['option_a'] || row['A']) {
          options = {
            A: row['option_a'] || row['A'] || '',
            B: row['option_b'] || row['B'] || '',
            C: row['option_c'] || row['C'] || '',
          };
          if (row['option_d'] || row['D']) {
            options.D = row['option_d'] || row['D'];
          }
        }

        questionsToInsert.push({
          partNumber: part,
          questionNumber: qNum,
          questionText: row['question_text'] || row['Nội dung câu hỏi'] || null,
          passageText: row['passage_text'] || row['Đoạn văn đọc'] || null,
          imageUrl: row['image_url'] || row['Ảnh đính kèm'] || null,
          audioUrl: row['audio_url'] || row['Audio riêng'] || null,
          options,
          correctOption: correctOpt,
          explanation: row['explanation'] || row['Giải thích chi tiết'] || '',
          transcript: row['transcript'] || row['Lời thoại bài nghe'] || '',
        });
      });
    }

    if (questionsToInsert.length !== 200) {
      throw new BadRequestException({ errorCode: 'ERR_VAL_001', message:  });
        `Đề thi TOEIC Full Test bắt buộc phải đúng 200 câu. Tệp của bạn có: ${questionsToInsert.length} câu.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const exam = manager.create(ToeicExamEntity, {
        title,
        durationMinutes: 120,
        audioFullUrl,
        isActive: true,
      });
      const savedExam = await manager.save(exam);

      const finalQuestions = questionsToInsert.map((q) => ({
        ...q,
        examId: savedExam.id,
      }));

      await manager.save(ToeicQuestionEntity, finalQuestions, { chunk: 50 });
      this.logger.log(`Đã nhập thành công đề thi TOEIC: "${title}" (200 câu hỏi).`);

      return {
        success: true,
        examId: savedExam.id,
        examTitle: savedExam.title,
        totalQuestions: 200,
      };
    });
  }
}
```

--------------------------------------------------------------------------------

#### 3. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
1. **Atomic Import**: Nếu 1 trong 200 câu bị lỗi, toàn bộ Transaction bị Rollback hoàn toàn.
2. **Cấu trúc 200 câu bắt buộc**: Part 1 (6 câu), Part 2 (25 câu), Part 3 (39 câu), Part 4 (30 câu), Part 5 (30 câu), Part 6 (16 câu), Part 7 (54 câu).
