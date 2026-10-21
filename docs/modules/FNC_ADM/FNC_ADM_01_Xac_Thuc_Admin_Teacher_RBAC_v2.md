### ĐẶC TẢ CHI TIẾT CHỨC NĂNG (SPECIFICATION)
#### PHÂN HỆ QUẢN TRỊ & GIẢNG DẠY (MOD_ADM)
##### MODULE: FNC_ADM_01 — ĐĂNG NHẬP & XÁC THỰC VAI TRÒ ADMIN / GIẢNG VIÊN (RBAC) - V2.0 (CHUẨN HÓA)

--------------------------------------------------------------------------------

#### 1. TỔNG QUAN CHỨC NĂNG (OVERVIEW)
##### 1.1. Thông tin chung
* **Mã phân hệ:** MOD_ADM (Admin & Teacher Management Module)
* **Mã chức năng:** FNC_ADM_01
* **Tên chức năng:** Đăng nhập & Xác thực vai trò Admin / Giảng viên theo RBAC (Admin & Teacher Authentication & Role-Based Access Control)
* **Đối tượng sử dụng (Actors):** Quản trị viên (Admin), Giảng viên / Giáo viên (Teacher)
* **Mục tiêu nghiệp vụ:**
  * Cung cấp cổng xác thực định danh độc quyền trên Web Portal quản trị (Next.js 14), hoàn toàn độc lập với ứng dụng học viên.
  * Thực thi cơ chế phân quyền chặt chẽ theo vai trò (Role-Based Access Control - RBAC):
    * ADMIN: Toàn quyền quản trị tài khoản, cấu hình hệ thống, quản lý đề thi TOEIC chuẩn, duyệt kho từ vựng và giám sát toàn bộ các lớp học.
    * TEACHER: Được giới hạn quyền trong phạm vi các lớp học được phân công giảng dạy ( hoặc ); chỉ có quyền tạo đề, giao bài tập, xem bài nộp và chấm điểm học viên thuộc lớp mình.
    * STUDENT: Bị chặn tuyệt đối tại cả 2 tầng: Next.js Middleware và NestJS Route Guard (trả về mã lỗi HTTP 403 Forbidden).
  * Áp dụng chuẩn bảo mật phiên làm việc doanh nghiệp: Cấp **Access Token JWT (thời hạn 15 phút)** truyền trong Header và **Refresh Token (thời hạn 7 ngày)** lưu trong cookie HttpOnly, SameSite=Strict, Secure.
  * **Chuyển đổi v2.0:** Hợp nhất bảng lưu Refresh Token vào  chung toàn hệ thống cho cả Admin, Teacher và Student, phân biệt dựa trên vai trò .

--------------------------------------------------------------------------------

#### 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL 16)
Mô hình dữ liệu quản lý tài khoản, phân quyền giảng dạy và bảo mật phiên:



--------------------------------------------------------------------------------

#### 3. THIẾT KẾ BACKEND (NESTJS & RESTFUL APIS)
##### 3.1. Danh mục API Endpoints Chuẩn hóa
| STT | Method | Endpoint URI | Phân quyền | Mô tả chức năng |
| :---: | :---: | :--- | :---: | :--- |
| 1 | POST | /api/v1/auth/login | Public | Đăng nhập chung hệ thống (cấp JWT Access Token & Refresh Token) |
| 2 | POST | /api/v1/auth/refresh-token | Public | Đổi Access Token mới qua cơ chế Refresh Token Rotation |
| 3 | POST | /api/v1/auth/logout | Authenticated | Đăng xuất, thu hồi Refresh Token |
| 4 | GET | /api/v1/student/profile/me | Student/Teacher/Admin | Lấy thông tin tài khoản đang đăng nhập |

--------------------------------------------------------------------------------

#### 4. QUY TẮC NGHIỆP VỤ & BẢO MẬT (BUSINESS RULES)
1. **Khóa tài khoản tự động (Brute-force Protection)**:
   * Nếu đăng nhập sai mật khẩu **5 lần liên tiếp trong 15 phút**, tài khoản sẽ bị tạm khóa đăng nhập trong **30 phút**.
2. **Cơ chế thu hồi phiên làm việc (Session Revocation)**:
   * Khi đổi mật khẩu hoặc đăng xuất, Refresh Token liên quan trong bảng  sẽ bị đánh dấu .
