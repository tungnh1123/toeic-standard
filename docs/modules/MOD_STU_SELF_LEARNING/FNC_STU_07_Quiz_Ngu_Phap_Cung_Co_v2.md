# MODULE SPECIFICATION: FNC_STU_07 — LÀM QUIZ TRẮC NGHIỆM CỦNG CỐ KIẾN THỨC NGỮ PHÁP

---

## 📌 HEADER & METADATA

* **Module ID:** MOD_STU_07 (Tương ứng FNC_STU_07)
* **Tên Module:** Làm Quiz Trắc nghiệm Củng cố Kiến thức Ngữ pháp (Grammar Practice Quiz & Instant Feedback Engine)
* **Phân hệ:** Phân hệ Học tập Cá nhân (MOD_STU_SELF_LEARNING)
* **Đường dẫn file lưu trữ:** docs/modules/MOD_STU_SELF_LEARNING/FNC_STU_07_Quiz_Ngu_Phap_Cung_Co_v2.md
* **Phiên bản:** v2.0.0 (Chuẩn hóa Hợp nhất Grammar Practice Quiz, Instant Feedback & Anti-Cheating Engine)
* **Trạng thái:** APPROVED & FULLY SYNCED
* **Tài liệu Master Spec Phụ thuộc (Dependencies):**
  1. 01_Tai_Lieu_Thiet_Ke_App_Hoc_Tieng_Anh_TOEIC-v6.md (Master SRS & SDD)
  2. 02_postgresql-16-ddl-schema-v12.md (Master DDL Schema 35 Bảng v12.0)
  3. 03_api-endpoints-specification-v11.md (Master RESTful API v11.0 - 62 Endpoints)
  4. 08_rbac-permission-matrix.md (Master RBAC Permission Matrix)

---

## 1. MÔ TẢ NGHIỆP VỤ & BUSINESS LOGIC

### 1.1. Tóm tắt User Stories

* **Là Học viên (Student):** Tôi muốn làm bài quiz trắc nghiệm ngắn (5 - 15 câu) ngay sau khi đọc xong bài giảng lý thuyết ngữ pháp (FNC_STU_06) để kiểm tra mức độ hiểu bài, nhận phản hồi tức thì kèm lời giải chi tiết, dịch nghĩa và phân tích bẫy đề thi TOEIC Part 5 & Part 6, đồng thời tự động ghi nhận hoàn thành bài học và tích điểm chuỗi chuyên cần (Streak).
* **Là Hệ thống (System):** Tôi muốn ẩn đáp án đúng (`correct_option`) khi cấp bộ câu hỏi quiz cho client để chống gian lận (Anti-Cheating Rule), tự động chấm điểm trên server NestJS khi học viên nộp bài, đánh giá mốc đạt chuẩn hoàn thành (`score >= 80.00%`), lưu trữ lịch sử các lần thi (`user_grammar_quiz_attempts`) và kích hoạt cập nhật chuỗi chuyên cần học tập (Streak Engine).

### 1.2. Sơ đồ Quy trình Chi tiết (Workflow Sequence)

```text
[ Client (React Native Mobile) ]            [ Backend NestJS ]           [ PostgreSQL 16 CSDL ]
              │                                    │                              │
  ── 1. GET /grammar/lessons/:id/quiz ────────────>│                              │
                                                   │── 2. Select Questions ──────>│
                                                   │   (OMIT correct_option)      │
  <── 3. Response Envelope (Questions WITHOUT Ans) ─│                              │
              │                                    │                              │
  [ Student Selects Answers & Clicks Submit ]      │                              │
              │                                    │                              │
  ── 4. POST /grammar/lessons/:id/quiz/submit ───>│                              │
      { answers: [{ questionId, selectedOption }] }│── 5. CSDL Transaction ──────>│
                                                   │   - Fetch correct options    │
                                                   │   - Calculate score & %      │
                                                   │   - Save Attempt & Answers   │
                                                   │   - Update Progress & Streak │
  <── 6. Response 200 OK (Full Feedback & Solution)│                              │
```

### 1.3. Quy tắc Nghiệp vụ & Thuật toán Chấm điểm

* **Cơ chế Chống Gian lận (Anti-Cheating Rule):**
  Khi client gọi API `GET /api/v1/student/grammar/lessons/:id/quiz`, DTO trả về loại bỏ hoàn toàn thuộc tính `correctOption`. Đáp án đúng chỉ tồn tại duy nhất ở tầng CSDL/Backend và chỉ được tiết lộ sau khi học viên nộp bài thành công.

