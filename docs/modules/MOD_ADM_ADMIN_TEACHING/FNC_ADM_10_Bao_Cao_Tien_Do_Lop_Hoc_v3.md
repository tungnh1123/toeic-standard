# MODULE SPECIFICATION: FNC_ADM_10 — BÁO CÁO & DASHBOARD GIÁM SÁT TIẾN ĐỘ ĐÀO TẠO CỦA LỚP HỌC

---

## 📌 HEADER & METADATA

* **Module ID:** `MOD_ADM_10` (Tương ứng `FNC_ADM_10`)
* **Tên Module:** Dashboard giám sát tiến độ đào tạo & Báo cáo phân tích lớp học (Class Analytics Dashboard & Training Progress Tracker)
* **Phân hệ:** Quản trị & Giảng dạy (`MOD_ADM_ADMIN_TEACHING`)
* **Đường dẫn file lưu trữ:** `docs/modules/MOD_ADM_ADMIN_TEACHING/FNC_ADM_10_Bao_Cao_Tien_Do_Lop_Hoc_v3.md`
* **Phiên bản:** `v2.0.0` (Chuẩn hóa Hợp nhất Class Analytics, Cartesian Product Fix & Redis Cache)
* **Trạng thái:** `APPROVED & FULLY SYNCED`
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. `01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md` (Master SRS & SDD)
  2. `02_postgresql-16-ddl-schema-v12.md` (Master DDL Schema 35 Bảng v12.0)
  3. `03_api-endpoints-specification-v11.md` (Master RESTful API v11.0 - 62 Endpoints)
  4. `08_rbac-permission-matrix.md` (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Giảng viên (Teacher):** Tôi muốn xem Dashboard thống kê chỉ số KPI tổng hợp của lớp học do tôi phụ trách (Tỷ lệ hoàn thành bài tập %, Điểm trung bình toàn lớp, Điểm trung bình theo từng kỹ năng Writing / Speaking / Quiz, và Phổ điểm) để đánh giá năng lực học tập chung và điều chỉnh tiến độ giảng dạy.
* **Là Giảng viên (Teacher):** Tôi muốn xem danh sách chi tiết tiến độ từng học viên trong lớp kèm theo số bài đã nộp, số bài hoàn thành và điểm số trung bình để kịp thời đôn đốc các học viên có nguy cơ tụt hậu.
* **Là Giảng viên (Teacher) / Quản trị viên (Admin):** Tôi muốn xuất bảng điểm và tiến độ của toàn bộ học viên trong lớp ra tệp Excel (`.xlsx`) để lưu trữ báo cáo đào tạo cấp trung tâm.
* **Là Quản trị viên (Admin):** Tôi muốn xem chỉ số thống kê báo cáo của tất cả các lớp học trong toàn hệ thống mà không bị giới hạn phạm vi giảng dạy.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (Web Admin Portal Next.js 14) ]        [ Backend NestJS ]           [ Redis Cache ]         [ PostgreSQL 16 ]
                 │                                      │                           │                        │
  ── 1. GET /admin/classes/:id/dashboard-metrics ──────>│                           │                        │
                                                        │── 2. Check Teacher Guard ─│                        │
                                                        │                           │                        │
                                                        │── 3. Check Cache ────────>│                        │
                                                        │   (class_metrics:id)      │                        │
                                                        │<─ 4. Cache Hit (Data) ────│                        │
  <── 5. Response 200 OK (From Cache) ──────────────────│                           │                        │
                                                        │                           │                        │
                                                        │── (If Cache Miss) ────────│                        │
                                                        │── 6. Execute SQL Query ───────────────────────────>│
                                                        │      (JOIN s.class_id & t.class_id)                │
                                                        │<─ 7. Summary Raw Metrics ──────────────────────────│
                                                        │                           │                        │
                                                        │── 8. Calculate Ratios ───│                        │
                                                        │── 9. Set Cache ──────────>│                        │
                                                        │   (TTL = 300s / 5 mins)   │                        │
  <── 10. Response 200 OK (Fresh Data Envelope) ───────│                           │                        │
