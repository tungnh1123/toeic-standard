### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_10 — BÁO CÁO & DASHBOARD GIÁM SÁT TIẾN ĐỘ ĐÀO TẠO CỦA LỚP HỌC - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_10
* **Tên chức năng:** Dashboard giám sát tiến độ đào tạo & Báo cáo phân tích lớp học (Class Analytics Dashboard & Training Progress Tracker)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp bức tranh toàn diện về tiến độ và kết quả học tập của các lớp học được phân công giảng dạy.
  * Tỷ lệ nộp bài tập, Điểm trung bình lớp, Phân bổ phổ điểm, Bảng xếp hạng chuyên cần (Streak Leaderboard).
  * **Chuẩn hóa v2.0 (Sửa lỗi SQL Join):** Truy vấn JOIN trực tiếp qua `class_id` ở cả `assignment_targets` và `assignment_submissions` để triệt tiêu lỗi nhân bản bản ghi (Cartesian Product) khi học viên thuộc nhiều lớp. Cache kết quả Redis trong 5 phút.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 2.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/classes/:id/dashboard-metrics | Teacher/Admin | Lấy toàn bộ chỉ số KPI tổng hợp của lớp học (Cache Redis 5m) |
| 2 | GET | /api/v1/admin/classes/:id/students-progress | Teacher/Admin | Danh sách học viên trong lớp kèm điểm số và tiến độ chi tiết |
| 3 | GET | /api/v1/admin/classes/:id/score-distribution | Teacher/Admin | Dữ liệu biểu đồ phân bổ phổ điểm theo khoảng (Histogram) |
| 4 | GET | /api/v1/admin/classes/:id/export-excel | Teacher/Admin | Xuất bảng điểm và tiến độ lớp ra tệp Excel (.xlsx) |

##### 2.2. Dịch vụ Xử lý Báo cáo Lớp học (ClassAnalyticsService)
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ClassAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getClassMetrics(classId: string, teacherId: string, isAdmin: boolean) {
    const classInfo = await this.dataSource.query(
      `SELECT id, name, code, teacher_id FROM classes WHERE id = $1`,
      [classId],
    );
    if (classInfo.length === 0) throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Lớp học không tồn tại' });
    if (!isAdmin && classInfo[0].teacher_id !== teacherId) {
      throw new NotFoundException({ errorCode: 'ERR_AUTH_003', message: 'Bạn không được phân công giảng dạy lớp học này' });
    }

    // Truy vấn chuẩn hóa V11: JOIN chính xác theo class_id
    const summaryData = await this.dataSource.query(
      `
      SELECT 
        COUNT(DISTINCT ce.student_id)::int AS "totalStudents",
        COUNT(DISTINCT t.assignment_id)::int AS "totalAssignments",
        COUNT(DISTINCT t.id)::int AS "totalTargetInstances",
        COUNT(DISTINCT CASE WHEN t.is_completed = true THEN t.id END)::int AS "completedInstances",
        ROUND(COALESCE(AVG(r.total_score), 0), 1) AS "avgClassScore",
        ROUND(COALESCE(AVG(CASE WHEN a.type = 'WRITING' THEN r.total_score END), 0), 1) AS "avgWriting",
        ROUND(COALESCE(AVG(CASE WHEN a.type = 'SPEAKING' THEN r.total_score END), 0), 1) AS "avgSpeaking",
        ROUND(COALESCE(AVG(CASE WHEN a.type = 'QUIZ' THEN r.total_score END), 0), 1) AS "avgQuiz"
      FROM class_enrollments ce
      LEFT JOIN assignment_targets t ON t.student_id = ce.student_id AND t.class_id = ce.class_id
      LEFT JOIN assignments a ON a.id = t.assignment_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ce.student_id AND s.class_id = ce.class_id
      LEFT JOIN submission_reviews r ON r.submission_id = s.id
      WHERE ce.class_id = $1
      `,
      [classId],
    );

    const s = summaryData[0];
    const totalInstances = Number(s.totalTargetInstances) || 1;
    const completedInstances = Number(s.completedInstances) || 0;
    const completionRate = Math.round((completedInstances / totalInstances) * 100);

    return {
      classId,
      className: classInfo[0].name,
      classCode: classInfo[0].code,
      totalStudents: Number(s.totalStudents) || 0,
      totalAssignments: Number(s.totalAssignments) || 0,
      overallCompletionRate: completionRate,
      averageClassScore: Number(s.avgClassScore) || 0,
      avgWritingScore: Number(s.avgWriting) || 0,
      avgSpeakingScore: Number(s.avgSpeaking) || 0,
      avgQuizScore: Number(s.avgQuiz) || 0,
    };
  }
}
```

--------------------------------------------------------------------------------

#### 3. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
1. **Phân quyền Xem Báo cáo**: Giảng viên chỉ xem lớp mình dạy (`classes.teacher_id = current_user_id`). Admin xem toàn trường.
2. **Cache Redis**: Dữ liệu KPI được cache 5 phút (`class_metrics:${classId}`).