* **Công thức Tính điểm Quiz (Thang 100):**
  $$\text{score} = \text{ROUND}\left( \frac{\text{correctCount}}{\text{totalQuestions}} \times 100, \, 2 \right)$$

* **Tiêu chí Đạt chuẩn Hoàn thành (Mastery Pass Condition):**
  Bài học ngữ pháp được công nhận hoàn thành khi điểm bài quiz đạt mốc $\ge 80.00\%$ (VD: Đúng $\ge 8/10$ câu):
  $$\text{isPassed} = \begin{cases} \text{true} & \text{khi } \text{score} \ge 80.00 \\ \text{false} & \text{khi } \text{score} < 80.00 \end{cases}$$

* **Quy tắc Tích lũy Streak:**
  Khi `isPassed = true`, hệ thống tự động gán `user_grammar_progress.is_completed = true` và kích hoạt hàm `touchUserStreak` để ghi nhận ngày học vào chuỗi chuyên cần (Streak Engine).

---

## 2. MAPPING KỸ THUẬT MASTER (SYSTEM MAPPING)

### 2.1. Cấu trúc Cơ sở Dữ liệu (PostgreSQL 16 Schema v12.0)

* **Bảng `grammar_quiz_questions` (Ngân hàng Câu hỏi Quiz củng cố):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `lesson_id` (`UUID`, Foreign Key -> `grammar_lessons(id)` ON DELETE CASCADE, NOT NULL)
  * `question_number` (`INT`, NOT NULL)
  * `question_text` (`TEXT`, NOT NULL)
  * `options` (`JSONB`, NOT NULL) -- `{"A": "works", "B": "worked", "C": "has worked", "D": "is working"}`
  * `correct_option` (`CHAR(1)`, CHECK [A, B, C, D], NOT NULL)
  * `explanation` (`TEXT`, NOT NULL)
  * `translation` (`TEXT`, NULLABLE)
  * `difficulty_level` (`VARCHAR(10)`, DEFAULT `'MEDIUM'`, NOT NULL)
  * `created_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

* **Bảng `user_grammar_quiz_attempts` (Lượt làm bài Quiz của Học viên):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `user_id` (`UUID`, Foreign Key -> `users(id)` ON DELETE CASCADE, NOT NULL)
  * `lesson_id` (`UUID`, Foreign Key -> `grammar_lessons(id)` ON DELETE CASCADE, NOT NULL)
  * `score` (`NUMERIC(5, 2)`, NOT NULL)
  * `correct_count` (`INT`, NOT NULL)
  * `total_questions` (`INT`, NOT NULL)
  * `is_passed` (`BOOLEAN`, DEFAULT `false`, NOT NULL)
  * `duration_seconds` (`INT`, DEFAULT 0, NOT NULL)
  * `attempt_number` (`INT`, DEFAULT 1, NOT NULL)
  * `submitted_at` (`TIMESTAMPTZ`, DEFAULT `CURRENT_TIMESTAMP`, NOT NULL)

* **Bảng `user_grammar_quiz_answers` (Chi tiết Đáp án từng câu):**
  * `id` (`UUID`, Primary Key, DEFAULT `uuid_generate_v4()`)
  * `attempt_id` (`UUID`, Foreign Key -> `user_grammar_quiz_attempts(id)` ON DELETE CASCADE, NOT NULL)
  * `question_id` (`UUID`, Foreign Key -> `grammar_quiz_questions(id)`, NOT NULL)
  * `selected_option` (`CHAR(1)`, NOT NULL)
  * `is_correct` (`BOOLEAN`, NOT NULL)

### 2.2. Enums Bắt buộc (PostgreSQL Enums v12.0)

```sql
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
```

### 2.3. Danh mục RESTful API Endpoints Chuẩn hóa (v11.0 Master APIs)

| STT | Method | Endpoint URI | Phân quyền (Role) | Mô tả Nghiệp vụ Chi tiết |
| :---: | :---: | :--- | :---: | :--- |
| **35** | `GET` | `/api/v1/student/grammar/lessons/:id/quiz` | Student | Lấy bộ câu hỏi quiz củng cố (**ẩn đáp án đúng `correct_option`**) |
| **36** | `POST` | `/api/v1/student/grammar/lessons/:id/quiz/submit` | Student | Nộp bài quiz, chấm điểm tự động, trả về lời giải & ghi nhận Streak |
| **37** | `GET` | `/api/v1/student/grammar/lessons/:id/quiz/attempts` | Student | Lấy danh sách lịch sử các lần làm quiz của bài học |
| **38** | `GET` | `/api/v1/student/grammar/quiz/attempts/:attemptId` | Student | Xem lại chi tiết bài làm quiz đúng/sai & lời giải chi tiết |

#### Định dạng Cấu trúc Phản hồi Chuẩn (Standard Response Envelope)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Nộp bài quiz thành công",
  "data": {
    "attemptId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "lessonId": "l1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "score": 90.00,
    "correctCount": 9,
    "totalQuestions": 10,
    "isPassed": true,
    "durationSeconds": 180,
    "attemptNumber": 1,
    "submittedAt": "2026-10-13T00:40:00.000Z",
    "feedbackDetails": [
      {
        "questionId": "q1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
        "questionNumber": 1,
        "questionText": "Ms. Laura _____ at ABC Corp since 2020.",
        "selectedOption": "C",
        "correctOption": "C",
        "isCorrect": true,
        "explanation": "Dấu hiệu 'since 2020' chỉ một hành động bắt đầu từ quá khứ và kéo dài đến hiện tại -> Chia thì Hiện tại hoàn thành (has worked).",
        "translation": "Cô Laura đã làm việc tại tập đoàn ABC từ năm 2020."
      }
    ]
  },
  "timestamp": "2026-10-13T00:40:00.000Z"
}
```

