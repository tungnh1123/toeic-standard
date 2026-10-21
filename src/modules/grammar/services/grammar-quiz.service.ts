import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { GrammarLessonEntity } from '../entities/grammar-lesson.entity';
import { GrammarQuizQuestionEntity } from '../entities/grammar-quiz-question.entity';
import { UserGrammarQuizAttemptEntity } from '../entities/user-grammar-quiz-attempt.entity';
import { UserGrammarQuizAnswerEntity } from '../entities/user-grammar-quiz-answer.entity';
import { UserGrammarProgressEntity } from '../entities/user-grammar-progress.entity';
import { UserStreakEntity } from '../../analytics/entities/user-streak.entity';
import { SubmitGrammarQuizDto } from '../dto/submit-grammar-quiz.dto';
import {
  QuizResultResponseDto,
  QuestionReviewItemDto,
} from '../dto/quiz-result-response.dto';
import {
  QuizQuestionsResponseDto,
  StudentQuizQuestionItemDto,
} from '../dto/quiz-questions-response.dto';
import {
  QuizHistoryResponseDto,
  QuizAttemptSummaryItemDto,
} from '../dto/quiz-attempt-history.dto';

@Injectable()
export class GrammarQuizService implements OnModuleInit {
  private readonly logger = new Logger(GrammarQuizService.name);

  constructor(
    @InjectRepository(GrammarLessonEntity)
    private readonly lessonRepo: Repository<GrammarLessonEntity>,
    @InjectRepository(GrammarQuizQuestionEntity)
    private readonly questionRepo: Repository<GrammarQuizQuestionEntity>,
    @InjectRepository(UserGrammarQuizAttemptEntity)
    private readonly attemptRepo: Repository<UserGrammarQuizAttemptEntity>,
    @InjectRepository(UserGrammarQuizAnswerEntity)
    private readonly answerRepo: Repository<UserGrammarQuizAnswerEntity>,
    @InjectRepository(UserGrammarProgressEntity)
    private readonly progressRepo: Repository<UserGrammarProgressEntity>,
    private readonly dataSource: DataSource,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.seedInitialQuizQuestions();
  }

