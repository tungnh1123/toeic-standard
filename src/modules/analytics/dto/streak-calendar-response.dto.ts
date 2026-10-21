export class DayActivityItemDto {
  date: string;
  count: number;
  level: number;
  isFrozen: boolean;
}

export class StreakCalendarResponseDto {
  totalActiveDays: number;
  activities: DayActivityItemDto[];
}
