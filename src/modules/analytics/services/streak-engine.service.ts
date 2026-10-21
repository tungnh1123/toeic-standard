import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserStreakEntity } from '../entities/user-streak.entity';
import { UserStreakActivityEntity } from '../entities/user-streak-activity.entity';
import { StreakBadgeEntity } from '../entities/streak-badge.entity';
import { UserStreakBadgeEntity } from '../entities/user-streak-badge.entity';
import {
  StreakStatusResponseDto,
  StreakBadgeItemDto,
} from '../dto/streak-status-response.dto';
import {
  StreakCalendarResponseDto,
  DayActivityItemDto,
} from '../dto/streak-calendar-response.dto';
import { StreakBadgeListResponseDto } from '../dto/streak-badges-response.dto';

export interface TouchActivityPayload {
  userId: string;
  activityType:
    | 'FLASHCARD_SM2'
    | 'GRAMMAR_READING'
    | 'GRAMMAR_QUIZ'
    | 'ASSIGNMENT_SUBMIT'
    | 'TOEIC_EXAM'
    | 'STREAK_FREEZE';
  referenceId?: string;
  durationSeconds?: number;
  clientTimezone?: string;
}

interface CalendarRow {
  date: string;
  count: string | number;
  is_frozen: boolean;
}

@Injectable()
export class StreakEngineService implements OnModuleInit {
  private readonly logger = new Logger(StreakEngineService.name);

  constructor(
    @InjectRepository(UserStreakEntity)
    private readonly streakRepo: Repository<UserStreakEntity>,
    @InjectRepository(UserStreakActivityEntity)
    private readonly activityRepo: Repository<UserStreakActivityEntity>,
    @InjectRepository(StreakBadgeEntity)
    private readonly badgeRepo: Repository<StreakBadgeEntity>,
    @InjectRepository(UserStreakBadgeEntity)
    private readonly userBadgeRepo: Repository<UserStreakBadgeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.seedInitialStreakBadges();
  }

