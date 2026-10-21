### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_03 — TẠO ĐỀ BÀI LUẬN WRITING & CẤU HÌNH RUBRIC 4 TIÊU CHÍ - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_03
* **Tên chức năng:** Tạo đề bài luận Writing & Cấu hình Rubric 4 tiêu chí (Writing Assignment Authoring & Rubric Builder)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp công cụ soạn thảo đề bài tự luận kỹ năng Viết (Writing) đóng vai trò làm **Đề bài gốc / Bản mẫu (Template)** tái sử dụng.
  * Cấu hình tham số khống chế thời gian, số từ (, , ) và Thang điểm Rubric 4 tiêu chí (Task Achievement, Coherence, Lexical, Grammar).
  * **Chuyển đổi v2.0:** Xóa cột  khỏi bảng gốc . Hạn nộp  và  được quản lý độc lập tại bảng  khi thực hiện giao bài cho từng lớp.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/admin/assignments | Admin/Teacher | **[Chuẩn hóa v11]** Tạo đề bài tập gốc (nhận ) |
| 2 | PUT | /api/v1/admin/assignments/:id | Admin/Teacher | Chỉnh sửa đề bài gốc (chỉ khi chưa có bài nộp) |
| 3 | GET | /api/v1/admin/assignments/:id | Admin/Teacher | Lấy chi tiết đề bài và cấu hình Rubric |
