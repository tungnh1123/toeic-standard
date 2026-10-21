### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_06 — QUẢN LÝ, TÌM KIẾM VÀ LỌC DANH SÁCH BÀI NỘP CỦA HỌC VIÊN - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_06
* **Tên chức năng:** Quản lý, tìm kiếm và lọc danh sách bài nộp của học viên (Submission Management & Advanced Filtering Dashboard)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Màn hình điều phối trung tâm (ADM0301) giúp giáo viên lọc bài nộp tự luận (Writing, Speaking) và Quiz theo Lớp học, Trạng thái (, , ) và cảnh báo quá hạn 48h chưa chấm ().
  * **Giải pháp Triệt tiêu Lỗi Nhân bản Bản ghi (Zero Duplication Query):**
    * Bảng  lưu trực tiếp  và .
    * Cú pháp SQL QueryBuilder join trực tiếp  thay vì join qua , loại bỏ hoàn toàn lỗi nhân bản bài nộp khi học viên học nhiều lớp.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/submissions | Admin/Teacher | **[Thống nhất v11]** Tìm kiếm & Lọc bài nộp theo lớp, loại bài, trạng thái () |
| 2 | POST | /api/v1/admin/submissions/:id/review | Admin/Teacher | Lưu kết quả chấm điểm Rubric, highlight sửa lỗi và audio nhận xét |
