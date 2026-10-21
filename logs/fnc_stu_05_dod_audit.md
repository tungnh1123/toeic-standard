# BÁO CÁO NGHIỆM THU DEFINITION OF DONE (DoD AUDIT REPORT)
## Module: FNC_STU_05 — Đánh Dấu Từ Yêu Thích & Tạo Sổ Tay Từ Vựng Khó Nhớ
**Nhánh thực hiện:** `feat/fnc-stu-05-vocabulary-notebooks`  
**Ngày thẩm định:** 2026-10-21  
**Trạng thái:** ✅ **MERGE READY (ĐẠT 100% TIÊU CHUẨN)**

---

### TRỤ CỘT 1: CHẤT LƯỢNG MÃ NGUỒN & TYPE SAFETY (100% STRICT)
* [x] **Strict TypeScript Compilation:** Cả Backend (`npm run typecheck`) và Web Frontend (`cd web && npm run build`) đều biên dịch thành công với **0 lỗi**.
* [x] **Absolute Zero `any`:** 100% mã nguồn không sử dụng bất kỳ từ khóa `any` hoặc ép kiểu `as any`.
* [x] **Input DTO Validation:** `CreateNotebookDto`, `UpdateNotebookDto`, `AddCardToNotebookDto`, `UpdateCardMnemonicDto` áp dụng đầy đủ validator `@IsNotEmpty`, `@IsString`, `@MaxLength`, `@Matches` (kiểm tra mã màu HEX), `@IsUUID`, `@IsBoolean`.

---

### TRỤ CỘT 2: TÍNH TOÀN VẸN KIẾN TRÚC & CSDL (POSTGRESQL 16)
* [x] **Database Schema Locking:** Khai thác 2 bảng CSDL chuẩn hóa v12.0: `user_vocabulary_notebooks` và `user_notebook_cards`.
* [x] **Tự động Khởi tạo Sổ tay STARRED:** Học viên luôn tự động sở hữu sổ tay hệ thống `STARRED` (màu hổ phách `#F59E0B`, biểu tượng `star`, ghim đầu danh sách).
* [x] **Sổ tay Thông minh (Smart Troubled Words):** Tự động phát hiện và tổng hợp các từ vựng khó ($EF \le 1.70$ hoặc chưa đạt chuỗi nhớ) từ bảng `user_flashcard_progress`.
* [x] **Triệt tiêu N+1 Query:** Danh sách sổ tay truy vấn kèm `COUNT(user_notebook_cards)` trong 1 câu SQL `GROUP BY` duy nhất.
* [x] **Multi-table Database Transaction:** Thao tác toggle Quick Star đồng bộ đồng thời giữa `user_notebook_cards` và `user_card_bookmarks` bọc trong `this.dataSource.transaction`.

---

### TRỤ CỘT 3: BẢO MẬT & PHÂN QUYỀN RBAC
* [x] **RBAC Matrix Enforcement:**
  * Endpoint `#16` (`GET /api/v1/student/notebooks`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#17` (`POST /api/v1/student/notebooks`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#18` (`PUT /api/v1/student/notebooks/:id`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#19` (`DELETE /api/v1/student/notebooks/:id`): Giới hạn `@Roles(UserRole.STUDENT)` (Chặn xóa sổ tay hệ thống STARRED).
  * Endpoint `#20` (`GET /api/v1/student/notebooks/:id/cards`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#21` (`POST /api/v1/student/notebooks/:id/cards`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#22` (`DELETE /api/v1/student/notebooks/:id/cards/:cardId`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#23` (`PUT /api/v1/student/notebooks/:id/cards/:cardId/mnemonic`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint `#24` (`POST /api/v1/student/notebooks/quick-star/:cardId`): Giới hạn `@Roles(UserRole.STUDENT)`.
  * Endpoint Smart (`GET /api/v1/student/notebooks/smart/troubled-words`): Giới hạn `@Roles(UserRole.STUDENT)`.
* [x] **Input Sanitization:** Validate ID bằng `ParseUUIDPipe`.

---

### TRỤ CỘT 4: CLIENT INTEGRITY & TRẢI NGHIỆM NGƯỜI DÙNG
* [x] **TanStack Query v5 Hooks:** `useUserNotebooks`, `useCreateNotebook`, `useUpdateNotebook`, `useDeleteNotebook`, `useNotebookCards`, `useAddCardToNotebook`, `useRemoveCardFromNotebook`, `useUpdateCardMnemonic`, `useQuickStar`, `useSmartTroubledWords` chuẩn hóa qua `notebookKeys`.
* [x] **Mobile Component:** `NotebookListScreen.tsx` hiển thị lưới sổ tay, biểu tượng màu sắc, nhãn STARRED và huy hiệu số từ đã lưu.
* [x] **Web App Tab:** Tích hợp tab `Sổ Tay & Từ Khó` trên Web Portal với giao diện quản lý sổ tay, xem thẻ kèm mẹo nhớ cá nhân và danh sách từ khó SM-2.