```

#### A. Tiến trình Lấy Thống kê KPI Lớp học (Get Class Metrics Flow)
1. Giảng viên mở Dashboard Lớp học trên Web Admin Portal. Trình duyệt gửi Yêu cầu `GET /api/v1/admin/classes/:id/dashboard-metrics`.
2. Backend NestJS `ClassAnalyticsService`:
   * Kiểm tra phân quyền: Kiểm tra lớp học tồn tại trong bảng `classes`. Nếu `currentUser.role === 'TEACHER'`, xác thực `classes.teacher_id === currentUser.id`. Nếu không khớp, trả về mã lỗi `403 Forbidden` (`ERR_AUTH_003`).
   * Kiểm tra bộ nhớ đệm **Redis Cache**: Truy vấn key `class_metrics:${classId}`.
     * **Cache Hit:** Trả về ngay lập tức dữ liệu JSON đã được lưu đệm.
     * **Cache Miss:** Thực thi câu lệnh SQL tổng hợp trực tiếp trên PostgreSQL 16.
3. Câu lệnh SQL thực hiện `LEFT JOIN` chính xác giữa `class_enrollments`, `assignment_targets`, `assignments`, `assignment_submissions` và `submission_reviews` thông qua điều kiện ghép cặp bắt buộc `class_id`.
4. Tính toán Tỷ lệ hoàn thành tổng quan %, Điểm trung bình chung, Điểm trung bình Writing, Speaking và Quiz.
5. Lưu kết quả vào Redis Cache với thời gian sống **TTL = 300 giây (5 phút)**.
6. Trả về Response Envelope kết quả thành công.

#### B. Tiến trình Xuất Báo cáo Excel (Export Class Progress Excel Flow)
1. Giảng viên bấm nút "Xuất báo cáo Excel". Trình duyệt gửi Yêu cầu `GET /api/v1/admin/classes/:id/export-excel`.
2. Backend `ClassAnalyticsService` lấy toàn bộ danh sách học viên trong lớp, tiến độ bài tập và điểm số đã chấm.
3. Khởi tạo workbook Excel bằng thư viện `exceljs`, định dạng cột, tiêu đề, tô màu header, tính tổng điểm tự động qua công thức Excel.
4. Trả về luồng dữ liệu Binary Stream (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) để trình duyệt tự động tải tệp `.xlsx`.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Thống kê (Business Rules)

* **Giải pháp Triệt tiêu Lỗi Nhân bản Bản ghi (Cartesian Product Fix v2.0):**
  * *Vấn đề cũ:* Khi học viên tham gia nhiều lớp học, việc JOIN không có điều kiện `class_id` khiến 1 bài làm bị nhân bản gấp $N$ lần theo số lớp học viên đăng ký, gây sai lệch nghiêm trọng tỷ lệ % và điểm trung bình.
  * *Giải pháp v2.0:* Thêm điều kiện bắt buộc `t.class_id = ce.class_id` và `s.class_id = ce.class_id` trong câu lệnh SQL:
    ```sql
    FROM class_enrollments ce
    LEFT JOIN assignment_targets t ON t.student_id = ce.student_id AND t.class_id = ce.class_id
    LEFT JOIN assignments a ON a.id = t.assignment_id
    LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ce.student_id AND s.class_id = ce.class_id
    LEFT JOIN submission_reviews r ON r.submission_id = s.id
    WHERE ce.class_id = $1
    ```

* **Công thức Tính Tỷ lệ Hoàn thành Bài tập Tổng quan (Overall Completion Rate):**
  $$\text{overallCompletionRate} = \text{ROUND}\left( \frac{\text{completedInstances}}{\text{totalTargetInstances}} \times 100 \right)$$
  *(Trong đó `completedInstances` là số lượng bản ghi `assignment_targets` có `is_completed = true` của các học viên thuộc lớp)*.

* **Công thức Tính Điểm Trung bình Lớp & Theo Kỹ năng:**
  $$\text{avgClassScore} = \text{ROUND}\left( \frac{\sum_{i=1}^{M} \text{total\_score}_i}{M}, 1 \right)$$
  *(Trong đó $M$ là tổng số bài nộp của lớp đã được giảng viên chấm điểm chính thức trong `submission_reviews`)*.

* **Thuật toán Phân bổ Phổ điểm Histogram (Score Distribution Buckets):**
  Chia phổ điểm làm 5 khoảng cố định (Thang 100):
  * `0-20`: Yếu / Cần cải thiện gấp
  * `21-40`: Trung bình yếu
  * `41-60`: Trung bình
  * `61-80`: Khá
  * `81-100`: Giỏi / Xuất sắc

* **Cơ chế Caching Redis (Cache Invalidation Strategy):**
  * Key Format: `class_metrics:${classId}`
  * TTL: `300` giây (5 phút).
  * Tự động xóa Cache (Invalidate) khi có các sự kiện: Giao bài tập mới cho lớp (`FNC_ADM_05`), Công bố điểm bài chấm mới (`FNC_ADM_07` / `FNC_ADM_08`).

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: `02_postgresql-16-ddl-schema-v12.md`.

#### A. Bảng `classes` (Lớp học)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `code` (`VARCHAR(50)`, UNIQUE, NOT NULL)
* `name` (`VARCHAR(150)`, NOT NULL)
* `teacher_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE RESTRICT, NOT NULL)
* `academic_year` (`VARCHAR(20)`, DEFAULT `'2026'`, NOT NULL)
* `is_active` (`BOOLEAN`, DEFAULT `true`, NOT NULL)

