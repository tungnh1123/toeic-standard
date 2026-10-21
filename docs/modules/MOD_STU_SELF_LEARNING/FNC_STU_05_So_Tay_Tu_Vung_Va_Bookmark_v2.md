# MODULE SPECIFICATION: FNC_STU_05 — ĐÁNH DẤU TỪ YÊU THÍCH & TẠO SỔ TAY TỪ VỰNG KHÓ NHỚ

---

## 📌 HEADER & METADATA

* **Module ID:** MOD_STU_05 (Tương ứng FNC_STU_05)
* **Tên Module:** Đánh dấu từ yêu thích và tạo sổ tay từ vựng khó nhớ (Vocabulary Notebooks & Bookmark Manager)
* **Phân hệ:** Phân hệ Học tập Cá nhân (MOD_STU_SELF_LEARNING)
* **Đường dẫn file lưu trữ:** docs/modules/MOD_STU_SELF_LEARNING/FNC_STU_05_So_Tay_Tu_Vung_Va_Bookmark_v2.md
* **Phiên bản:** v2.0.0 (Chuẩn hóa Hợp nhất Vocabulary Notebooks, Quick Star & Troubled Words Engine)
* **Trạng thái:** APPROVED & FULLY SYNCED
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md (Master SRS & SDD)
  2. 02_postgresql-16-ddl-schema-v12.md (Master DDL Schema 35 Bảng v12.0)
  3. 03_api-endpoints-specification-v11.md (Master RESTful API v11.0 - 62 Endpoints)
  4. 08_rbac-permission-matrix.md (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Học viên (Student):** Tôi muốn tự do tạo các sổ tay từ vựng cá nhân theo chuyên đề (như *"Từ vựng bẫy TOEIC Part 7"*, *"Cụm Collocations dễ nhầm lẫn"*, *"Từ vựng Tài chính"*) với màu sắc và biểu tượng riêng để chủ động phân loại và ôn tập lại khi cần.
* **Là Học viên (Student):** Tôi muốn có tính năng Đánh dấu sao nhanh (Quick Star / Bookmark) ngay trong màn hình lật thẻ 3D Flashcard hoặc khi làm bài thi thử TOEIC để lưu nhanh từ vựng vào **Sổ tay Yêu thích (Starred Words)** mặc định chỉ bằng một cú chạm.
* **Là Học viên (Student):** Tôi muốn sử dụng **Sổ tay Thông minh tự động gom từ khó (Smart Troubled Words Notebook)** do hệ thống tự động lọc ra các từ tôi hay quên ( \le 1.70$ hoặc đánh giá  < 3$ nhiều lần) để tập trung ôn luyện cứu trợ các điểm yếu từ vựng.
* **Là Học viên (Student):** Tôi muốn đính kèm mẹo ghi nhớ liên tưởng cá nhân () và câu ví dụ do mình tự đặt () cho từng từ vựng trong sổ tay để ghi nhớ sâu sắc hơn.

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)



#### A. Tiến trình Đánh dấu sao Nhanh (Quick Star Toggle Flow)
1. Học viên bấm nút Ngôi sao (Star) tại màn hình Lật thẻ 3D Flashcard hoặc trong bài thi thử TOEIC. Client gửi .
2. Backend NestJS :
   * Tìm sổ tay mặc định  của học viên trong bảng .
   * Nếu chưa tồn tại (tài khoản cũ chưa qua trigger), hệ thống tự động khởi tạo Sổ tay "Từ vựng yêu thích" (, , ).
3. Kiểm tra xem thẻ từ  đã tồn tại trong  của sổ tay  này chưa:
   * Nếu đã có: Thực hiện  bản ghi (Bỏ đánh dấu sao) -> Trả về .
   * Nếu chưa có: Thực hiện  bản ghi (Đánh dấu sao) -> Trả về .

#### B. Tiến trình Lọc Từ khó Tự động (Smart Troubled Words Flow)
1. Học viên mở Sổ tay Thông minh "Từ khó cần ôn". Client gửi .
2. Backend NestJS thực thi SQL Query lọc từ bảng  kết nối  với điều kiện:
   * Hệ số Dễ nhớ  \le 1.70$.
   * HOẶC có lịch sử bấm đánh giá  \in \{1, 2\}$ trong 14 ngày gần nhất từ bảng .
3. Phản hồi danh sách từ vựng rủi ro cao kèm chỉ số $ và số lần quên để học viên ôn tập cứu trợ.

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Validation (Business Rules)

