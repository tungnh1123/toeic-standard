import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  UserFlashcardProgressEntity,
  FlashcardStatus,
} from '../entities/user-flashcard-progress.entity';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { FlashcardStudyLogEntity } from '../entities/flashcard-study-log.entity';
import { UserStreakEntity } from '../../analytics/entities/user-streak.entity';
import { Sm2EngineService } from './sm2-engine.service';
import {
  ReviewCardDto,
  BatchReviewDto,
  BatchReviewCardItemDto,
} from '../dto/review-card.dto';
import {
  ReviewResponseDto,
  BatchReviewResponseDto,
  DueSummaryResponseDto,
  DeckDueSummaryItem,
  RetentionStatsResponseDto,
  DailyActivityItem,
} from '../dto/review-response.dto';

@Injectable()
export class FlashcardSrsService {
  constructor(
    @InjectRepository(FlashcardEntity)
    private readonly cardRepo: Repository<FlashcardEntity>,
    @InjectRepository(UserFlashcardProgressEntity)
    private readonly progressRepo: Repository<UserFlashcardProgressEntity>,
    @InjectRepository(FlashcardStudyLogEntity)
    private readonly studyLogRepo: Repository<FlashcardStudyLogEntity>,
    @InjectRepository(UserStreakEntity)
    private readonly streakRepo: Repository<UserStreakEntity>,
    private readonly sm2Engine: Sm2EngineService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Đánh giá một thẻ từ vựng với tính toàn vẹn CSDL Transaction
   */
  public async processReview(
    userId: string,
    cardId: string,
    dto: ReviewCardDto,
  ): Promise<ReviewResponseDto> {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Thẻ từ vựng không tồn tại trong hệ thống.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Tìm hoặc khởi tạo bản ghi tiến trình
      let progress = await manager.findOne(UserFlashcardProgressEntity, {
        where: { userId, flashcardId: cardId },
      });

      if (!progress) {
        progress = manager.create(UserFlashcardProgressEntity, {
          userId,
          flashcardId: cardId,
          repetitionCount: 0,
          intervalDays: 0,
          easeFactor: 2.50,
          status: FlashcardStatus.NEW,
          dueDate: new Date().toISOString().split('T')[0],
        });
      }

      const prevInterval = progress.intervalDays;
      const prevEf = Number(progress.easeFactor);

      // 2. Tính toán lịch ôn tiếp theo qua SM-2 Engine
      const reviewDate = dto.reviewedAt ? new Date(dto.reviewedAt) : new Date();
      const sm2Output = this.sm2Engine.calculateNextSchedule({
        currentRepetition: progress.repetitionCount,
        currentInterval: progress.intervalDays,
        currentEaseFactor: prevEf,
        rating: dto.rating,
        baseDate: reviewDate,
        previousDueDate: progress.dueDate,
      });

      // 3. Cập nhật tiến trình người dùng
      progress.repetitionCount = sm2Output.nextRepetition;
      progress.intervalDays = sm2Output.nextInterval;
      progress.easeFactor = sm2Output.nextEaseFactor;
      progress.dueDate = sm2Output.nextDueDate;
      progress.status = sm2Output.status;
      progress.lastReviewedAt = reviewDate;

      await manager.save(UserFlashcardProgressEntity, progress);

      // 4. Ghi bản ghi vào lịch sử flashcard_study_logs
      const studyLog = manager.create(FlashcardStudyLogEntity, {
        userId,
        flashcardId: cardId,
        rating: dto.rating,
        previousInterval: prevInterval,
        newInterval: sm2Output.nextInterval,
        previousEf: prevEf,
        newEf: sm2Output.nextEaseFactor,
        studyDurationMs: dto.studyDurationMs ?? 0,
        reviewedAt: reviewDate,
      });
      await manager.save(FlashcardStudyLogEntity, studyLog);

      // 5. Cập nhật chuỗi Streak hoạt động
      await this.touchUserStreak(manager, userId, reviewDate);

      const message = sm2Output.isMastered
        ? 'Xuất sắc! Từ vựng đã đạt cấp độ thành thạo dài hạn.'
        : `Hẹn gặp lại từ này sau ${sm2Output.nextInterval} ngày.`;

      return {
        flashcardId: cardId,
        rating: dto.rating,
        repetitionCount: progress.repetitionCount,
        intervalDays: progress.intervalDays,
        easeFactor: progress.easeFactor,
        dueDate: progress.dueDate,
        status: progress.status,
        isMastered: sm2Output.isMastered,
        message,
      };
    });
  }

  /**
   * Xử lý đánh giá theo lô nhiều thẻ từ sau một phiên học
   */
  public async processBatchReview(
    userId: string,
    dto: BatchReviewDto,
  ): Promise<BatchReviewResponseDto> {
    const results: ReviewResponseDto[] = [];
    let graduatedCount = 0;
    let relearnCount = 0;

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const now = new Date();

      for (const item of dto.items) {
        let progress = await manager.findOne(UserFlashcardProgressEntity, {
          where: { userId, flashcardId: item.flashcardId },
        });

        if (!progress) {
          progress = manager.create(UserFlashcardProgressEntity, {
            userId,
            flashcardId: item.flashcardId,
            repetitionCount: 0,
            intervalDays: 0,
            easeFactor: 2.50,
            status: FlashcardStatus.NEW,
            dueDate: now.toISOString().split('T')[0],
          });
        }

        const prevInterval = progress.intervalDays;
        const prevEf = Number(progress.easeFactor);
        const reviewDate = item.reviewedAt ? new Date(item.reviewedAt) : now;

        const sm2Output = this.sm2Engine.calculateNextSchedule({
          currentRepetition: progress.repetitionCount,
          currentInterval: progress.intervalDays,
          currentEaseFactor: prevEf,
          rating: item.rating,
          baseDate: reviewDate,
          previousDueDate: progress.dueDate,
        });

        progress.repetitionCount = sm2Output.nextRepetition;
        progress.intervalDays = sm2Output.nextInterval;
        progress.easeFactor = sm2Output.nextEaseFactor;
        progress.dueDate = sm2Output.nextDueDate;
        progress.status = sm2Output.status;
        progress.lastReviewedAt = reviewDate;

        await manager.save(UserFlashcardProgressEntity, progress);

        const studyLog = manager.create(FlashcardStudyLogEntity, {
          userId,
          flashcardId: item.flashcardId,
          rating: item.rating,
          previousInterval: prevInterval,
          newInterval: sm2Output.nextInterval,
          previousEf: prevEf,
          newEf: sm2Output.nextEaseFactor,
          studyDurationMs: item.studyDurationMs ?? 0,
          reviewedAt: reviewDate,
        });
        await manager.save(FlashcardStudyLogEntity, studyLog);

        if (item.rating >= 3) {
          graduatedCount++;
        } else {
          relearnCount++;
        }

        results.push({
          flashcardId: item.flashcardId,
          rating: item.rating,
          repetitionCount: progress.repetitionCount,
          intervalDays: progress.intervalDays,
          easeFactor: progress.easeFactor,
          dueDate: progress.dueDate,
          status: progress.status,
          isMastered: sm2Output.isMastered,
          message: sm2Output.isMastered
            ? 'Từ vựng đã đạt cấp độ thành thạo!'
            : `Hẹn gặp lại sau ${progress.intervalDays} ngày.`,
        });
      }

      await this.touchUserStreak(manager, userId, now);
    });

    return {
      processedCount: results.length,
      graduatedCount,
      relearnCount,
      results,
    };
  }

  /**
   * Lấy tổng quan số thẻ đến hạn hôm nay phân bổ theo từng bộ thẻ
   */
  public async getDueSummary(userId: string): Promise<DueSummaryResponseDto> {
    const todayStr = new Date().toISOString().split('T')[0];

    const rawDecks: Array<{
      deckId: string;
      deckTitle: string;
      level: string;
      dueCount: string;
    }> = await this.dataSource.query(
      `
      SELECT 
        d.id AS "deckId",
        d.title AS "deckTitle",
        d.level,
        COUNT(c.id)::int AS "dueCount"
      FROM flashcard_decks d
      JOIN flashcards c ON c.deck_id = d.id
      JOIN user_flashcard_progress prog ON prog.flashcard_id = c.id AND prog.user_id = $1
      WHERE d.is_public = true
        AND prog.due_date <= $2
      GROUP BY d.id, d.title, d.level
      ORDER BY "dueCount" DESC
      `,
      [userId, todayStr],
    );

    const decks: DeckDueSummaryItem[] = rawDecks.map((row) => ({
      deckId: row.deckId,
      deckTitle: row.deckTitle,
      level: row.level,
      dueCount: Number(row.dueCount),
    }));

    const totalDueToday = decks.reduce((sum, d) => sum + d.dueCount, 0);

    return {
      totalDueToday,
      decks,
    };
  }

  /**
   * Thống kê tỷ lệ ghi nhớ dài hạn (Retention Rate) và phân bổ trạng thái từ vựng
   */
  public async getRetentionStats(userId: string): Promise<RetentionStatsResponseDto> {
    // 1. Phân bổ trạng thái NEW, LEARNING, MASTERED
    const statusCounts: Array<{ status: FlashcardStatus; count: string }> =
      await this.dataSource.query(
        `
        SELECT 
          status,
          COUNT(id)::int AS count
        FROM user_flashcard_progress
        WHERE user_id = $1
        GROUP BY status
        `,
        [userId],
      );

    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;

    for (const row of statusCounts) {
      const num = Number(row.count);
      if (row.status === FlashcardStatus.NEW) newCount = num;
      else if (row.status === FlashcardStatus.LEARNING) learningCount = num;
      else if (row.status === FlashcardStatus.MASTERED) masteredCount = num;
    }

    const totalLearned = newCount + learningCount + masteredCount;

    // 2. Tính tỷ lệ Retention Rate từ các lượt đánh giá gần đây
    const retentionData: Array<{ totalReviews: string; goodReviews: string }> =
      await this.dataSource.query(
        `
        SELECT 
          COUNT(id)::int AS "totalReviews",
          COUNT(CASE WHEN rating >= 3 THEN 1 END)::int AS "goodReviews"
        FROM flashcard_study_logs
        WHERE user_id = $1
        `,
        [userId],
      );

    const totalRev = Number(retentionData[0]?.totalReviews ?? 0);
    const goodRev = Number(retentionData[0]?.goodReviews ?? 0);
    const retentionRate = totalRev > 0 ? Number(((goodRev / totalRev) * 100).toFixed(1)) : 100.0;

    // 3. Hoạt động học 7 ngày gần nhất
    const recentActivityRaw: Array<{ date: string; reviewedCount: string }> =
      await this.dataSource.query(
        `
        SELECT 
          TO_CHAR(reviewed_at, 'YYYY-MM-DD') AS date,
          COUNT(id)::int AS "reviewedCount"
        FROM flashcard_study_logs
        WHERE user_id = $1
          AND reviewed_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY TO_CHAR(reviewed_at, 'YYYY-MM-DD')
        ORDER BY date ASC
        `,
        [userId],
      );

    const recentActivity: DailyActivityItem[] = recentActivityRaw.map((row) => ({
      date: row.date,
      reviewedCount: Number(row.reviewedCount),
    }));

    return {
      totalLearned,
      retentionRate,
      newCount,
      learningCount,
      masteredCount,
      recentActivity,
    };
  }

  /**
   * Cập nhật chỉ số chuyên cần học tập (Streak) của người dùng
   */
  private async touchUserStreak(
    manager: EntityManager,
    userId: string,
    activityDate: Date,
  ): Promise<void> {
    const todayStr = activityDate.toISOString().split('T')[0];
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
      return; // Đã ghi nhận hoạt động hôm nay
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
      // Bị gián đoạn chuỗi
      streak.currentStreak = 1;
      streak.streakStartedDate = todayStr;
    }

    streak.lastActivityDate = todayStr;
    await manager.save(UserStreakEntity, streak);
  }
}
