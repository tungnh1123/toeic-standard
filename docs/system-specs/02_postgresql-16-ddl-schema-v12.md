# Đặc tả Chi tiết Cơ sở Dữ liệu PostgreSQL 16 (DDL & Schema) - v12.0
## Dự án: Hệ thống Học Tiếng Anh & Luyện thi TOEIC Trực tuyến

Tài liệu này cung cấp toàn bộ thiết kế DDL (Data Definition Language) chi tiết cho cơ sở dữ liệu **PostgreSQL 16** (Phiên bản v12.0 - Hoàn thiện 35 Bảng DDL Chuẩn hóa Toàn diện bao gồm Bảng Cảnh báo Rủi ro Học tập `student_academic_alerts`, Độc lập Deadline, Submissions Filtering & Assignment Questions), bao gồm Extensions, Enums, 35 Bảng dữ liệu quan hệ, Ràng buộc (Constraints), Khóa ngoại (Foreign Keys), và Chỉ mục (Indexes) tối ưu hóa hiệu năng.

---

### NHẬT KÝ THAY ĐỔI PHIÊN BẢN (CHANGELOG V12.0)
1. **Bổ sung Bảng Cảnh báo Rủi ro Học tập `student_academic_alerts` (Cụm 1):**
   * Bổ sung bảng  và 2 kiểu Enum  và  phục vụ hệ thống cảnh báo học viên nộp muộn, đứt chuỗi và tụt dốc điểm số tự động (FNC_ADM_11).
2. **Sửa Mô hình Deadline Bài tập (Cụm 4):**
   * Xóa cột `due_date` khỏi bảng `assignments` (đề bài gốc đóng vai trò template re-usable).
   * Bổ sung cột `due_date` và `class_id` vào bảng `assignment_targets`.
3. **Khắc phục Lỗi Nhân bản Bản ghi khi Lọc Bài nộp (Cụm 4):**
   * Bổ sung `target_id` và `class_id` trực tiếp vào bảng `assignment_submissions`, cho phép JOIN trực tiếp qua `s.class_id` mà không bị nhân bản dòng khi học viên thuộc nhiều lớp.
4. **Bổ sung Bảng `assignment_questions` (Cụm 4):**
   * Tạo bảng liên kết `assignment_questions (assignment_id, question_id, order_index)` để liên kết các bài tập dạng Quiz với ngân hàng câu hỏi.
5. **Hợp nhất Bảng Token Phiên đăng nhập (Cụm 1):**
   * Bỏ bảng dư thừa `admin_refresh_tokens`, dùng chung `user_refresh_tokens` cho cả 3 vai trò (ADMIN, TEACHER, STUDENT).
6. **Tổng số bảng DDL chuẩn hóa:** **35 Bảng DDL hoàn chỉnh không lỗi**.

---

### 1. Tổng quan Cấu trúc Cơ sở Dữ liệu

Cơ sở dữ liệu bao gồm **35 bảng** được chia thành 4 cụm nghiệp vụ chính:
1. **Tài khoản, Lớp học, Cảnh báo, Streak Engine & Skill Radar (12 bảng):** `users`, `user_goals`, `user_refresh_tokens`, `classes`, `class_enrollments`, `user_streaks`, `user_streak_activities`, `streak_badges`, `user_streak_badges`, `user_skill_profiles`, `user_skill_history`, `student_academic_alerts`
2. **Học Từ vựng, Sổ tay & Ngữ pháp + Quiz (14 bảng):** `flashcard_decks`, `user_favorite_decks`, `flashcards`, `user_vocabulary_notebooks`, `user_notebook_cards`, `user_flashcard_progress`, `flashcard_study_logs`, `grammar_categories`, `grammar_lessons`, `user_grammar_progress`, `user_grammar_bookmarks`, `grammar_quiz_questions`, `user_grammar_quiz_attempts`, `user_grammar_quiz_answers`
3. **Động cơ Thi thử TOEIC (4 bảng):** `toeic_exams`, `toeic_questions`, `toeic_exam_attempts`, `toeic_attempt_answers`
4. **Quản lý Bài tập & Chấm điểm Writing/Speaking/Quiz (5 bảng):** `assignments`, `assignment_questions`, `assignment_targets`, `assignment_submissions`, `submission_reviews`

