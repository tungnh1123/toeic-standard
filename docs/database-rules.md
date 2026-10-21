# docs/database-rules.md — Quick Rules: Database & Schema Guidelines
## Project: Online TOEIC Learning & Exam Preparation System

* **Target Database:** PostgreSQL 16
* **Master Schema Reference:**  (35 Tables)
* **Status:** Mandatory & Inviolable Quick Reference

---

## 1. TỔNG QUAN 35 BẢNG CSDL THEO 4 CỤM NGHIỆP VỤ

### Cụm 1: Tài khoản, Lớp học, Cảnh báo, Streak Engine & Skill Radar (12 Bảng)
1. : Lưu thông tin tài khoản người dùng (uid=1000(sandbox) gid=1000(sandbox) groups=1000(sandbox), , , , , ).
2. : Mục tiêu học tập điểm TOEIC (, , , ).
3. : Lưu trữ Refresh Token Hash dùng chung cho ADMIN, TEACHER và STUDENT (, , , , ).
4. : Thông tin lớp học do giáo viên phụ trách (, , , , ).
5. : Danh sách học viên thuộc lớp (, , ).
6. : Ngọn lửa chuyên cần học tập (, , , ).
7. : Nhật ký hoạt động tính Streak (, , , ).
8. : Danh mục huy hiệu mốc chuyên cần (, , , ).
9. : Huy hiệu đã mở khóa của học viên (, , ).
10. : Điểm số 6 trục kỹ năng & dự đoán TOEIC (, , , , , , , ).
11. : Lịch sử ảnh chụp tăng trưởng năng lực theo thời gian (, , ).
12. : Bảng cảnh báo rủi ro học tập tự động (, , , , , , ).

### Cụm 2: Học Từ vựng, Sổ tay Cá nhân & Ngữ pháp + Quiz (14 Bảng)
13. : Bộ thẻ từ vựng chuẩn CEFR (, , , , ).
14. : Bộ thẻ yêu thích của học viên (, ).
15. : Thẻ từ vựng chi tiết (, , , , , , , , ).
16. : Sổ tay từ vựng cá nhân & Sổ tay STARRED (, , , , ).
17. : Từ vựng trong sổ tay (, , , ).
18. : Tiến trình lặp lại ngắt quãng SM-2 (, , , , , , ).
19. : Lịch sử đánh giá phản xạ SM-2 (, , , , , , ).
20. : Danh mục chuyên đề ngữ pháp (, , , ).
21. : Bài giảng lý thuyết Markdown GFM (, , , , ).
22. : Tiến độ đọc bài giảng (, , , ).
23. : Bài giảng ngữ pháp yêu thích (, ).
24. : Câu hỏi trắc nghiệm Quiz củng cố (, , , , , ).
25. : Lượt làm bài Quiz củng cố (, , , , , ).
26. : Chi tiết đáp án chọn trong lượt Quiz (, , , ).

### Cụm 3: Động cơ Thi thử TOEIC Chuẩn ETS (4 Bảng)
27. : Đề thi thử TOEIC chuẩn 200 câu (, , , ).
28. : Ngân hàng câu hỏi 7 Parts (, , , , , , , , , , ).
29. : Phiên thi thử của học viên (, , , , , , , , , ).
30. : Chi tiết đáp án chọn 200 câu (, , , ).

### Cụm 4: Quản lý Bài tập & Studio Chấm điểm (5 Bảng)
31. : Đề bài tập gốc Template (, , , , ).
32. : Liên kết câu hỏi Quiz vào bài tập (, , ).
33. : Phân công bài tập kèm Deadline riêng (, , , , ).
34. : Bài nộp của học viên (, , , , , , , ).
35. : Kết quả chấm điểm Rubric 4 tiêu chí (, , , , , , , ).

---

## 2. DANH MỤC POSTGRESQL ENUMS BẮT BUỘC

1. : , , 
2. : , , , , , 
3. : , , 
4. : , , , 
5. : , 
6. : , , 
7. : , , , 
8. : , , 

---

## 3. EXTENSIONS VÀ CHỈ MỤC GIN SEARCH

### Kích hoạt Extensions


### Chỉ mục GIN Search


---

## 4. LUẬT CẤM TRUY VẤN TRONG VÒNG LẶP (TRIỆT TIÊU N+1 QUERY)

* **Quy tắc nghiêm ngặt:** Tuyệt đối **KHÔNG chạy câu lệnh truy vấn CSDL (, ) bên trong vòng lặp (, , )**.
* **Giải pháp chuẩn:**
  1. Gom mảng tham số và sử dụng mệnh đề  hoặc .
  2. Thực thi **Batch Insert** () ngoài vòng lặp.
