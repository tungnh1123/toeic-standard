### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_07 — STUDIO CHẤM BÀI WRITING (CHIA ĐÔI MÀN HÌNH & HIGHLIGHT SỬA LỖI) - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_07
* **Mã màn hình giao diện:** ADM0302 (Writing Grading Studio)
* **Tên chức năng:** Studio chấm bài Writing chia đôi & Sửa lỗi văn bản trực tiếp (Writing Grading Studio & Text Annotation Tool)
* **Đối tượng sử dụng (Actors):** Giảng viên (Teacher), Quản trị viên (Admin)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp môi trường chấm bài luận tập trung (Split-Screen Studio) trên Web Next.js 14.
  * Tích hợp công cụ **Bôi đen văn bản & Gắn nhãn sửa lỗi trực tiếp (Inline Annotation Tool)**: Gắn mã phân loại lỗi (, , , ), nhập nhận xét và gợi ý sửa lại ().
  * Tích hợp phiếu chấm điểm Rubric 4 tiêu chí (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Accuracy) với tổng điểm 100.
  * **Chuẩn hóa v2.0:** Sử dụng duy nhất API  để lưu nháp/công bố kết quả chấm. Khi công bố (), hệ thống tự động cập nhật  (dựa trên , , ) và đẩy thông báo ngầm qua BullMQ.

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)
##### 2.1. Cấu trúc trường inline_feedback cho Writing (JSONB Specification)


--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | GET | /api/v1/admin/submissions/:id | Teacher/Admin | Lấy toàn bộ văn bản bài nộp, rubric đề bài và bản nháp chấm cũ |
| 2 | POST | /api/v1/admin/submissions/:id/review | Teacher/Admin | Lưu nháp hoặc xuất bản điểm chính thức Rubric, inline_feedback & audio lời phê |

##### 3.2. Data Transfer Objects (DTOs) & Validation


##### 3.3. Dịch vụ Xử lý Chấm bài Writing (WritingGradingService)


--------------------------------------------------------------------------------

#### 4. QUY TẮC NGHIỆP VỤ & KIỂM TRA HỢP LỆ (BUSINESS RULES)
1. **Tính Toàn vẹn Điểm Rubric**: Tổng điểm từ 4 tiêu chí bắt buộc phải được tính toán tự động ở Backend từ .
2. **Cập nhật Trạng thái Hoàn thành**: Việc cập nhật  trong  phải khớp cả ,  và .
