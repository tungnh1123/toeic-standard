import { StreakBadgeItemDto } from './streak-status-response.dto';

export class StreakBadgeListResponseDto {
  totalBadges: number;
  unlockedCount: number;
  badges: StreakBadgeItemDto[];
}
