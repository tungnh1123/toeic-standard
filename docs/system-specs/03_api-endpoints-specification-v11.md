# Đặc tả Giao diện Tích hợp RESTful API - v11.0
## Dự án: Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến

* **Mã dự án / Tài liệu:** SRS_SDD_ENG_TOEIC_2026_V1 (API Spec)
* **Phiên bản:** 1.1.0 (Chuẩn hóa Toàn diện Luồng Admin Management, Deadline Model, Submissions Filtering & Assignment Questions)
* **Ngày phát hành:** 12/10/2026
* **Kiến trúc Backend:** NestJS (TypeScript) | **Cơ sở dữ liệu:** PostgreSQL 16 & Redis 7
* **Trạng thái tài liệu:** Đã phê duyệt (Approved - Fully Synced v11.0)

---

## NHẬT KÝ THAY ĐỔI PHIÊN BẢN (CHANGELOG V11.0)
1. **Chuẩn hóa Luồng API Quản trị & Giao bài tập (Admin & Teacher Management):**
   * Chuẩn hóa API Tạo đề bài gốc (Template):  (nhận ).
   * Chuẩn hóa API Giao bài tập độc lập theo Lớp / Học viên:  (nhận  hoặc  kèm  riêng cho từng lượt giao).
   * Bổ sung API Quản lý Câu hỏi cho Đề bài tập Quiz:  (gắn các câu hỏi từ ngân hàng vào bài tập).
2. **Loại bỏ API Trùng lặp & Chuẩn hóa Lọc Bài nộp (Submissions Dashboard):**
   * Loại bỏ API trùng lặp .
   * Thống nhất dùng duy nhất  hỗ trợ bộ lọc query đa tiêu chí (, , , , ).
3. **Hợp nhất Cổng Đăng nhập Auth:**
   * Dùng chung  và  cho cả Admin, Teacher và Student, phân quyền bằng JWT Payload Role Guard.

---

## 1. TỔNG QUAN HỆ THỐNG RESTFUL API

### 1.1. Chuẩn giao tiếp & Định dạng dữ liệu
* **Protocol:** HTTPS / RESTful API
* **Base Path:** 
* **Content-Type:** 
* **Xác thực & Phân quyền:** Bearer Token (JSON Web Token - JWT) gửi qua HTTP Header .

### 1.2. Cấu trúc Phản hồi Chuẩn (Standard Response Format)


---

## 2. BẢNG TỔNG HỢP DANH MỤC API ENDPOINTS CHUẨN HÓA V11.0 (62 ENDPOINTS)

