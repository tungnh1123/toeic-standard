### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_09 — THU ÂM PHẢN HỒI BẰNG GIỌNG NÓI TRỰC TIẾP CỦA GIẢNG VIÊN - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_09
* **Tên chức năng:** Thu âm phản hồi bằng giọng nói trực tiếp của Giảng viên (Teacher Voice Feedback Recorder & Speech Modeling)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp tính năng thu âm phản hồi bằng giọng nói (Voice Note / Audio Feedback) trực tiếp trên trình duyệt Web (Next.js 14) trong lúc chấm bài Speaking hoặc Writing.
  * Giới hạn thời lượng ghi âm: Tối đa **300 giây (5 phút)**.
  * **Xử lý Kỹ thuật Audio An toàn theo Rule Backend:** Thu âm qua Web Audio API / MediaRecorder, cấp S3 Presigned PUT URL để Client upload trực tiếp file `.webm` / `.m4a` lên Cloud Storage, lưu `fileKey` vào `submission_reviews.feedback_audio_url`.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 2.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/admin/submissions/:id/voice-feedback/presigned-url | Teacher/Admin | Cấp S3 Presigned PUT URL để tải file ghi âm nhận xét giọng nói lên S3 |
| 2 | DELETE | /api/v1/admin/submissions/:id/voice-feedback | Teacher/Admin | Xóa file ghi âm nhận xét đã tải lên trên S3 và xóa feedbackAudioUrl trong CSDL |

##### 2.2. Dịch vụ Xử lý Cấp URL S3 (VoiceFeedbackService)
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DataSource } from 'typeorm';
import { SubmissionReviewEntity } from '../entities/submission-review.entity';

@Injectable()
export class VoiceFeedbackService {
  private s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generateUploadUrl(submissionId: string, teacherId: string, mimeType: string) {
    const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
    const fileKey = `feedbacks/${submissionId}/teacher_${teacherId}_${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
      Key: fileKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      fileKey,
      expiresIn: 900,
    };
  }

  async removeVoiceFeedback(submissionId: string, teacherId: string) {
    const reviewRepo = this.dataSource.getRepository(SubmissionReviewEntity);
    const review = await reviewRepo.findOne({ where: { submissionId, teacherId } });

    if (!review || !review.feedbackAudioUrl) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Không tìm thấy file ghi âm nhận xét cần xóa' });
    }

    const command = new DeleteObjectCommand({
      Bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
      Key: review.feedbackAudioUrl,
    });
    await this.s3Client.send(command);

    review.feedbackAudioUrl = null;
    await reviewRepo.save(review);

    return { success: true, message: 'Đã xóa file audio phản hồi thành công' };
  }
}
```

--------------------------------------------------------------------------------

#### 3. QUY TẮC NGHIỆP VỤ & BẢO MẬT (BUSINESS RULES)
1. **Giới hạn thời lượng**: Client tự động ngắt ghi âm khi bộ đếm đạt 300 giây (5 phút).
2. **Presigned URL Expiry**: URL upload S3 chỉ có hiệu lực trong 15 phút (900 giây).
