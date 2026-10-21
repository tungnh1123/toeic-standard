### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_11 — CẢNH BÁO TỰ ĐỘNG HỌC VIÊN NỘP MUỘN, CHƯA LÀM BÀI HOẶC ĐIỂM TỤT DỐC - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_11
* **Tên chức năng:** Hệ thống cảnh báo sớm rủi ro học tập tự động (Early Academic Risk Detection & Automated Alert Engine)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin), Cron Worker
* **Mục tiêu nghiệp vụ:**
  * Tự động nhận diện 3 mô hình rủi ro: Cảnh báo Quá hạn nộp bài (`OVERDUE_TASK`), Cảnh báo Chuyên cần đứt chuỗi (`STREAK_AT_RISK`), Cảnh báo Tụt dốc phong độ (`PERFORMANCE_DROP`).
  * **Chuẩn hóa v2.0 (Bổ sung Bảng DDL & Sửa Lỗi SQL Cron Job):** Sửa câu lệnh SQL Cron Job quét `assignment_targets.due_date` (thay vì `assignments.due_date`), bổ sung bảng `student_academic_alerts` vào CSDL Master DDL v11.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)
##### 2.1. DDL Script PostgreSQL 16
```sql
CREATE TYPE alert_type_enum AS ENUM ('OVERDUE_TASK', 'STREAK_AT_RISK', 'PERFORMANCE_DROP', 'ABSENTEEISM');
CREATE TYPE alert_severity_enum AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TABLE IF NOT EXISTS student_academic_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    alert_type alert_type_enum NOT NULL,
    severity_level alert_severity_enum DEFAULT 'WARNING' NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_student ON student_academic_alerts(student_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_class ON student_academic_alerts(class_id, created_at DESC);
```

--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & CRON JOBS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/classes/:id/alerts | Teacher/Admin | Lấy danh sách học viên bị cảnh báo trong lớp |
| 2 | POST | /api/v1/admin/alerts/bulk-remind | Teacher/Admin | Gửi thông báo nhắc nhở 1-chạm cho danh sách học viên nộp muộn |
| 3 | PUT | /api/v1/admin/alerts/:id/resolve | Teacher/Admin | Đánh dấu cảnh báo đã được giáo viên liên hệ can thiệp |

##### 3.2. Worker Quét Rủi ro Học tập (AcademicRiskWorker)
```typescript
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

  @Cron('0 8 * * *')
  async scanOverdueAssignments() {
    this.logger.log('Đang quét các bài tập quá hạn chưa nộp...');

    // Sửa lỗi SQL V11: Quét t.due_date từ assignment_targets và t.class_id
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

    this.logger.log(`Phát hiện và ghi nhận ${overdueList.length} trường hợp nộp muộn.`);
  }
}
```

--------------------------------------------------------------------------------

#### 4. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
1. **Chống Spam Cảnh báo**: Với cùng 1 bài tập quá hạn (`reference_id = assignment_id`), hệ thống chỉ sinh cảnh báo duy nhất 1 lần.
2. **Tự động Gỡ cờ**: Cảnh báo `OVERDUE_TASK` tự động gỡ (`is_resolved = true`) khi học viên hoàn thành nộp bài.