---

### 2. Kích hoạt Extension & Định nghĩa Enums

```sql
-- 1. Kích hoạt Extension hỗ trợ UUID v4 và Tìm kiếm chuỗi (Trigram)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Định nghĩa các kiểu dữ liệu Enum
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE assignment_type_enum AS ENUM ('QUIZ', 'WRITING', 'SPEAKING');
CREATE TYPE submission_status_enum AS ENUM ('SUBMITTED', 'GRADING', 'GRADED', 'REJECTED');
CREATE TYPE notebook_type_enum AS ENUM ('CUSTOM', 'STARRED');
CREATE TYPE flashcard_status_enum AS ENUM ('NEW', 'LEARNING', 'MASTERED');
CREATE TYPE alert_type_enum AS ENUM ('OVERDUE_TASK', 'STREAK_AT_RISK', 'PERFORMANCE_DROP', 'ABSENTEEISM');
CREATE TYPE alert_severity_enum AS ENUM ('INFO', 'WARNING', 'CRITICAL');
```

---

### 3. Mã nguồn SQL DDL Chi tiết (35 Bảng)

```sql
-- =============================================================================
-- CỤM 1: QUẢN LÝ TÀI KHOẢN, MỤC TIÊU, LỚP HỌC, STREAK, SKILL RADAR & CẢNH BÁO (12 BẢNG)
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role_enum DEFAULT 'STUDENT' NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_score INT NOT NULL CHECK (target_score BETWEEN 10 AND 990 AND target_score % 5 = 0),
    target_exam_date DATE CHECK (target_exam_date >= CURRENT_DATE),
    starting_score INT DEFAULT 0 CHECK (starting_score BETWEEN 0 AND 990),
    daily_study_minutes INT DEFAULT 30 CHECK (daily_study_minutes BETWEEN 10 AND 360),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20) DEFAULT '2026' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_class_student UNIQUE(class_id, student_id)
);

CREATE TABLE user_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0 NOT NULL CHECK (current_streak >= 0),
    longest_streak INT DEFAULT 0 NOT NULL CHECK (longest_streak >= 0),
    freeze_credits INT DEFAULT 2 NOT NULL CHECK (freeze_credits >= 0),
    last_activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    streak_started_date DATE DEFAULT CURRENT_DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_streak_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE streak_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    milestone_days INT NOT NULL UNIQUE,
    icon_url TEXT NOT NULL,
    reward_exp INT DEFAULT 50 NOT NULL
);

CREATE TABLE user_streak_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES streak_badges(id) ON DELETE CASCADE,
    achieved_streak_count INT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_streak_badge UNIQUE(user_id, badge_id)
);

CREATE TABLE user_skill_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vocab_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (vocab_score BETWEEN 0 AND 100),
    grammar_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (grammar_score BETWEEN 0 AND 100),
    listening_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (listening_score BETWEEN 0 AND 100),
    reading_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (reading_score BETWEEN 0 AND 100),
    writing_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (writing_score BETWEEN 0 AND 100),
    speaking_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (speaking_score BETWEEN 0 AND 100),
    overall_score NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    estimated_cefr VARCHAR(10) DEFAULT 'A1' NOT NULL,
    estimated_toeic_score INT DEFAULT 200 NOT NULL CHECK (estimated_toeic_score BETWEEN 10 AND 990),
    last_calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_skill_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE DEFAULT CURRENT_DATE NOT NULL,
    skill_scores JSONB NOT NULL,
    estimated_toeic_score INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE student_academic_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    alert_type alert_type_enum NOT NULL,
    severity_level alert_severity_enum DEFAULT 'WARNING' NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- CỤM 2: HỌC TỪ VỰNG, SỔ TAY CÁ NHÂN & NGỮ PHÁP + QUIZ (14 BẢNG)
-- =============================================================================

CREATE TABLE flashcard_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    level cefr_level_enum DEFAULT 'A1' NOT NULL,
    topic_code VARCHAR(50) DEFAULT 'GENERAL' NOT NULL,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_favorite_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_favorite_deck UNIQUE(user_id, deck_id)
);

CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    term VARCHAR(150) NOT NULL,
    phonetic_ipa VARCHAR(100),
    part_of_speech VARCHAR(50),
    definition TEXT NOT NULL,
    example_sentence TEXT,
    example_translation TEXT,
    audio_url TEXT,
    audio_slow_url TEXT,
    image_url TEXT,
    collocations JSONB DEFAULT '[]'::jsonb,
    synonyms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_vocabulary_notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    notebook_type notebook_type_enum DEFAULT 'CUSTOM' NOT NULL,
    color_code VARCHAR(20) DEFAULT '#2563EB' NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'bookmark' NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uq_user_system_notebook 
ON user_vocabulary_notebooks (user_id, notebook_type) 
WHERE notebook_type != 'CUSTOM';

CREATE TABLE user_notebook_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES user_vocabulary_notebooks(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    personal_mnemonic TEXT,
    custom_example TEXT,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_notebook_flashcard UNIQUE(notebook_id, flashcard_id)
);

CREATE TABLE user_flashcard_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    repetition_count INT DEFAULT 0 NOT NULL CHECK (repetition_count >= 0),
    interval_days INT DEFAULT 0 NOT NULL CHECK (interval_days >= 0),
    ease_factor NUMERIC(4, 2) DEFAULT 2.50 NOT NULL CHECK (ease_factor >= 1.30),
    status flashcard_status_enum DEFAULT 'NEW' NOT NULL,
    due_date DATE DEFAULT CURRENT_DATE NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    CONSTRAINT uq_user_flashcard UNIQUE(user_id, flashcard_id)
);

CREATE TABLE flashcard_study_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
    previous_interval INT NOT NULL,
    new_interval INT NOT NULL,
    previous_ef NUMERIC(4, 2) NOT NULL,
    new_ef NUMERIC(4, 2) NOT NULL,
    study_duration_ms INT DEFAULT 0,
    reviewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE grammar_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    target_level cefr_level_enum DEFAULT 'A2' NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'book' NOT NULL,
    color_code VARCHAR(20) DEFAULT '#2563EB' NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE grammar_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES grammar_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    estimated_read_time_minutes INT DEFAULT 10 NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    is_published BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_grammar_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    scroll_percentage INT DEFAULT 0 NOT NULL CHECK (scroll_percentage BETWEEN 0 AND 100),
    last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_user_grammar_progress UNIQUE(user_id, lesson_id)
);

CREATE TABLE user_grammar_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_grammar_bookmark UNIQUE(user_id, lesson_id)
);

CREATE TABLE grammar_quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL,
    translation TEXT,
    difficulty_level VARCHAR(10) DEFAULT 'MEDIUM' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_grammar_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL,
    correct_count INT NOT NULL,
    total_questions INT NOT NULL,
    is_passed BOOLEAN DEFAULT false NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    attempt_number INT DEFAULT 1 NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_grammar_quiz_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES user_grammar_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES grammar_quiz_questions(id) ON DELETE CASCADE,
    selected_option CHAR(1),
    is_correct BOOLEAN NOT NULL
);

-- =============================================================================
-- CỤM 3: ĐỘNG CƠ THI THỬ TOEIC (4 BẢNG)
-- =============================================================================

CREATE TABLE toeic_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    duration_minutes INT DEFAULT 120 NOT NULL,
    audio_full_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE toeic_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES toeic_exams(id) ON DELETE CASCADE,
    part_number SMALLINT NOT NULL CHECK (part_number BETWEEN 1 AND 7),
    question_number INT NOT NULL,
    passage_text TEXT,
    image_url TEXT,
    audio_url TEXT,
    question_text TEXT,
    options JSONB,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    transcript TEXT
);

CREATE TABLE toeic_exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES toeic_exams(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    submitted_at TIMESTAMPTZ,
    listening_raw_score INT DEFAULT 0 NOT NULL,
    reading_raw_score INT DEFAULT 0 NOT NULL,
    listening_scale_score INT DEFAULT 0 NOT NULL,
    reading_scale_score INT DEFAULT 0 NOT NULL,
    total_score INT DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS' NOT NULL
);

CREATE TABLE toeic_attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES toeic_exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES toeic_questions(id) ON DELETE CASCADE,
    selected_option CHAR(1),
    is_correct BOOLEAN
);

-- =============================================================================
-- CỤM 4: QUẢN LÝ BÀI TẬP & CHẤM ĐIỂM (5 BẢNG)
-- =============================================================================

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    type assignment_type_enum NOT NULL,
    rubric JSONB,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE assignment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    question_type VARCHAR(50) DEFAULT 'GRAMMAR_QUIZ' NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    CONSTRAINT uq_assignment_question UNIQUE(assignment_id, question_id)
);

CREATE TABLE assignment_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT uq_assign_student UNIQUE(assignment_id, student_id, class_id)
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    target_id UUID REFERENCES assignment_targets(id) ON DELETE CASCADE,
    submission_text TEXT,
    audio_file_url TEXT,
    duration_seconds INT,
    status submission_status_enum DEFAULT 'SUBMITTED' NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE submission_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID UNIQUE NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_score NUMERIC(5, 2) NOT NULL,
    criteria_scores JSONB NOT NULL,
    inline_feedback JSONB,
    general_comment TEXT,
    feedback_audio_url TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

### 4. Thiết kế Chỉ mục Tối ưu hóa Hiệu năng (Indexes)

```sql
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON user_refresh_tokens(user_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_streak_activities_user_date ON user_streak_activities(user_id, activity_date DESC);
CREATE INDEX idx_streak_badges_milestone ON streak_badges(milestone_days ASC);
CREATE INDEX idx_skill_history_user_date ON user_skill_history(user_id, snapshot_date DESC);
CREATE INDEX idx_alerts_student ON student_academic_alerts(student_id, is_resolved);
CREATE INDEX idx_alerts_class ON student_academic_alerts(class_id, created_at DESC);

CREATE INDEX idx_decks_level ON flashcard_decks(level);
CREATE INDEX idx_decks_topic ON flashcard_decks(topic_code);
CREATE INDEX idx_fav_decks_user ON user_favorite_decks(user_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_term_trgm ON flashcards USING gin (term gin_trgm_ops);
CREATE INDEX idx_notebooks_user ON user_vocabulary_notebooks(user_id, is_pinned DESC, updated_at DESC);
CREATE INDEX idx_notebook_cards_nb_id ON user_notebook_cards(notebook_id, added_at DESC);
CREATE INDEX idx_user_flashcard_status ON user_flashcard_progress (user_id, status, due_date);
CREATE INDEX idx_study_logs_user_date ON flashcard_study_logs (user_id, reviewed_at DESC);

CREATE INDEX idx_grammar_lessons_cat ON grammar_lessons(category_id, order_index ASC);
CREATE INDEX idx_grammar_lessons_slug ON grammar_lessons(slug);
CREATE INDEX idx_grammar_progress_user ON user_grammar_progress(user_id, is_completed);
CREATE INDEX idx_grammar_bookmarks_user ON user_grammar_bookmarks(user_id);
CREATE INDEX idx_quiz_questions_lesson ON grammar_quiz_questions(lesson_id, question_number ASC);
CREATE INDEX idx_quiz_attempts_user_lesson ON user_grammar_quiz_attempts(user_id, lesson_id, submitted_at DESC);

CREATE INDEX idx_toeic_questions_exam_part ON toeic_questions (exam_id, part_number, question_number);
CREATE INDEX idx_toeic_attempts_user_exam ON toeic_exam_attempts (user_id, exam_id, status);
CREATE INDEX idx_toeic_attempt_answers_attempt ON toeic_attempt_answers (attempt_id);

CREATE INDEX idx_assignment_targets_student_class ON assignment_targets (student_id, class_id, is_completed, due_date);
CREATE INDEX idx_submissions_assignment_class_status ON assignment_submissions (assignment_id, class_id, status, submitted_at DESC);
CREATE INDEX idx_submissions_student ON assignment_submissions (student_id);
CREATE INDEX idx_reviews_submission ON submission_reviews (submission_id);
```
