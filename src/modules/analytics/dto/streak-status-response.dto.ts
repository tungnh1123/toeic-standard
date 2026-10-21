export class StreakBadgeItemDto {
  id: string;
  code: string;
  title: string;
  description: string;
  milestoneDays: number;
  iconUrl: string;
  rewardExp: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export class StreakStatusResponseDto {
  currentStreak: number;
  longestStreak: number;
  isCompletedToday: boolean;
  freezeCreditsRemaining: number;
  lastActivityDate: string;
  streakStartedDate: string;
  daysToNextMilestone: number;
  nextMilestoneBadge: StreakBadgeItemDto | null;
}