| STT | Phương thức | Đường dẫn Endpoint URI | Quyền hạn (Role) | Mục đích nghiệp vụ chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **1** |  |  | Public | Đăng nhập hệ thống (Admin, Teacher, Student), cấp JWT Tokens |
| **2** |  |  | Public | Đăng ký tài khoản học viên mới |
| **3** |  |  | Public | Làm mới Access Token thông qua Refresh Token Rotation |
| **4** |  |  | Authenticated | Đăng xuất và thu hồi Refresh Token hiện tại |
| **5** |  |  | Student | Lấy hồ sơ cá nhân, Streak, mục tiêu TOEIC |
| **6** |  |  | Student | Cập nhật thông tin cá nhân (Họ tên, Avatar) |
| **7** |  |  | Student | Cập nhật mục tiêu điểm TOEIC & Ngày thi dự kiến |
| **8** |  |  | Student | Đổi mật khẩu tài khoản học viên |
| **9** |  |  | Student | Cấp S3 Presigned URL để upload avatar trực tiếp |
| **10** |  |  | Public/Student | Danh mục bộ thẻ từ vựng kèm bộ lọc CEFR, Topic |
| **11** |  |  | Public/Student | Chi tiết 1 bộ thẻ, tiến độ % và 5 từ xem trước |
| **12** |  |  | Public/Student | Danh sách từ vựng chi tiết trong bộ thẻ (Phân trang) |
| **13** |  |  | Student | Đánh dấu / Hủy đánh dấu bộ thẻ yêu thích (Toggle) |
| **14** |  |  | Student | Tổng số từ đến hạn ôn trong ngày trên toàn hệ thống |
| **15** |  |  | Public/Student | Khởi tạo gói dữ liệu cho phiên học 3D tương tác |
| **16** |  |  | Student | Danh sách sổ tay từ vựng cá nhân & STARRED |
| **17** |  |  | Student | Tạo sổ tay từ vựng cá nhân mới |
| **18** |  |  | Student | Cập nhật tên, mô tả, màu sắc, ghim sổ tay |
| **19** |  |  | Student | Xóa sổ tay từ vựng cá nhân |
| **20** |  |  | Student | Lấy từ vựng trong sổ tay kèm mẹo nhớ cá nhân |
| **21** |  |  | Student | Thêm từ vựng vào sổ tay cá nhân |
| **22** |  |  | Student | Xóa từ vựng khỏi sổ tay cá nhân |
| **23** |  |  | Student | Cập nhật mẹo nhớ cá nhân |
| **24** |  |  | Student | Đánh dấu sao nhanh (Thêm/xóa từ Sổ tay STARRED) |
| **25** |  |  | Public/Student | Danh mục chuyên đề ngữ pháp kèm % tiến độ |
| **26** |  |  | Public/Student | Danh sách bài học thuộc chuyên đề |
| **27** |  |  | Public/Student | Chi tiết bài giảng Markdown GFM, mục lục TOC |
| **28** |  |  | Student | Cập nhật % cuộn trang đọc & hoàn thành bài |
| **29** |  |  | Student | Đánh dấu yêu thích bài giảng ngữ pháp (Toggle) |
| **30** |  |  | Student | Danh sách bài học ngữ pháp vừa đọc gần đây |
| **31** |  |  | Student | Lấy danh sách từ vựng cần ôn theo thuật toán SM-2 |
| **32** |  |  | Student | Gửi đánh giá trí nhớ thẻ từ (1-4), cập nhật SM-2 |
| **33** |  |  | Student | Gửi kết quả đánh giá theo lô nhiều thẻ sau phiên học |
| **34** |  |  | Student | Thống kê tỷ lệ ghi nhớ dài hạn (Retention Rate) |
| **35** |  |  | Student | Lấy câu hỏi quiz củng cố (ẩn đáp án đúng) |
| **36** |  |  | Student | Nộp bài quiz, chấm điểm, ghi nhận Streak |
| **37** |  |  | Student | Lấy danh sách lịch sử các lần làm quiz của bài học |
| **38** |  |  | Student | Xem lại chi tiết bài làm quiz đúng/sai |
| **39** |  |  | Student | Lấy trạng thái Streak hôm nay & vé bảo lưu |
| **40** |  |  | Student | Lấy ma trận lịch học Heatmap 365 ngày |
| **41** |  |  | Student | Kích hoạt 1 vé bảo lưu chuỗi Streak Freeze |
| **42** |  |  | Student | Danh sách huy hiệu mốc chuyên cần |
| **43** |  |  | Student | Dữ liệu Radar 6 kỹ năng & dự đoán TOEIC |
| **44** |  |  | Student | Chẩn đoán 2 điểm yếu nhất & bài học gợi ý |
| **45** |  |  | Student | Báo cáo danh sách từ khó tự động (EF <= 1.70) |
| **46** |  |  | Student | Lịch sử tăng trưởng năng lực theo thời gian |
| **47** |  |  | Student | Kích hoạt tính toán lại chỉ số năng lực |
| **48** |  |  | Student | Danh sách các đề thi thử TOEIC chuẩn đang mở |
| **49** |  |  | Student | Bắt đầu lượt thi mới, tải 200 câu hỏi |
| **50** |  |  | Student | Đồng bộ đáp án nháp theo thời gian thực (Redis) |
| **51** |  |  | Student | Nộp bài thi, chấm tự động và trả về điểm ETS |
| **52** |  |  | Student | Danh sách bài tập được giao cho bản thân |
| **53** |  |  | Student | Cấp S3 Presigned URL an toàn để upload audio Speaking |
| **54** |  |  | Student | Gửi bài làm chính thức (Writing hoặc link audio S3) |
| **55** |  |  | Teacher / Admin | **[Chuẩn hóa]** Tạo đề bài tập gốc (, , ) |
| **56** |  |  | Teacher / Admin | **[Chuẩn hóa]** Giao bài cho Lớp học / Học viên kèm  riêng |
| **57** |  |  | Teacher / Admin | **[Mới v11]** Gắn danh sách câu hỏi vào Bài tập dạng Quiz |
| **58** |  |  | Teacher / Admin | Gia hạn Deadline bài tập cho lớp hoặc học viên |
| **59** |  |  | Teacher / Admin | **[Chuẩn hóa]** Tìm kiếm & Lọc bài nộp (, , ) |
| **60** |  |  | Teacher / Admin | Lưu kết quả chấm Rubric, highlight sửa lỗi và audio góp ý |
| **61** |  |  | Teacher / Admin | Thống kê tỷ lệ nộp bài, phân phổ điểm và chuyên cần của lớp |
| **62** |  |  | Teacher / Admin | Tạo hoặc cập nhật đề thi TOEIC 200 câu mới |
