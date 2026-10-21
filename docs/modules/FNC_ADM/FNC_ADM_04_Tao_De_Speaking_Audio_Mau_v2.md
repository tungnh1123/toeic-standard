### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_04 — TẠO ĐỀ LUYỆN NÓI SPEAKING KÈM AUDIO PHÁT ÂM MẪU BẢN XỨ - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_04
* **Tên chức năng:** Tạo đề luyện nói Speaking kèm Audio phát âm mẫu bản xứ (Speaking Assignment Authoring & Native Sample Audio)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Soạn thảo đề bài tự luận kỹ năng Nói (Speaking) chuẩn TOEIC Speaking (Part 1 - Part 5) làm **Đề bài gốc / Bản mẫu (Template)**.
  * Tải file audio mẫu phát âm bản xứ lên Cloud Storage (S3 / R2) qua S3 Presigned URL. Audio mẫu chỉ mở khóa cho học viên sau khi nộp bài.
  * **Chuyển đổi v2.0:** Xóa cột  khỏi bảng gốc . Hạn nộp được quản lý linh hoạt ở tầng phân công .

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/submissions/presigned-url | Admin/Teacher/Student | Cấp S3 Presigned URL để upload file audio (audio mẫu hoặc bài nộp) |
| 2 | POST | /api/v1/admin/assignments | Admin/Teacher | **[Chuẩn hóa v11]** Tạo đề bài tập gốc (nhận ) |
| 3 | PUT | /api/v1/admin/assignments/:id | Admin/Teacher | Chỉnh sửa đề bài Speaking (chỉ khi chưa có bài nộp) |
