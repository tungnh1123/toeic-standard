# MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC MATRIX)

## Hệ Thống Học Tiếng Anh & Luyện Thi TOEIC Trực Tuyến

---

### 1. Quy Ước Ký Hiệu & Phân Loại Vai Trò

#### Quy ước phân quyền
* **`○` (Toàn quyền):** Được phép truy cập và thực thi toàn bộ chức năng.
* **`△` (Quyền giới hạn):** Được phép truy cập trong phạm vi dữ liệu cá nhân, lớp học được phân công phụ trách, hoặc danh mục demo.
* **`×` (Không có quyền):** Hệ thống chặn truy cập và phản hồi mã lỗi `HTTP 403 Forbidden`.

#### Danh mục các vai trò (Roles)
1. **Khách (Guest):** Người dùng chưa đăng nhập hoặc tài khoản vãng lai trải nghiệm hệ thống.
2. **Học viên (Student):** Người học tham gia luyện thi TOEIC, học từ vựng/ngữ pháp và nộp bài tập.
3. **Giáo viên (Teacher):** Giảng viên trực tiếp quản lý lớp học, tạo đề bài, giao bài tập và chấm bài tự luận.
4. **Quản trị viên (Admin):** Vận hành hệ thống, quản lý toàn bộ người dùng, nội dung đào tạo và báo cáo cấp trường.

---

### 2. Ma Trận Phân Quyền Truy Cập Chi Tiết

| Nhóm nghiệp vụ | Tên chức năng | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị (Admin) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Xác thực & Tài khoản** | Đăng nhập / Đăng ký tài khoản | ○ | ○ | ○ | ○ |
| **Giảng dạy & Đào tạo** | Tạo đề bài (Writing, Speaking, Quiz) | × | × | ○ (Lớp mình) | ○ (Toàn bộ) |
| | Giao bài tập & Đặt Deadline | × | × | ○ (Lớp mình) | ○ (Toàn bộ) |
| | Lọc & Xem danh sách bài nộp | × | × | △ (Lớp mình) | ○ (Toàn trường) |
| | Chấm bài Writing & Bôi đen sửa lỗi | × | × | ○ (Lớp mình) | ○ (Toàn quyền) |
| | Chấm Speaking trên sóng âm | × | × | ○ (Lớp mình) | ○ (Toàn quyền) |
| | Thu âm nhận xét giọng nói của GV | × | × | ○ (Lớp mình) | ○ (Toàn quyền) |
| | Báo cáo tiến độ lớp học | × | × | △ (Lớp mình) | ○ (Toàn trường) |
| | Quản lý kho đề TOEIC & Flashcard chung | × | × | △ (Đóng góp) | ○ (Toàn quyền) |
| **Học tập Cá nhân** | Học Flashcard tương tác (SRS SM-2) | △ (Demo 5 từ) | ○ (Không giới hạn) | ○ | ○ |
| | Học ngữ pháp lý thuyết & Làm quiz | △ (Demo bài 1) | ○ (Toàn bộ) | ○ | ○ |
| | Chuỗi chuyên cần (Streak Engine) | × | ○ (Cá nhân) | △ (Xem lớp) | ○ (Xem toàn bộ) |
| | Phân tích Radar 6 kỹ năng | × | ○ (Cá nhân) | △ (Xem lớp) | ○ (Xem toàn bộ) |
| **Động cơ Thi TOEIC** | Thi Full Test 200 câu / Mini-Test | △ (Xem mục lục) | ○ (Làm bài) | ○ (Thi thử) | ○ (Quản trị) |
| | Nhận điểm quy đổi ETS (10–990) | × | ○ (Bài của mình) | △ (Xem lớp) | ○ (Xem toàn bộ) |
| | Xem Transcript & Lời giải chi tiết | × | ○ (Sau khi nộp) | ○ | ○ |
| **Làm bài tập được giao** | Soạn bài Writing & Thu âm Speaking | × | ○ (Nộp bài) | × | × |
| | Upload Audio qua S3 Presigned URL | × | ○ (Nộp bài) | × | ○ |
| | Xem nhận xét & Nghe audio của GV | × | ○ (Bài của mình) | ○ (Sửa lời phê) | ○ (Toàn quyền) |

---

### 3. Chi Tiết Ranh Giới Chức Năng Theo Vai Trò

1. **Khách (Guest)**
   * Được thử nghiệm các tính năng học từ vựng (giới hạn 5 thẻ từ demo) và 1 bài học ngữ pháp chuyên đề.
   * Xem danh mục cấu trúc các đề thi TOEIC nhưng không thể bắt đầu làm bài chính thức.

2. **Học viên (Student)**
   * Toàn quyền học từ vựng lặp lại ngắt quãng SM-2, tích lũy điểm Streak và theo dõi biểu đồ Radar 6 kỹ năng cá nhân.
   * Tham gia làm bài thi thử TOEIC 120 phút, nhận điểm quy đổi chuẩn ETS và xem đáp án/transcript chi tiết sau khi nộp.
   * Soạn thảo bài luận Writing, ghi âm bài nói Speaking và nộp bài tập được giao qua S3 Presigned URL.

3. **Giáo viên (Teacher)**
   * Quản lý kho đề bài, giao bài tập và chấm điểm tự luận trong phạm vi các lớp học do mình phụ trách (`teacher_id`).
   * Sử dụng Studio chấm bài chia đôi màn hình (Writing) và chấm bài trên dạng sóng âm WaveSurfer (Speaking).
   * Thu âm nhận xét bằng giọng nói gửi trực tiếp cho học viên.

4. **Quản trị viên (Admin)**
   * Sở hữu toàn quyền hệ thống (`system-wide access`), quản lý tài khoản, danh mục đề thi TOEIC và dữ liệu toàn trường.
   * Can thiệp và xem xét bất kỳ lượt chấm bài, báo cáo tiến độ học tập hoặc cấu hình phân quyền nào trên nền tảng.