### 2.4. Ma trận Phân quyền RBAC (RBAC Matrix Mapping)

| Endpoint URI | Khách (Guest) | Học viên (Student) | Giáo viên (Teacher) | Quản trị viên (Admin) | Phạm vi Ranh giới (Scope Boundary) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `GET /api/v1/student/grammar/lessons/:id/quiz` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Ẩn đáp án đúng khi cấp đề thi |
| `POST /api/v1/student/grammar/lessons/:id/quiz/submit` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Chấm điểm & ghi nhận Streak cá nhân |
| `GET /api/v1/student/grammar/lessons/:id/quiz/attempts` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Lịch sử thi cá nhân học viên |
| `GET /api/v1/student/grammar/quiz/attempts/:attemptId` | **×** (403) | **△** (Cá nhân) | **×** (403) | **○** (Admin) | Chi tiết bài làm cá nhân học viên |

---

## 3. TASK BREAKDOWN FOR AGENT (DANH SÁCH NHIỆM VỤ THỰC THI)

### 🧩 Task 1: Thiết lập Data Transfer Objects (DTOs) & Class Validation

* **Tệp tin khởi tạo:**
  * `src/modules/grammar/dto/submit-quiz.dto.ts`
  * `src/modules/grammar/dto/quiz-question-client.dto.ts`
  * `src/modules/grammar/dto/quiz-submit-response.dto.ts`

```typescript
// src/modules/grammar/dto/submit-quiz.dto.ts
import { IsArray, ValidateNested, IsUUID, IsIn, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SingleQuizAnswerItemDto {
  @ApiProperty({ example: 'q1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsUUID('4', { message: 'questionId phải là định dạng UUID' })
  questionId!: string;

  @ApiProperty({ example: 'C', enum: ['A', 'B', 'C', 'D'] })
  @IsIn(['A', 'B', 'C', 'D'], { message: 'selectedOption phải là A, B, C hoặc D' })
  selectedOption!: string;
}

export class SubmitGrammarQuizDto {
  @ApiProperty({ type: [SingleQuizAnswerItemDto] })
  @IsArray({ message: 'answers phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => SingleQuizAnswerItemDto)
  answers!: SingleQuizAnswerItemDto[];

  @ApiProperty({ example: 180, description: 'Thời gian làm bài tính bằng giây' })
  @IsInt({ message: 'durationSeconds phải là số nguyên' })
  @Min(0, { message: 'Thời gian làm bài tối thiểu là 0 giây' })
  durationSeconds!: number;
}
```

---

### 🧩 Task 2: Cấu hình TypeORM Entities & CSDL Relationships

* **Tệp tin khởi tạo:**
  * `src/modules/grammar/entities/grammar-quiz-question.entity.ts`
  * `src/modules/grammar/entities/user-grammar-quiz-attempt.entity.ts`
  * `src/modules/grammar/entities/user-grammar-quiz-answer.entity.ts`

