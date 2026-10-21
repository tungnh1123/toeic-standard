### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_08 — STUDIO CHẤM BÀI SPEAKING (WAVESURFER SÓNG ÂM, GẮN COMMENT THEO MỐC GIÂY) - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_08
* **Mã màn hình giao diện:** ADM0303 (Speaking Grading Studio)
* **Tên chức năng:** Studio chấm bài Speaking trực quan qua sóng âm WaveSurfer & Phản hồi theo mốc thời gian (Speaking Waveform Studio & Timestamp Audio Annotation)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp giao diện phòng chấm bài Nói (Speaking) hiện đại tích hợp thư viện vẽ sóng âm thanh thời gian thực WaveSurfer.js.
  * Tích hợp công cụ **Cắm cờ & Gắn nhận xét theo mốc thời gian (Timestamped Markers & Audio Regions)**:
    * Click vào bất kỳ giây nào trên sóng âm để tạo cờ phản hồi (Marker at $t$ seconds).
    * Học viên khi nhận kết quả chỉ cần bấm vào mốc thời gian thì trình phát sẽ tự động nhảy đến đúng giây đó để phát âm thanh.
  * Chấm điểm Rubric 4 tiêu chí nói: Phát âm & Trọng âm (`pronunciation`), Ngữ điệu (`intonation_stress`), Độ trôi chảy (`fluency`), Ngữ pháp & Từ vựng (`grammar_vocabulary`).
  * **Chuẩn hóa v2.0:** Dùng chung API `POST /api/v1/admin/submissions/:id/review` để lưu nháp/công bố kết quả chấm. Khi công bố (`status = 'GRADED'`), hệ thống tự động cập nhật `assignment_targets.is_completed = true` (dựa trên `assignment_id`, `student_id`, `class_id`) và đẩy thông báo ngầm qua BullMQ.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)
##### 2.1. Cấu trúc trường inline_feedback cho Speaking (JSONB Specification)
```json
[
  {
    "id": "ts_marker_01",
    "start_time": 14.2,
    "end_time": 16.8,
    "display_time": "00:14 - 00:16",
    "error_type": "PRONUNCIATION",
    "severity": "MAJOR",
    "comment": "Từ 'passengers' phát âm thiếu âm đuôi /z/ ở cuối.",
    "created_at": "2026-10-12T15:10:00.000Z"
  }
]
```

--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/submissions/:id | Teacher/Admin | Lấy audio bài nói qua S3 Presigned GET URL, rubric và timeline comment |
| 2 | POST | /api/v1/admin/submissions/:id/review | Teacher/Admin | Lưu nháp hoặc xuất bản kết quả bài nói (criteriaScores, inlineFeedback timestamp, feedbackAudioUrl) |

##### 3.2. Data Transfer Objects (DTOs) & Validation
```typescript
import { IsNotEmpty, IsNumber, Min, Max, IsObject, IsArray, ValidateNested, IsString, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimestampFeedbackItemDto {
  @IsString()
  id: string;

  @IsNumber()
  @Min(0)
  startTime: number;

  @IsNumber()
  @Min(0)
  endTime: number;

  @IsString()
  displayTime: string;

  @IsIn(['PRONUNCIATION', 'INTONATION', 'FLUENCY', 'GRAMMAR_VOCAB'])
  errorType: 'PRONUNCIATION' | 'INTONATION' | 'FLUENCY' | 'GRAMMAR_VOCAB';

  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class SpeakingCriteriaScoresDto {
  @IsNumber()
  @Min(0)
  @Max(25)
  pronunciation: number;

  @IsNumber()
  @Min(0)
  @Max(25)
  intonation_stress: number;

  @IsNumber()
  @Min(0)
  @Max(25)
  fluency: number;

  @IsNumber()
  @Min(0)
  @Max(25)
  grammar_vocabulary: number;
}

export class SubmitSpeakingReviewDto {
  @ApiProperty({ type: SpeakingCriteriaScoresDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SpeakingCriteriaScoresDto)
  criteriaScores: SpeakingCriteriaScoresDto;

  @ApiProperty({ type: [TimestampFeedbackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimestampFeedbackItemDto)
  inlineFeedback: TimestampFeedbackItemDto[];

  @ApiPropertyOptional({ example: 'Phát âm to rõ ràng, cần luyện thêm nối âm Linking words.' })
  @IsOptional()
  @IsString()
  generalComment?: string;

  @ApiPropertyOptional({ description: 'File audio nhận xét giọng nói của giáo viên' })
  @IsOptional()
  @IsString()
  feedbackAudioUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isPublished?: boolean;
}
```

--------------------------------------------------------------------------------

#### 4. QUY TẮC NGHIỆP VỤ & KIỂM TRA HỢP LỆ (BUSINESS RULES)
1. **Bảo mật Audio Presigned URL**: Audio bài nộp của học viên được bảo vệ trên Cloud Storage, Backend chỉ cấp Presigned GET URL có hiệu lực trong 60 phút cho giáo viên được phân công chấm.
2. **Đồng bộ Hoàn thành Bài tập**: Khi công bố kết quả chấm (`isPublished = true`), hệ thống tự động cập nhật `is_completed = true` trong `assignment_targets` dựa trên `assignment_id`, `student_id` và `class_id`.
