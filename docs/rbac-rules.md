# docs/rbac-rules.md — Quick Rules: Role-Based Access Control (RBAC)
## Project: Online TOEIC Learning & Exam Preparation System

* **Authentication Protocol:** Bearer JWT Access Token (15m) + Dual-Token Refresh Rotation (7d)
* **Roles:** , , ,  (Unauthenticated)
* **Status:** Mandatory Security Matrix & Guard Reference

---

## 1. BẢNG MA TRẬN PHÂN QUYỀN RBAC CHI TIẾT

| Phân hệ Nghiệp vụ | Endpoints / Hành động | Guest | Student | Teacher | Admin | Ghi chú Ranh giới Phạm vi |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Xác thực Auth** | Đăng nhập (), Đăng ký | ○ | ○ | ○ | ○ | Dùng chung cổng đăng nhập cho mọi Role |
| **Xác thực Auth** | Refresh Token () | ○ | ○ | ○ | ○ | Dual-token Rotation qua  |
| **Hồ sơ Cá nhân** | Xem/Cập nhật Hồ sơ, Mục tiêu TOEIC | × | △ | △ | ○ | △: Chỉ xem/sửa hồ sơ chính bản thân |
| **Kho thẻ CEFR** | Xem Danh mục, Chi tiết bộ thẻ, Xem trước từ | ○ | ○ | ○ | ○ | Học liệu cộng đồng công khai () |
| **Học từ vựng 3D** | Khởi tạo phiên học 3D, Lật thẻ | ○ | ○ | ○ | ○ | Phiên dùng thử cho Guest |
| **Sổ tay Cá nhân** | Tạo/Sửa/Xóa Sổ tay, STARRED Quick Star | × | △ | × | ○ | △: Chỉ sở hữu & quản lý sổ tay của chính mình |
| **Lý thuyết Ngữ pháp**| Xem Chuyên đề, Bài giảng Markdown GFM | ○ | ○ | ○ | ○ | Học liệu lý thuyết mở |
| **Tiến độ Ngữ pháp** | Cập nhật % đọc, Yêu thích bài giảng | × | △ | × | ○ | △: Ghi nhận tiến độ đọc cá nhân |
| **SRS SM-2 Engine** | Lấy thẻ đến hạn ôn, Gửi rating 1-4 | × | △ | × | ○ | △: Tính toán khoảng cách ngày ôn cá nhân |
| **Quiz Ngữ pháp** | Lấy câu hỏi quiz, Nộp bài quiz củng cố | × | △ | × | ○ | **Ẩn đáp án đúng () khi làm bài** |
| **Streak Engine** | Xem Streak, Heatmap, Dùng vé bảo lưu | × | △ | × | ○ | Tự động cộng Streak khi hoàn thành bài học |
| **Skill Radar** | Xem Radar 6D, Chẩn đoán điểm yếu | × | △ | × | ○ | Chuẩn hóa thang điểm 100 & gợi ý bài khắc phục |
| **Thi thử TOEIC** | Khởi tạo 200 câu, Sync nháp Redis | × | △ | × | ○ | Redis Sync Hash , tra bảng quy đổi ETS |
| **Bài tập Học viên**| Xem danh sách bài tập được giao | × | △ | × | ○ | △: Chỉ xem bài được phân công cho bản thân |
| **Nộp bài tập** | Xin Presigned S3 URL, Nộp bài Writing/Speaking | × | △ | × | ○ | Direct-to-S3 Presigned PUT URL (Hạn 15 phút) |
| **Tạo đề bài tập** | Tạo đề gốc Template (Writing, Speaking, Quiz) | × | × | ○ | ○ | Bảng  không chứa  |
| **Giao bài tập** | Giao bài cho Lớp/Học viên kèm Deadline | × | × | △ | ○ | △: Chỉ giao cho lớp phụ trách () |
| **Lọc bài nộp** | Tìm kiếm & Lọc danh sách bài nộp | × | × | △ | ○ | JOIN trực tiếp  triệt tiêu trùng lặp |
| **Studio Chấm bài** | Chấm Rubric 4 tiêu chí, Highlight, Voice note | × | × | △ | ○ | API chung  |
| **Báo cáo Lớp học** | Xem KPI Dashboard, Tỷ lệ nộp bài, Xuất Excel | × | × | △ | ○ | Cache Redis 5m () |
| **Cảnh báo Tự động**| Xem danh sách học viên rủi ro, 1-Click Remind | × | × | △ | ○ | Cron Job quét nộp muộn đêm qua & tụt dốc điểm |
| **Import TOEIC Excel**| Upload Excel 7 Sheets 200 câu thi TOEIC | × | × | × | ○ | Transaction nguyên tử 200 câu, 0 bản ghi rác |
| **Quản trị Hệ thống**| Quản lý tài khoản, Phê duyệt bộ thẻ công khai | × | × | × | ○ | Quyền Administrator tối cao |

* **Ký hiệu Legend:**
  * : Toàn quyền truy cập public/system-wide.
  * : Giới hạn truy cập trong phạm vi tài khoản cá nhân hoặc Lớp học được phân công phụ trách.
  * : Chặn tuyệt đối (HTTP 403 Forbidden).

---

## 2. MẪU CODE KHAI BÁO GUARD VÀ DECORATOR BẮT BUỘC TRÊN NESTJS

### 2.1. Khai báo Guard trên Controller / Endpoint



### 2.2. Mã Nguồn Triển khai RolesGuard ()