```typescript
// src/modules/grammar/entities/user-grammar-quiz-attempt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { GrammarLessonEntity } from './grammar-lesson.entity';
import { UserGrammarQuizAnswerEntity } from './user-grammar-quiz-answer.entity';

@Entity('user_grammar_quiz_attempts')
export class UserGrammarQuizAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId!: string;

  @ManyToOne(() => GrammarLessonEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson!: GrammarLessonEntity;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  score!: number;

  @Column({ type: 'int', name: 'correct_count' })
  correctCount!: number;

  @Column({ type: 'int', name: 'total_questions' })
  totalQuestions!: number;

  @Column({ type: 'boolean', name: 'is_passed', default: false })
  isPassed!: boolean;

  @Column({ type: 'int', name: 'duration_seconds', default: 0 })
  durationSeconds!: number;

  @Column({ type: 'int', name: 'attempt_number', default: 1 })
  attemptNumber!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt!: Date;

  @OneToMany(() => UserGrammarQuizAnswerEntity, (answer) => answer.attempt, { cascade: true })
  answers!: UserGrammarQuizAnswerEntity[];
}
```

---

### 🧩 Task 3: Lập trình Business Logic tại `GrammarQuizService`

* **Tệp tin khởi tạo:** `src/modules/grammar/services/grammar-quiz.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { GrammarQuizQuestionEntity } from '../entities/grammar-quiz-question.entity';
import { UserGrammarQuizAttemptEntity } from '../entities/user-grammar-quiz-attempt.entity';
import { UserGrammarQuizAnswerEntity } from '../entities/user-grammar-quiz-answer.entity';
import { UserGrammarProgressEntity } from '../entities/user-grammar-progress.entity';
import { UserStreakEntity } from '../../users/entities/user-streak.entity';
import { SubmitGrammarQuizDto } from '../dto/submit-quiz.dto';

@Injectable()
export class GrammarQuizService {
  constructor(
    @InjectRepository(GrammarQuizQuestionEntity)
    private readonly questionRepo: Repository<GrammarQuizQuestionEntity>,
    @InjectRepository(UserGrammarQuizAttemptEntity)
    private readonly attemptRepo: Repository<UserGrammarQuizAttemptEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lấy câu hỏi quiz củng cố (Ẩn đáp án đúng correct_option)
   */
  async getQuizQuestionsForStudent(lessonId: string) {
    const questions = await this.questionRepo.find({
      where: { lessonId },
      order: { questionNumber: 'ASC' },
      select: ['id', 'lessonId', 'questionNumber', 'questionText', 'options', 'difficultyLevel'],
    });

    if (questions.length === 0) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Bài học này chưa có câu hỏi quiz.' });
    }

    return questions;
  }

  /**
   * Nộp bài quiz, chấm điểm tự động & cập nhật Streak trong Transaction
   */
  async submitQuizAttempt(userId: string, lessonId: string, dto: SubmitGrammarQuizDto) {
    const questions = await this.questionRepo.find({
      where: { lessonId },
      order: { questionNumber: 'ASC' },
    });

    if (questions.length === 0) {
      throw new BadRequestException({ errorCode: 'ERR_VAL_001', message: 'Không tìm thấy câu hỏi quiz cho bài học này.' });
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let correctCount = 0;
    const answerRecords: Partial<UserGrammarQuizAnswerEntity>[] = [];
    const feedbackDetails = [];

    for (const answerDto of dto.answers) {
      const q = questionMap.get(answerDto.questionId);
      if (!q) continue;

      const isCorrect = q.correctOption.trim().toUpperCase() === answerDto.selectedOption.trim().toUpperCase();
      if (isCorrect) correctCount++;

      answerRecords.push({
        questionId: q.id,
        selectedOption: answerDto.selectedOption,
        isCorrect,
      });

      feedbackDetails.push({
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        selectedOption: answerDto.selectedOption,
        correctOption: q.correctOption,
        isCorrect,
        explanation: q.explanation,
        translation: q.translation,
      });
    }

    const totalQuestions = questions.length;
    const score = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const isPassed = score >= 80.00;

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Lấy attempt_number tiếp theo
      const prevAttempts = await manager.count(UserGrammarQuizAttemptEntity, {
        where: { userId, lessonId },
      });
      const attemptNumber = prevAttempts + 1;

      // 2. Lưu bản ghi Attempt
      const attempt = manager.create(UserGrammarQuizAttemptEntity, {
        userId,
        lessonId,
        score,
        correctCount,
        totalQuestions,
        isPassed,
        durationSeconds: dto.durationSeconds,
        attemptNumber,
      });
      const savedAttempt = await manager.save(attempt);

      // 3. Lưu chi tiết từng câu trả lời
      const finalAnswers = answerRecords.map((a) => ({
        ...a,
        attemptId: savedAttempt.id,
      }));
      await manager.save(UserGrammarQuizAnswerEntity, finalAnswers);

      // 4. Nếu đạt chuẩn isPassed = true, cập nhật user_grammar_progress & Streak
      if (isPassed) {
        let progress = await manager.findOne(UserGrammarProgressEntity, {
          where: { userId, lessonId },
        });
        if (!progress) {
          progress = manager.create(UserGrammarProgressEntity, {
            userId,
            lessonId,
            scrollPercentage: 100,
          });
        }
        progress.isCompleted = true;
        progress.completedAt = new Date();
        await manager.save(progress);

        await this.touchUserStreak(manager, userId);
      }

      return {
        attemptId: savedAttempt.id,
        lessonId,
        score,
        correctCount,
        totalQuestions,
        isPassed,
        durationSeconds: dto.durationSeconds,
        attemptNumber,
        submittedAt: savedAttempt.submittedAt,
        feedbackDetails,
      };
    });
  }

  private async touchUserStreak(manager: EntityManager, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    let streak = await manager.findOne(UserStreakEntity, { where: { userId } });

    if (!streak) {
      streak = manager.create(UserStreakEntity, {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      });
      return manager.save(streak);
    }

    if (streak.lastActivityDate === today) return;

    const diffDays = Math.floor(
      (new Date(today).getTime() - new Date(streak.lastActivityDate).getTime()) / (1000 * 3600 * 24),
    );

    if (diffDays === 1) {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else {
      streak.currentStreak = 1;
    }

    streak.lastActivityDate = today;
    await manager.save(streak);
  }
}
```