  /**
   * Endpoint #39: Lấy trạng thái Streak hôm nay & vé bảo lưu
   */
  public async getStreakStatus(
    userId: string,
    timezone: string = 'Asia/Ho_Chi_Minh',
  ): Promise<StreakStatusResponseDto> {
    const today = this.getCurrentDateInUserTimezone(timezone);

    let streak = await this.streakRepo.findOne({ where: { userId } });
    if (!streak) {
      streak = this.streakRepo.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        freezeCredits: 2,
        lastActivityDate: today,
        streakStartedDate: today,
      });
      streak = await this.streakRepo.save(streak);
    }

    // Kiểm tra xem hôm nay đã có hoạt động học nào chưa
    const todayActivitiesCount = await this.activityRepo.count({
      where: { userId, activityDate: today },
    });
    const isCompletedToday =
      todayActivitiesCount > 0 ||
      (streak.lastActivityDate === today && streak.currentStreak > 0);

    // Lấy danh mục huy hiệu để tính mốc tiếp theo
    const allBadges = await this.badgeRepo.find({
      order: { milestoneDays: 'ASC' },
    });
    const unlockedBadges = await this.userBadgeRepo.find({
      where: { userId },
      relations: ['badge'],
    });
    const unlockedMap = new Map<string, Date>();
    unlockedBadges.forEach((ub) => {
      unlockedMap.set(ub.badgeId, ub.unlockedAt);
    });

    const nextMilestone = allBadges.find(
      (b) => b.milestoneDays > streak!.currentStreak,
    );
    let nextMilestoneBadge: StreakBadgeItemDto | null = null;
    let daysToNextMilestone = 0;

    if (nextMilestone) {
      daysToNextMilestone = nextMilestone.milestoneDays - streak.currentStreak;
      nextMilestoneBadge = {
        id: nextMilestone.id,
        code: nextMilestone.code,
        title: nextMilestone.title,
        description: nextMilestone.description,
        milestoneDays: nextMilestone.milestoneDays,
        iconUrl: nextMilestone.iconUrl,
        rewardExp: nextMilestone.rewardExp,
        isUnlocked: unlockedMap.has(nextMilestone.id),
        unlockedAt: unlockedMap.get(nextMilestone.id)?.toISOString() ?? null,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      isCompletedToday,
      freezeCreditsRemaining: streak.freezeCredits,
      lastActivityDate: streak.lastActivityDate,
      streakStartedDate: streak.streakStartedDate,
      daysToNextMilestone,
      nextMilestoneBadge,
    };
  }

  /**
   * Endpoint #40: Lấy ma trận lịch học Heatmap 365 ngày qua
   */
  public async getStreakCalendar(
    userId: string,
  ): Promise<StreakCalendarResponseDto> {
    const rawActivities: CalendarRow[] = await this.dataSource.query(
      `
      SELECT 
        TO_CHAR(activity_date, 'YYYY-MM-DD') AS date,
        COUNT(id)::int AS count,
        BOOL_OR(activity_type = 'STREAK_FREEZE') AS is_frozen
      FROM user_streak_activities
      WHERE user_id = $1 
        AND activity_date >= (CURRENT_DATE - INTERVAL '365 days')
      GROUP BY activity_date
      ORDER BY activity_date ASC
      `,
      [userId],
    );

    const activities: DayActivityItemDto[] = rawActivities.map((row) => {
      const count = Number(row.count);
      let level = 0;
      if (count === 1) level = 1;
      else if (count >= 2 && count <= 3) level = 2;
      else if (count >= 4) level = 3;

      return {
        date: row.date,
        count,
        level,
        isFrozen: Boolean(row.is_frozen),
      };
    });

    return {
      totalActiveDays: activities.length,
      activities,
    };
  }

  /**
   * Endpoint #41: Kích hoạt 1 vé bảo lưu chuỗi Streak Freeze
   */
  public async activateStreakFreeze(
    userId: string,
    timezone: string = 'Asia/Ho_Chi_Minh',
  ): Promise<{ freezeCreditsRemaining: number; message: string }> {
    const today = this.getCurrentDateInUserTimezone(timezone);

    return await this.dataSource.transaction(
      async (manager: EntityManager) => {
        let streak = await manager.findOne(UserStreakEntity, {
          where: { userId },
        });

        if (!streak) {
          streak = manager.create(UserStreakEntity, {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            freezeCredits: 2,
            lastActivityDate: today,
            streakStartedDate: today,
          });
          streak = await manager.save(streak);
        }

        if (streak.freezeCredits <= 0) {
          throw new BadRequestException({
            errorCode: 'ERR_FREEZE_EMPTY',
            message:
              'Bạn đã sử dụng hết vé bảo lưu chuỗi (Streak Freeze) trong tháng này.',
          });
        }

        // Kiểm tra xem hôm nay đã kích hoạt vé bảo lưu chưa
        const existingFreeze = await manager.findOne(
          UserStreakActivityEntity,
          {
            where: {
              userId,
              activityDate: today,
              activityType: 'STREAK_FREEZE',
            },
          },
        );

        if (existingFreeze) {
          return {
            freezeCreditsRemaining: streak.freezeCredits,
            message: 'Hôm nay bạn đã kích hoạt vé bảo lưu chuỗi rồi!',
          };
        }

        // Trừ 1 vé và ghi log hoạt động
        streak.freezeCredits -= 1;
        streak.lastActivityDate = today;
        await manager.save(streak);

        const activity = manager.create(UserStreakActivityEntity, {
          userId,
          activityDate: today,
          activityType: 'STREAK_FREEZE',
          durationSeconds: 0,
        });
        await manager.save(activity);

        return {
          freezeCreditsRemaining: streak.freezeCredits,
          message:
            'Đã kích hoạt 1 vé bảo lưu chuỗi thành công! Chuỗi học tập của bạn được bảo vệ an toàn hôm nay.',
        };
      },
    );
  }

  /**
   * Endpoint #42: Danh sách huy hiệu mốc chuyên cần
   */
  public async getStreakBadges(
    userId: string,
  ): Promise<StreakBadgeListResponseDto> {
    const allBadges = await this.badgeRepo.find({
      order: { milestoneDays: 'ASC' },
    });

    const userBadges = await this.userBadgeRepo.find({
      where: { userId },
    });

    const unlockedMap = new Map<string, Date>();
    userBadges.forEach((ub) => {
      unlockedMap.set(ub.badgeId, ub.unlockedAt);
    });

    const badges: StreakBadgeItemDto[] = allBadges.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description,
      milestoneDays: b.milestoneDays,
      iconUrl: b.iconUrl,
      rewardExp: b.rewardExp,
      isUnlocked: unlockedMap.has(b.id),
      unlockedAt: unlockedMap.get(b.id)?.toISOString() ?? null,
    }));

    return {
      totalBadges: allBadges.length,
      unlockedCount: userBadges.length,
      badges,
    };
  }

  /**
   * Kích hoạt ghi nhận hành vi học tập hợp lệ và tính toán chuỗi Streak
   */
  public async recordValidActivity(payload: TouchActivityPayload): Promise<{
    isStreakIncreased: boolean;
    currentStreak: number;
    unlockedBadge: StreakBadgeEntity | null;
  }> {
    const { userId, activityType, referenceId, durationSeconds } = payload;
    const today = this.getCurrentDateInUserTimezone(payload.clientTimezone);

    return await this.dataSource.transaction(
      async (manager: EntityManager) => {
        // 1. Ghi log hoạt động học tập
        const activityLog = manager.create(UserStreakActivityEntity, {
          userId,
          activityDate: today,
          activityType,
          referenceId: referenceId ?? null,
          durationSeconds: durationSeconds || 0,
        });
        await manager.save(activityLog);

        // 2. Lấy thông tin Streak hiện tại của người dùng
        let streak = await manager.findOne(UserStreakEntity, {
          where: { userId },
        });

        if (!streak) {
          streak = manager.create(UserStreakEntity, {
            userId,
            currentStreak: 1,
            longestStreak: 1,
            freezeCredits: 2,
            lastActivityDate: today,
            streakStartedDate: today,
          });
          await manager.save(streak);
          const badge = await this.checkAndAwardBadges(manager, userId, 1);
          return {
            isStreakIncreased: true,
            currentStreak: 1,
            unlockedBadge: badge,
          };
        }

        // 3. Kiểm tra tính liên tục theo ngày
        const lastDate = streak.lastActivityDate;
        if (lastDate === today) {
          // Đã học hôm nay rồi -> Giữ nguyên chuỗi
          return {
            isStreakIncreased: false,
            currentStreak: streak.currentStreak,
            unlockedBadge: null,
          };
        }

        const diffDays = this.calculateDaysDifference(lastDate, today);
        let streakIncreased = false;

        if (diffDays === 1) {
          // Học liên tiếp đúng ngày hôm sau -> Tăng chuỗi Streak
          streak.currentStreak += 1;
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }
          streak.lastActivityDate = today;
          streakIncreased = true;
        } else if (diffDays === 2 && streak.freezeCredits > 0) {
          // Bỏ lỡ 1 ngày nhưng còn vé bảo lưu (Streak Freeze)
          streak.freezeCredits -= 1;
          streak.currentStreak += 1;
          streak.lastActivityDate = today;
          streakIncreased = true;
          this.logger.log(
            `User ${userId} đã tự động sử dụng 1 vé Streak Freeze để bảo vệ chuỗi.`,
          );
        } else {
          // Đứt chuỗi hoàn toàn -> Reset về 1
          streak.currentStreak = 1;
          streak.streakStartedDate = today;
          streak.lastActivityDate = today;
          streakIncreased = true;
        }

        await manager.save(streak);

        // 4. Kiểm tra mở khóa huy hiệu mốc chuyên cần
        const unlockedBadge = await this.checkAndAwardBadges(
          manager,
          userId,
          streak.currentStreak,
        );

        return {
          isStreakIncreased: streakIncreased,
          currentStreak: streak.currentStreak,
          unlockedBadge,
        };
      },
    );
  }

  /**
   * Kiểm tra mở khóa huy hiệu (Milestone Badges)
   */
  private async checkAndAwardBadges(
    manager: EntityManager,
    userId: string,
    currentStreak: number,
  ): Promise<StreakBadgeEntity | null> {
    const eligibleBadge = await manager.findOne(StreakBadgeEntity, {
      where: { milestoneDays: currentStreak },
    });

    if (!eligibleBadge) return null;

    const existingAward = await manager.findOne(UserStreakBadgeEntity, {
      where: { userId, badgeId: eligibleBadge.id },
    });

    if (!existingAward) {
      const award = manager.create(UserStreakBadgeEntity, {
        userId,
        badgeId: eligibleBadge.id,
        achievedStreakCount: currentStreak,
      });
      await manager.save(award);
      return eligibleBadge;
    }

    return null;
  }

  public getCurrentDateInUserTimezone(
    timezone: string = 'Asia/Ho_Chi_Minh',
  ): string {
    const now = new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
        now,
      );
    } catch {
      return now.toISOString().split('T')[0];
    }
  }

  private calculateDaysDifference(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1).getTime();
    const d2 = new Date(dateStr2).getTime();
    return Math.floor((d2 - d1) / (1000 * 3600 * 24));
  }

  /**
   * Khởi tạo danh mục các mốc Huy hiệu Chuyên cần chuẩn Gamification
   */
  private async seedInitialStreakBadges(): Promise<void> {
    try {
      const count = await this.badgeRepo.count();
      if (count > 0) return;

      this.logger.log('Khởi tạo danh mục huy hiệu chuyên cần (Streak Badges)...');

      const badgesToSeed = [
        {
          code: 'STREAK_3',
          title: 'Mồi Lửa Đầu Tiên',
          description: 'Học tập liên tục trong 3 ngày đầu tiên.',
          milestoneDays: 3,
          iconUrl: 'badges/streak_3.png',
          rewardExp: 50,
        },
        {
          code: 'STREAK_7',
          title: 'Ngọn Lửa Kiên Trì',
          description: 'Duy trì chuỗi học tập trọn vẹn 1 tuần (7 ngày).',
          milestoneDays: 7,
          iconUrl: 'badges/streak_7.png',
          rewardExp: 100,
        },
        {
          code: 'STREAK_14',
          title: 'Thói Quen Bền Vững',
          description: 'Hình thành phản xạ học tập đều đặn trong 14 ngày (2 tuần).',
          milestoneDays: 14,
          iconUrl: 'badges/streak_14.png',
          rewardExp: 200,
        },
        {
          code: 'STREAK_30',
          title: 'Chiến Binh Bất Bại',
          description: 'Kỷ luật thép duy trì việc học suốt 1 tháng (30 ngày).',
          milestoneDays: 30,
          iconUrl: 'badges/streak_30.png',
          rewardExp: 500,
        },
        {
          code: 'STREAK_100',
          title: 'Bậc Thầy Kỷ Luật',
          description: 'Cán mốc 100 ngày học liên tục không ngừng nghỉ.',
          milestoneDays: 100,
          iconUrl: 'badges/streak_100.png',
          rewardExp: 2000,
        },
        {
          code: 'STREAK_365',
          title: 'Huyền Thoại Chuyên Cần',
          description: 'Chinh phục kỳ tích học liên tục 365 ngày trọn vẹn 1 năm.',
          milestoneDays: 365,
          iconUrl: 'badges/streak_365.png',
          rewardExp: 10000,
        },
      ];

      for (const b of badgesToSeed) {
        const badgeEntity = this.badgeRepo.create(b);
        await this.badgeRepo.save(badgeEntity);
      }

      this.logger.log('Khởi tạo thành công 6 mốc huy hiệu chuyên cần!');
    } catch (err) {
      this.logger.warn(`Lỗi khởi tạo huy hiệu: ${(err as Error).message}`);
    }
  }
}