* **Thuật toán Tự động Nhận diện Từ khó (Smart Troubled Words Algorithm):**
  Một từ vựng được xếp vào danh mục Từ khó cần cứu trợ khi thỏa mãn điều kiện logic:
  11	ext{IsTroubledCard} = (EF \le 1.70) \lor \left( \sum_{	ext{last } 14	ext{d}} [q < 3] \ge 2 ight)11
* **Bảo vệ Sổ tay Mặc định Hệ thống (Protected System Notebooks):**
  Hai sổ tay mặc định gồm  (Từ yêu thích) và  (Từ khó tự động) có cờ hệ thống bảo vệ. **Cấm tuyệt đối hành vi Xóa ()** đối với 2 loại sổ tay này ().
* **Giới hạn Chống Spam (Anti-Spam Limits):**
  * Tối đa **30 sổ tay cá nhân ()** cho mỗi tài khoản học viên.
  * Tối đa **500 từ vựng** trong một sổ tay để đảm bảo hiệu năng tải trang $< 50	ext{ms}$.
* **Bảo toàn Dữ liệu khi Xóa Sổ tay:**
  Khi xóa một sổ tay cá nhân, hệ thống chỉ xóa các bản ghi liên kết trong . Thẻ từ gốc trong  và tiến trình ôn tập  hoàn toàn được giữ nguyên vẹn.

---

## 2. MAPPING KỸ THUẬT MASTER (CRITICAL GROUNDING)

### 2.1. Cơ sở Dữ liệu PostgreSQL 16 (v12.0 Master Schema)

Nguồn chiếu: .

#### A. Bảng  (Danh mục Sổ tay Từ vựng Cá nhân)
* uid=1000(sandbox) gid=1000(sandbox) groups=1000(sandbox) (, Primary Key, DEFAULT )
*  (, Foreign Key ->  ON DELETE CASCADE, NOT NULL)
*  (, NOT NULL)
*  (, NULLABLE)
*  (, DEFAULT , NOT NULL)
*  (, DEFAULT , NOT NULL - Mã màu HEX)
*  (, DEFAULT , NOT NULL - Tên Icon Lucide)
*  (, DEFAULT , NOT NULL)
*  (, DEFAULT , NOT NULL)
*  (, DEFAULT , NOT NULL)

#### B. Bảng  (Liên kết Từ vựng vào Sổ tay kèm Ghi chú)
* uid=1000(sandbox) gid=1000(sandbox) groups=1000(sandbox) (, Primary Key, DEFAULT )
*  (, Foreign Key ->  ON DELETE CASCADE, NOT NULL)
*  (, Foreign Key ->  ON DELETE CASCADE, NOT NULL)
*  (, NULLABLE - Mẹo ghi nhớ cá nhân / Mnemonics)
*  (, NULLABLE - Câu ví dụ cá nhân do học viên tự đặt)
*  (, DEFAULT , NOT NULL)
* **Constraint:** 

#### C. Bảng  (Từ vựng Gốc)
* uid=1000(sandbox) gid=1000(sandbox) groups=1000(sandbox) (, Primary Key)
*  (, NOT NULL)
*  (, NULLABLE)
*  (, NULLABLE)
*  (, NOT NULL)
*  (, NULLABLE)
*  (, NULLABLE)

#### D. Bảng  (Tiến trình Học tập SM-2)
* uid=1000(sandbox) gid=1000(sandbox) groups=1000(sandbox) (, Primary Key)
*  (, Foreign Key -> )
*  (, Foreign Key -> )
*  (, DEFAULT )
*  (, DEFAULT )
*  (, DEFAULT )

#### Chỉ mục Tối ưu (Indexes)
* 
* 
* 

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

Nguồn chiếu: .



### 2.3. Danh mục API Endpoints Chuẩn hóa (v11.0 Master APIs)

Nguồn chiếu: .

| STT | Method | Endpoint URI | Quyền hạn (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **16** |  |  | Student | Danh sách sổ tay từ vựng cá nhân & Sổ tay STARRED |
| **17** |  |  | Student | Tạo sổ tay từ vựng cá nhân mới |
| **18** |  |  | Student | Cập nhật tên, mô tả, màu sắc, ghim sổ tay |
| **19** |  |  | Student | Xóa sổ tay từ vựng cá nhân (Bảo vệ sổ tay hệ thống) |
| **20** |  |  | Student | Lấy từ vựng trong sổ tay kèm mẹo nhớ cá nhân |
| **21** |  |  | Student | Thêm từ vựng vào sổ tay cá nhân |
| **22** |  |  | Student | Xóa từ vựng khỏi sổ tay cá nhân |
| **23** |  |  | Student | Cập nhật mẹo nhớ cá nhân |
| **24** |  |  | Student | Đánh dấu sao nhanh (Thêm/xóa từ Sổ tay STARRED) |
| **24b** |  |  | Student | Lấy danh sách từ vựng hệ thống tự động đánh giá là khó ( \le 1.70$) |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)


### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

Nguồn chiếu: .

| Resource / Endpoint | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
|  | **×** (Chặn 403) | **△** (Chính mình) | **×** (Chặn 403) | **○** (Toàn quyền) |
|  | **×** (Chặn 403) | **△** (Chính mình) | **×** (Chặn 403) | **○** (Toàn quyền) |
|  | **×** (Chặn 403) | **△** (Chính mình) | **×** (Chặn 403) | **○** (Toàn quyền) |
|  | **×** (Chặn 403) | **△** (Chính mình) | **×** (Chặn 403) | **○** (Toàn quyền) |
|  | **×** (Chặn 403) | **△** (Chính mình) | **×** (Chặn 403) | **○** (Toàn quyền) |

---

## 3. TASK BREAKDOWN FOR AGENT (CỰC KỲ CHI TIẾT)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * 
  * 
  * 
  * 
* **Mã nguồn Chi tiết:**



---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * 
  * 
* **Mã nguồn Chi tiết:**



---

### 🧩 Task 3: Lập trình Business Logic tại  & Quick Star Engine

* **Tệp tin khởi tạo:** 
* **Mã nguồn Chi tiết:**


      SELECT 
        nb.id,
        nb.title,
        nb.description,
        nb.notebook_type AS notebookType,
        nb.color_code AS colorCode,
        nb.icon_name AS iconName,
        nb.is_pinned AS isPinned,
        nb.created_at AS createdAt,
        nb.updated_at AS updatedAt,
        COUNT(nc.id)::int AS totalCards
      FROM user_vocabulary_notebooks nb
      LEFT JOIN user_notebook_cards nc ON nc.notebook_id = nb.id
      WHERE nb.user_id = 
      GROUP BY nb.id
      ORDER BY nb.is_pinned DESC, nb.updated_at DESC
      
      SELECT 
        c.id AS flashcardId,
        c.term,
        c.phonetic_ipa AS phoneticIpa,
        c.part_of_speech AS partOfSpeech,
        c.definition,
        c.example_sentence AS exampleSentence,
        c.audio_url AS audioUrl,
        prog.ease_factor AS easeFactor,
        prog.interval_days AS intervalDays,
        prog.repetition_count AS repetitionCount
      FROM user_flashcard_progress prog
      INNER JOIN flashcards c ON c.id = prog.flashcard_id
      WHERE prog.user_id = 
        AND (
          prog.ease_factor <= 1.70 
          OR prog.flashcard_id IN (
            SELECT flashcard_id 
            FROM flashcard_study_logs 
            WHERE user_id =  
              AND rating IN (1, 2) 
              AND reviewed_at >= NOW() - INTERVAL '14 days'
            GROUP BY flashcard_id 
            HAVING COUNT(id) >= 2
          )
        )
      ORDER BY prog.ease_factor ASC, prog.last_reviewed_at DESC
      LIMIT  OFFSET 
      

---

### 🧩 Task 4: Triển khai Route Handlers tại  & RBAC

* **Tệp tin khởi tạo:** 
* **Mã nguồn Chi tiết:**



---

### 🧩 Task 5: Triển khai Client Integration (React Native Notebook Component & Hooks)

* **Tệp tin khởi tạo:** 
* **Mã nguồn Chi tiết:**

/api/v1/student/notebooks/quick-star/

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

* [x] **Trụ cột 1: Type Safety & Compilation**
  *  đạt 0 lỗi biên dịch. Zero  trong DTOs, Entities, Services, Controllers.
* [x] **Trụ cột 2: Integrity & Performance**
  * Thao tác Quick Star bọc 100% trong .
  * Truy vấn danh sách sổ tay dùng Single Aggregation SQL (), không sinh lỗi N+1 Query.
* [x] **Trụ cột 3: Bảo mật & Protected Notebooks Scope**
  * Cấm xóa sổ tay hệ thống  và  ở cả tầng DTO validation & Service logic.
  * Giới hạn tối đa 30 sổ tay / tài khoản học viên để chống spam CSDL.
* [x] **Trụ cột 4: Test & Response Envelope**
  * API phản hồi đúng chuẩn Envelope .