  /**
   * Endpoint #35: Lấy câu hỏi quiz củng cố (Ẩn đáp án đúng và lời giải khi đang làm bài)
   */
  public async getQuizQuestionsForStudent(
    lessonId: string,
  ): Promise<QuizQuestionsResponseDto> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, isPublished: true },
    });
    if (!lesson) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học ngữ pháp không tồn tại hoặc chưa được xuất bản.',
      });
    }

    const questions = await this.questionRepo.find({
      where: { lessonId },
      order: { questionNumber: 'ASC' },
      select: [
        'id',
        'questionNumber',
        'questionText',
        'options',
        'difficultyLevel',
      ],
    });

    if (questions.length === 0) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học này chưa có câu hỏi trắc nghiệm củng cố.',
      });
    }

    const formattedQuestions: StudentQuizQuestionItemDto[] = questions.map(
      (q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        difficultyLevel: q.difficultyLevel,
      }),
    );

    return {
      lessonId,
      totalQuestions: formattedQuestions.length,
      questions: formattedQuestions,
    };
  }

  /**
   * Endpoint #36: Nộp bài quiz, chấm điểm, ghi nhận Streak và trả về lời giải
   */
  public async submitQuiz(
    userId: string,
    lessonId: string,
    dto: SubmitGrammarQuizDto,
  ): Promise<QuizResultResponseDto> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, isPublished: true },
    });
    if (!lesson) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bài học ngữ pháp không tồn tại.',
      });
    }

    const questions = await this.questionRepo.find({
      where: { lessonId },
      order: { questionNumber: 'ASC' },
    });

    if (questions.length === 0) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy câu hỏi kiểm tra của bài học.',
      });
    }

    return await this.dataSource.transaction(
      async (manager: EntityManager) => {
        // 1. Tính toán lần thi thứ mấy (attempt number)
        const previousAttemptsCount = await manager.count(
          UserGrammarQuizAttemptEntity,
          {
            where: { userId, lessonId },
          },
        );
        const attemptNumber = previousAttemptsCount + 1;

        // 2. Chấm điểm từng câu
        let correctCount = 0;
        const questionReviewList: QuestionReviewItemDto[] = [];
        const answersToInsert: Array<{
          questionId: string;
          selectedOption: string | null;
          isCorrect: boolean;
        }> = [];

        for (const question of questions) {
          const userAns = dto.answers.find((a) => a.questionId === question.id);
          const selectedOpt = userAns?.selectedOption?.toUpperCase() || null;
          const isCorrect = selectedOpt === question.correctOption;

          if (isCorrect) {
            correctCount += 1;
          }

          answersToInsert.push({
            questionId: question.id,
            selectedOption: selectedOpt,
            isCorrect,
          });

          questionReviewList.push({
            questionId: question.id,
            questionNumber: question.questionNumber,
            questionText: question.questionText,
            options: question.options,
            selectedOption: selectedOpt,
            correctOption: question.correctOption,
            isCorrect,
            explanation: question.explanation,
            translation: question.translation ?? null,
          });
        }

        const totalQuestions = questions.length;
        const score = Number(((correctCount / totalQuestions) * 100).toFixed(2));
        const isPassed = score >= 80.0;

        // 3. Tạo và lưu bản ghi Attempt
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
        const savedAttempt = await manager.save(
          UserGrammarQuizAttemptEntity,
          attempt,
        );

        // 4. Lưu danh sách chi tiết các câu trả lời
        const finalAnswers = answersToInsert.map((ans) =>
          manager.create(UserGrammarQuizAnswerEntity, {
            attemptId: savedAttempt.id,
            questionId: ans.questionId,
            selectedOption: ans.selectedOption,
            isCorrect: ans.isCorrect,
          }),
        );
        await manager.save(UserGrammarQuizAnswerEntity, finalAnswers);

        // 5. Nếu ĐẠT chuẩn (score >= 80%), tự động hoàn thành bài học và touch Streak
        if (isPassed) {
          let progress = await manager.findOne(UserGrammarProgressEntity, {
            where: { userId, lessonId },
          });

          if (!progress) {
            progress = manager.create(UserGrammarProgressEntity, {
              userId,
              lessonId,
            });
          }

          progress.isCompleted = true;
          progress.scrollPercentage = 100;
          progress.completedAt = new Date();
          progress.lastReadAt = new Date();
          await manager.save(UserGrammarProgressEntity, progress);

          // Kích hoạt cập nhật chuỗi chuyên cần học tập (Streak)
          await this.touchUserStreak(manager, userId);
        }

        return {
          attemptId: savedAttempt.id,
          lessonId,
          score,
          correctCount,
          totalQuestions,
          isPassed,
          attemptNumber,
          durationSeconds: dto.durationSeconds,
          submittedAt: savedAttempt.submittedAt.toISOString(),
          questions: questionReviewList,
        };
      },
    );
  }

  /**
   * Endpoint #37: Lấy danh sách lịch sử các lần làm quiz của bài học
   */
  public async getLessonQuizHistory(
    userId: string,
    lessonId: string,
  ): Promise<QuizHistoryResponseDto> {
    const attempts = await this.attemptRepo.find({
      where: { userId, lessonId },
      order: { submittedAt: 'DESC' },
    });

    const scores = attempts.map((a) => Number(a.score));
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const isPassed = attempts.some((a) => a.isPassed);

    const formattedAttempts: QuizAttemptSummaryItemDto[] = attempts.map((a) => ({
      attemptId: a.id,
      score: Number(a.score),
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      isPassed: a.isPassed,
      durationSeconds: a.durationSeconds,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt.toISOString(),
    }));

    return {
      lessonId,
      totalAttempts: attempts.length,
      bestScore,
      isPassed,
      attempts: formattedAttempts,
    };
  }

  /**
   * Endpoint #38: Xem lại chi tiết bài làm quiz đúng/sai của một lần thi cụ thể
   */
  public async getAttemptDetail(
    userId: string,
    attemptId: string,
  ): Promise<QuizResultResponseDto> {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, userId },
      relations: ['answers', 'answers.question'],
    });

    if (!attempt) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy kết quả lượt thi quiz này.',
      });
    }

    const answers = attempt.answers || [];
    answers.sort(
      (a, b) =>
        (a.question?.questionNumber || 0) - (b.question?.questionNumber || 0),
    );

    const questionReviews: QuestionReviewItemDto[] = answers.map((ans) => {
      const q = ans.question!;
      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        selectedOption: ans.selectedOption,
        correctOption: q.correctOption,
        isCorrect: ans.isCorrect,
        explanation: q.explanation,
        translation: q.translation,
      };
    });

    return {
      attemptId: attempt.id,
      lessonId: attempt.lessonId,
      score: Number(attempt.score),
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      isPassed: attempt.isPassed,
      attemptNumber: attempt.attemptNumber,
      durationSeconds: attempt.durationSeconds,
      submittedAt: attempt.submittedAt.toISOString(),
      questions: questionReviews,
    };
  }

  /**
   * Cập nhật chỉ số chuyên cần học tập (Streak) của người dùng
   */
  private async touchUserStreak(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    let streak = await manager.findOne(UserStreakEntity, { where: { userId } });

    if (!streak) {
      streak = manager.create(UserStreakEntity, {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        freezeCredits: 2,
        lastActivityDate: todayStr,
        streakStartedDate: todayStr,
      });
      await manager.save(UserStreakEntity, streak);
      return;
    }

    if (streak.lastActivityDate === todayStr) {
      return;
    }

    const prevDate = new Date(streak.lastActivityDate);
    const currDate = new Date(todayStr);
    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24),
    );

    if (diffDays === 1) {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else if (diffDays > 1) {
      streak.currentStreak = 1;
      streak.streakStartedDate = todayStr;
    }

    streak.lastActivityDate = todayStr;
    await manager.save(UserStreakEntity, streak);
  }

  /**
   * Khởi tạo bộ câu hỏi Quiz củng cố mẫu chuẩn TOEIC Part 5
   */
  private async seedInitialQuizQuestions(): Promise<void> {
    try {
      const count = await this.questionRepo.count();
      if (count > 0) return;

      // Tìm lesson 1: Hiện tại hoàn thành
      const lesson1 = await this.lessonRepo.findOne({
        where: { slug: 'thi-hien-tai-hoan-thanh-present-perfect-tense' },
      });

      if (!lesson1) return;

      this.logger.log('Khởi tạo câu hỏi trắc nghiệm củng cố ngữ pháp chuẩn TOEIC...');

      const questionsToSeed = [
        {
          lessonId: lesson1.id,
          questionNumber: 1,
          questionText: 'Ms. Laura _______ at ABC Corp as a senior marketing strategist since she graduated in 2021.',
          options: {
            A: 'works',
            B: 'is working',
            C: 'has worked',
            D: 'worked',
          },
          correctOption: 'C',
          explanation: 'Mệnh đề chứa liên từ "since + mốc quá khứ" (since she graduated) bắt buộc mệnh đề chính phải chia ở thì Hiện tại hoàn thành (has worked) để diễn tả hành động bắt đầu từ quá khứ và kéo dài đến hiện tại.',
          translation: 'Cô Laura đã làm việc tại tập đoàn ABC với tư cách là chuyên viên chiến lược tiếp thị cấp cao từ khi tốt nghiệp năm 2021.',
          difficultyLevel: 'EASY',
        },
        {
          lessonId: lesson1.id,
          questionNumber: 2,
          questionText: 'The shipping department has not received the official confirmation from the client _______.',
          options: {
            A: 'already',
            B: 'yet',
            C: 'still',
            D: 'ago',
          },
          correctOption: 'B',
          explanation: '"Yet" thường đứng ở cuối câu phủ định hoặc câu nghi vấn của thì Hiện tại hoàn thành, mang nghĩa "chưa". (Already thường đứng giữa have/has và V3 hoặc cuối câu khẳng định).',
          translation: 'Bộ phận giao hàng vẫn chưa nhận được xác nhận chính thức từ khách hàng.',
          difficultyLevel: 'EASY',
        },
        {
          lessonId: lesson1.id,
          questionNumber: 3,
          questionText: 'Our research team _______ remarkable progress on the new battery technology so far.',
          options: {
            A: 'makes',
            B: 'has made',
            C: 'was making',
            D: 'had been made',
          },
          correctOption: 'B',
          explanation: 'Dấu hiệu nhận biết "so far" (cho đến nay) là dấu hiệu kinh điển của thì Hiện tại hoàn thành. Chủ ngữ "Our research team" là danh từ tập hợp số ít -> chia "has made".',
          translation: 'Đội ngũ nghiên cứu của chúng tôi cho đến nay đã đạt được những tiến bộ đáng kể về công nghệ pin mới.',
          difficultyLevel: 'MEDIUM',
        },
        {
          lessonId: lesson1.id,
          questionNumber: 4,
          questionText: 'The CEO _______ several international branches during the last three years to expand our market reach.',
          options: {
            A: 'visited',
            B: 'has visited',
            C: 'visits',
            D: 'is visiting',
          },
          correctOption: 'B',
          explanation: 'Cụm từ "during the last/past + khoảng thời gian" (trong suốt 3 năm qua) là dấu hiệu bắt buộc dùng thì Hiện tại hoàn thành.',
          translation: 'Giám đốc điều hành đã đến thăm một số chi nhánh quốc tế trong ba năm qua để mở rộng phạm vi thị trường.',
          difficultyLevel: 'MEDIUM',
        },
        {
          lessonId: lesson1.id,
          questionNumber: 5,
          questionText: 'Mr. Tanaka _______ from the board of directors since the company underwent restructuring.',
          options: {
            A: 'resigned',
            B: 'has resigned',
            C: 'resigns',
            D: 'will resign',
          },
          correctOption: 'B',
          explanation: 'Cấu trúc hòa hợp thì: S + have/has + V3/ed + SINCE + S + V2/ed. Mệnh đề sau since đã có "underwent" (V2) -> mệnh đề chính chọn "has resigned".',
          translation: 'Ông Tanaka đã từ nhiệm khỏi hội đồng quản trị kể từ khi công ty tiến hành tái cấu trúc.',
          difficultyLevel: 'HARD',
        },
      ];

      for (const q of questionsToSeed) {
        const questionEntity = this.questionRepo.create(q);
        await this.questionRepo.save(questionEntity);
      }

      this.logger.log('Khởi tạo thành công 5 câu hỏi quiz củng cố cho bài học Hiện tại hoàn thành!');
    } catch (err) {
      this.logger.warn(`Lỗi khởi tạo câu hỏi quiz: ${(err as Error).message}`);
    }
  }
}

