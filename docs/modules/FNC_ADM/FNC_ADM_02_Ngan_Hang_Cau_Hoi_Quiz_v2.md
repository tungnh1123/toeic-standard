### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_02 — TẠO & QUẢN LÝ NGÂN HÀNG CÂU HỎI QUIZ TRẮC NGHIỆM / NGỮ PHÁP - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_02
* **Tên chức năng:** Tạo & Quản lý ngân hàng câu hỏi Quiz trắc nghiệm / Ngữ pháp (Grammar Question Bank & Quiz Manager)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp công cụ xây dựng và chuẩn hóa kho ngân hàng câu hỏi trắc nghiệm tiếng Anh bám sát cấu trúc đề thi TOEIC Part 5 & Part 6.
  * Phân loại câu hỏi đa chiều: Theo bài học liên kết (), độ khó (: EASY, MEDIUM, HARD) và nhãn bẫy ().
  * Liên kết linh hoạt với Bài tập dạng Quiz () thông qua bảng liên kết .
  * Hỗ trợ nhập hàng loạt từ file Excel (.xlsx) kèm kiểm tra lỗi dữ liệu.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/grammar/questions | Admin/Teacher | Tìm kiếm và lọc danh sách câu hỏi trong ngân hàng |
| 2 | POST | /api/v1/admin/grammar/questions | Admin/Teacher | Thêm mới câu hỏi trắc nghiệm vào ngân hàng |
| 3 | PUT | /api/v1/admin/grammar/questions/:id | Admin/Teacher | Chỉnh sửa nội dung câu hỏi, đáp án, lời giải |
| 4 | DELETE | /api/v1/admin/grammar/questions/:id | Admin/Teacher | Xóa câu hỏi khỏi ngân hàng |
| 5 | POST | /api/v1/admin/grammar/questions/import-excel | Admin/Teacher | Nhập hàng loạt câu hỏi từ Excel (.xlsx) |
| 6 | POST | /api/v1/admin/assignments/:id/questions | Admin/Teacher | **[Mới v11]** Gắn danh sách câu hỏi vào Bài tập dạng Quiz |