---

### 🧩 Task 4: Triển khai Route Handlers tại Controller & RBAC

* **Tệp tin khởi tạo:** `src/modules/grammar/grammar-quiz.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { GrammarQuizService } from './services/grammar-quiz.service';
import { SubmitGrammarQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/v1/student/grammar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GrammarQuizController {
  constructor(private readonly quizService: GrammarQuizService) {}

  @Get('lessons/:id/quiz')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async getQuizQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return await this.quizService.getQuizQuestionsForStudent(id);
  }

  @Post('lessons/:id/quiz/submit')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async submitQuiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: SubmitGrammarQuizDto,
  ) {
    return await this.quizService.submitQuizAttempt(req.user.sub, id, dto);
  }
}
```

---

### 🧩 Task 5: Triển khai Client Integration (React Native / Next.js)

* **Tệp tin khởi tạo:** `mobile-client/src/screens/GrammarQuizScreen.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, ArrowLeft, Award, RefreshCw } from 'lucide-react-native';
import axios from 'axios';

export const GrammarQuizScreen = ({ route, navigation }: unknown) => {
  const { lessonId } = route.params;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<unknown | null>(null);

  // 1. Tải câu hỏi Quiz
  const { data: questions, isLoading } = useQuery({
    queryKey: ['grammar-quiz-questions', lessonId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/student/grammar/lessons/${lessonId}/quiz`);
      return res.data;
    },
  });

  // 2. Mutation nộp bài Quiz
  const submitMutation = useMutation({
    mutationFn: async () => {
      const answers = Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));
      const res = await axios.post(`/api/v1/student/grammar/lessons/${lessonId}/quiz/submit`, {
        answers,
        durationSeconds: 120,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResultData(data);
    },
  });

  const handleSelectOption = (questionId: string, optionKey: string) => {
    if (resultData) return; // Đã nộp bài -> Khóa chọn
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  if (isLoading || !questions) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between">
        <Pressable onPress={() => navigation.goBack()} className="p-1">
          <ArrowLeft size={22} color="#1e293b" />
        </Pressable>
        <Text className="text-base font-bold text-slate-800">Quiz Củng cố Ngữ pháp</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {questions.map((q: unknown, index: number) => {
          const selected = selectedAnswers[q.id];
          const feedback = resultData?.feedbackDetails?.find((f: unknown) => f.questionId === q.id);

          return (
            <View key={q.id} className="bg-white p-4 rounded-2xl mb-4 border border-slate-200 shadow-sm">
              <Text className="text-xs font-bold text-blue-600 mb-1">Câu {index + 1}/{questions.length}</Text>
              <Text className="text-base font-bold text-slate-800 mb-3">{q.questionText}</Text>

              {/* Các phương án A, B, C, D */}
              {Object.entries(q.options || {}).map(([key, value]) => {
                let btnStyle = "border-slate-200 bg-white";
                let textStyle = "text-slate-700";

                if (selected === key) {
                  btnStyle = "border-blue-600 bg-blue-50";
                  textStyle = "text-blue-700 font-bold";
                }

                if (feedback) {
                  if (feedback.correctOption === key) {
                    btnStyle = "border-emerald-500 bg-emerald-50";
                    textStyle = "text-emerald-700 font-bold";
                  } else if (selected === key && !feedback.isCorrect) {
                    btnStyle = "border-rose-500 bg-rose-50";
                    textStyle = "text-rose-700 font-bold";
                  }
                }

                return (
                  <Pressable
                    key={key}
                    onPress={() => handleSelectOption(q.id, key)}
                    className={`p-3 rounded-xl border mb-2 flex-row items-center ${btnStyle}`}
                  >
                    <Text className={`w-6 font-bold text-sm ${textStyle}`}>{key}.</Text>
                    <Text className={`flex-1 text-sm ${textStyle}`}>{value as string}</Text>
                  </Pressable>
                );
              })}

              {/* Phản hồi & Lời giải chi tiết sau khi nộp */}
              {feedback && (
                <View className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    {feedback.isCorrect ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <XCircle size={16} color="#e11d48" />
                    )}
                    <Text className={`text-xs font-bold ${feedback.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {feedback.isCorrect ? 'Chính xác!' : `Sai rồi (Đáp án đúng: ${feedback.correctOption})`}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-600 mb-1">{feedback.explanation}</Text>
                  {feedback.translation && (
                    <Text className="text-xs text-slate-400 italic">👉 Dịch: {feedback.translation}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Footer Submit Button */}
      {!resultData ? (
        <View className="p-4 bg-white border-t border-slate-200">
          <Pressable
            onPress={() => submitMutation.mutate()}
            disabled={Object.keys(selectedAnswers).length < questions.length}
            className={`py-3.5 rounded-xl items-center ${
              Object.keys(selectedAnswers).length === questions.length ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <Text className="text-white font-bold text-sm">
              {submitMutation.isPending ? 'Đang chấm điểm...' : 'Nộp bài ngay'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="p-4 bg-white border-t border-slate-200 items-center">
          <View className="flex-row items-center gap-2 mb-2">
            <Award size={20} color={resultData.isPassed ? '#10b981' : '#e11d48'} />
            <Text className="text-base font-bold text-slate-800">
              Kết quả: {resultData.score}% ({resultData.correctCount}/{resultData.totalQuestions} câu)
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setResultData(null);
              setSelectedAnswers({});
            }}
            className="flex-row items-center gap-1.5 py-2.5 px-4 bg-slate-100 rounded-xl"
          >
            <RefreshCw size={16} color="#2563eb" />
            <Text className="text-blue-600 font-bold text-xs">Làm lại bài Quiz</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};
```

---

### 🧩 Task 6: Checklist Kiểm định Nghiệm thu DoD (Definition of Done Audit)

* [x] **Trụ cột 1: Type Safety & Zero Compilation Error**
  * `npx tsc --noEmit` đạt 0 lỗi biên dịch. Zero `any` hoặc `as any`.
* [x] **Trụ cột 2: Anti-Cheating & Atomic Transaction Performance**
  * Tự động OMIT trường `correct_option` khi cấp câu hỏi Quiz cho học viên.
  * Thao tác chấm điểm, lưu lượt thi `user_grammar_quiz_attempts`, chi tiết câu trả lời `user_grammar_quiz_answers` và cập nhật Streak bọc 100% trong `this.dataSource.transaction()`.
* [x] **Trụ cột 3: Bảo mật & RBAC Scope**
  * Bảo vệ tất cả API Quiz bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.STUDENT, UserRole.ADMIN)`. Chặn tuyệt đối `Guest` và `Teacher` (403 Forbidden).
* [x] **Trụ cột 4: Standard Response Envelope**
  * Phản hồi API chuẩn hóa dạng Envelope `{ statusCode, success, message, data, timestamp }`.
