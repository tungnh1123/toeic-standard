### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_05 — GIAO BÀI TẬP THEO LỚP HỌC HOẶC CÁ NHÂN HỌC VIÊN KÈM DEADLINE - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_05
* **Tên chức năng:** Giao bài tập theo lớp học hoặc cá nhân kèm Deadline (Assignment Distribution & Deadline Management)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Phân phối đề bài tập gốc () tới từng Lớp học () hoặc học viên cá nhân chọn lọc.
  * **Giải pháp Mô hình Deadline Độc lập (Per-Target Deadline Model):**
    * Cột  và  được lưu trực tiếp trên từng bản ghi phân công .
    * Giúp 1 đề bài gốc có thể giao cho Lớp A (hạn 20/10) và Lớp B (hạn 25/10) hoàn toàn độc lập mà không bị đè hạn nộp lên nhau.
  * Tự động đẩy thông báo Push Notification (Firebase FCM) và Email nhắc bài tập mới qua hàng đợi ngầm BullMQ.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/admin/assignments/:id/assign | Admin/Teacher | **[Chuẩn hóa v11]** Giao bài cho Lớp học () hoặc Danh sách học viên () kèm  riêng |
| 2 | PUT | /api/v1/admin/assignments/:id/extend-deadline | Admin/Teacher | Gia hạn Deadline bài tập cho lớp học hoặc học viên |
| 3 | GET | /api/v1/admin/assignments/:id/assigned-list | Admin/Teacher | Xem danh sách học viên đã được giao bài kèm trạng thái nộp |