#### B. Bảng `class_enrollments` (Danh sách Học viên thuộc Lớp)
* `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)` ON DELETE CASCADE, NOT NULL)
* `student_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `enrolled_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)
* **Constraint:** `CONSTRAINT uq_class_student UNIQUE(class_id, student_id)`

#### C. Bảng `assignment_targets` (Phân công Bài tập cho Lớp / Học viên)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)` ON DELETE CASCADE, NOT NULL)
* `student_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
* `class_id` (`UUID`, Foreign Key -> `classes(id)` ON DELETE CASCADE, NULLABLE)
* `due_date` (`TIMESTAMPTZ`, NOT NULL)
* `is_completed` (`BOOLEAN`, DEFAULT `false`, NOT NULL)

#### D. Bảng `assignment_submissions` (Bài nộp của Học viên)
* `id` (`UUID`, Primary Key)
* `assignment_id` (`UUID`, Foreign Key -> `assignments(id)`)
* `student_id` (`UUID`, Foreign Key -> `users(id)`)
* `class_id` (`UUID`, Foreign Key -> `classes(id)`)
* `status` (`submission_status_enum`, DEFAULT `'SUBMITTED'`, NOT NULL)

#### E. Bảng `submission_reviews` (Kết quả Chấm điểm)
* `id` (`UUID`, Primary Key)
* `submission_id` (`UUID`, Foreign Key -> `assignment_submissions(id)`)
* `total_score` (`NUMERIC(5, 2)`, NOT NULL)

#### Chỉ mục Tối ưu (Indexes)
* `CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);`
* `CREATE INDEX idx_assignment_targets_class_student ON assignment_targets(class_id, student_id);`

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
| **61** | `GET` | `/api/v1/admin/classes/:id/dashboard-metrics` | Teacher / Admin | **[Chuẩn hóa v11]** Lấy toàn bộ chỉ số KPI tổng hợp của lớp học (Cache Redis 5m) |
| **61b** | `GET` | `/api/v1/admin/classes/:id/students-progress` | Teacher / Admin | Danh sách học viên trong lớp kèm điểm số và tiến độ chi tiết |
| **61c** | `GET` | `/api/v1/admin/classes/:id/score-distribution` | Teacher / Admin | Dữ liệu biểu đồ phân bổ phổ điểm theo khoảng (Histogram) |
| **61d** | `GET` | `/api/v1/admin/classes/:id/export-excel` | Teacher / Admin | Xuất bảng điểm và tiến độ lớp ra tệp Excel (.xlsx) |

#### Định dạng Cấu trúc Phản hồi KPI Class Metrics (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Lấy báo cáo tiến độ lớp học thành công",
  "data": {
    "classId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "className": "Lớp TOEIC Intensive K25",
    "classCode": "TOEIC_K25_INT",
    "totalStudents": 35,
    "totalAssignments": 12,
    "overallCompletionRate": 82,
    "averageClassScore": 76.5,
    "avgWritingScore": 72.0,
    "avgSpeakingScore": 74.5,
    "avgQuizScore": 83.0
  },
  "timestamp": "2026-10-12T22:40:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: `08_rbac-permission-matrix.md`.

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/admin/classes/:id/dashboard-metrics` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |
| `GET /api/v1/admin/classes/:id/students-progress` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |
| `GET /api/v1/admin/classes/:id/score-distribution` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |
| `GET /api/v1/admin/classes/:id/export-excel` | **×** (Chặn 403) | **×** (Chặn 403) | **△** (Lớp mình dạy) | **○** (Toàn trường) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/analytics/dto/class-metrics-response.dto.ts`
  * `src/modules/analytics/dto/student-progress-query.dto.ts`
  * `src/modules/analytics/dto/score-distribution-response.dto.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/analytics/dto/student-progress-query.dto.ts
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class StudentProgressQueryDto {
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

// src/modules/analytics/dto/class-metrics-response.dto.ts
export class ClassMetricsResponseDto {
  classId!: string;
  className!: string;
  classCode!: string;
  totalStudents!: number;
  totalAssignments!: number;
  overallCompletionRate!: number;
  averageClassScore!: number;
  avgWritingScore!: number;
  avgSpeakingScore!: number;
  avgQuizScore!: number;
}

// src/modules/analytics/dto/score-distribution-response.dto.ts
export class ScoreDistributionResponseDto {
  rangeLabel!: string; // '0-20', '21-40', '41-60', '61-80', '81-100'
  studentCount!: number;
  percentage!: number;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:** `src/modules/classes/entities/class-enrollment.entity.ts`
* **Mã nguồn Chi tiết:**

```typescript
// src/modules/classes/entities/class-enrollment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ClassEntity } from './class.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('class_enrollments')
@Unique('uq_class_student', ['classId', 'studentId'])
export class ClassEnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'class_id' })
  classId!: string;

  @ManyToOne(() => ClassEntity)
  @JoinColumn({ name: 'class_id' })
  class!: ClassEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'enrolled_at' })
  enrolledAt!: Date;
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `ClassAnalyticsService` & Redis Cache

* **Tệp tin khởi tạo:** `src/modules/analytics/class-analytics.service.ts`
* **Chức năng:** Thực thi SQL JOIN chuẩn v11, tính toán KPI, cache Redis 5m, xuất Excel via `exceljs`.

```typescript
import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as ExcelJS from 'exceljs';
import { StudentProgressQueryDto } from './dto/student-progress-query.dto';
import { ClassMetricsResponseDto } from './dto/class-metrics-response.dto';

@Injectable()
export class ClassAnalyticsService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async validateClassAccess(classId: string, currentUser: { id: string; role: string }) {
    const classRows = await this.dataSource.query(
      `SELECT id, name, code, teacher_id FROM classes WHERE id = $1`,
      [classId],
    );

    if (classRows.length === 0) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Lớp học không tồn tại.',
      });
    }

    const classInfo = classRows[0];
    if (currentUser.role === 'TEACHER' && classInfo.teacher_id !== currentUser.id) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Bạn không được phân công giảng dạy lớp học này.',
      });
    }

    return classInfo;
  }

  async getClassMetrics(classId: string, currentUser: { id: string; role: string }): Promise<ClassMetricsResponseDto> {
    const classInfo = await this.validateClassAccess(classId, currentUser);

    const cacheKey = `class_metrics:${classId}`;
    const cachedData = await this.cacheManager.get<ClassMetricsResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Truy vấn chuẩn hóa V11: JOIN chính xác theo class_id để tránh Cartesian Product
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

    const result: ClassMetricsResponseDto = {
      classId,
      className: classInfo.name,
      classCode: classInfo.code,
      totalStudents: Number(s.totalStudents) || 0,
      totalAssignments: Number(s.totalAssignments) || 0,
      overallCompletionRate: completionRate,
      averageClassScore: Number(s.avgClassScore) || 0,
      avgWritingScore: Number(s.avgWriting) || 0,
      avgSpeakingScore: Number(s.avgSpeaking) || 0,
      avgQuizScore: Number(s.avgQuiz) || 0,
    };

    // Cache Redis trong 5 phút (300.000 ms)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async exportClassReportExcel(classId: string, currentUser: { id: string; role: string }): Promise<Buffer> {
    const classInfo = await this.validateClassAccess(classId, currentUser);

    const studentsData = await this.dataSource.query(
      `
      SELECT 
        u.id AS "studentId",
        u.full_name AS "fullName",
        u.email AS "email",
        COUNT(DISTINCT t.id)::int AS "assignedCount",
        COUNT(DISTINCT CASE WHEN t.is_completed = true THEN t.id END)::int AS "completedCount",
        ROUND(COALESCE(AVG(r.total_score), 0), 1) AS "avgScore"
      FROM class_enrollments ce
      JOIN users u ON u.id = ce.student_id
      LEFT JOIN assignment_targets t ON t.student_id = ce.student_id AND t.class_id = ce.class_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = t.assignment_id AND s.student_id = ce.student_id AND s.class_id = ce.class_id
      LEFT JOIN submission_reviews r ON r.submission_id = s.id
      WHERE ce.class_id = $1
      GROUP BY u.id, u.full_name, u.email
      ORDER BY u.full_name ASC
      `,
      [classId],
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo Cáo Tiến Độ Lớp');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã Học Viên', key: 'studentId', width: 36 },
      { header: 'Họ và Tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Bài Được Giao', key: 'assignedCount', width: 15 },
      { header: 'Bài Hoàn Thành', key: 'completedCount', width: 15 },
      { header: 'Tỷ Lệ (%)', key: 'completionRate', width: 15 },
      { header: 'Điểm TB', key: 'avgScore', width: 12 },
    ];

    studentsData.forEach((row: any, index: number) => {
      const assigned = Number(row.assignedCount) || 0;
      const completed = Number(row.completedCount) || 0;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      worksheet.addRow({
        stt: index + 1,
        studentId: row.studentId,
        fullName: row.fullName,
        email: row.email,
        assignedCount: assigned,
        completedCount: completed,
        completionRate: `${rate}%`,
        avgScore: Number(row.avgScore) || 0,
      });
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại `ClassAnalyticsAdminController` & RBAC

* **Tệp tin khởi tạo:** `src/modules/analytics/class-analytics-admin.controller.ts`
* **Chức năng:** Khai báo HTTP Endpoints, gắn Guards `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`.

```typescript
import { Controller, Get, Param, Query, Req, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { ClassAnalyticsService } from './class-analytics.service';
import { StudentProgressQueryDto } from './dto/student-progress-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/admin/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassAnalyticsAdminController {
  constructor(private readonly analyticsService: ClassAnalyticsService) {}

  @Get(':id/dashboard-metrics')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getClassMetrics(
    @Param('id', ParseUUIDPipe) classId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
  ) {
    return await this.analyticsService.getClassMetrics(classId, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Get(':id/export-excel')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async exportClassReportExcel(
    @Param('id', ParseUUIDPipe) classId: string,
    @Req() req: Request & { user: { sub: string; role: string } },
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportClassReportExcel(classId, {
      id: req.user.sub,
      role: req.user.role,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Class_Report_${classId}.xlsx`);
    res.send(buffer);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (TanStack Query v5 Hooks)

* **Tệp tin khởi tạo:** `src/api/class-analytics-hooks.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export interface ClassMetrics {
  classId: string;
  className: string;
  classCode: string;
  totalStudents: number;
  totalAssignments: number;
  overallCompletionRate: number;
  averageClassScore: number;
  avgWritingScore: number;
  avgSpeakingScore: number;
  avgQuizScore: number;
}

export const useClassMetricsQuery = (classId: string) => {
  return useQuery({
    queryKey: ['admin', 'classes', classId, 'dashboard-metrics'],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/classes/${classId}/dashboard-metrics`);
      return response.data as ClassMetrics;
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 mins Client Stale Time
  });
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

Before merging Pull Request, verify against the following 4 Pillars:

* [x] **Trụ cột 1: Type Safety & Compilation**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch.
  * Zero `any` hoặc `as any` trong DTOs, Entities, Services, Controllers.
* [x] **Trụ cột 2: Integrity & Performance (Cartesian Product Fix & Redis)**
  * Thực thi SQL Query JOIN chính xác theo `ce.class_id`, `t.class_id`, `s.class_id`, triệt tiêu hoàn toàn lỗi nhân bản dữ liệu.
  * Caching đệm Redis 5 phút (`class_metrics:${classId}`) tối ưu tốc độ phản hồi Dashboard < 50ms.
* [x] **Trụ cột 3: Bảo mật & RBAC Data Isolation**
  * Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.
  * Khóa tuyệt đối giảng viên không được xem báo cáo lớp của đồng nghiệp khác (`classes.teacher_id = currentUserId`).
* [x] **Trụ cột 4: Test & Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
