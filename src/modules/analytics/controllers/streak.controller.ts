import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { StreakEngineService } from '../services/streak-engine.service';
import { StreakStatusResponseDto } from '../dto/streak-status-response.dto';
import { StreakCalendarResponseDto } from '../dto/streak-calendar-response.dto';
import { StreakBadgeListResponseDto } from '../dto/streak-badges-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/streak')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StreakController {
  constructor(private readonly streakService: StreakEngineService) {}

  /**
   * Endpoint #39: Lấy trạng thái Streak hôm nay & vé bảo lưu
   */
  @Get('status')
  public async getStreakStatus(
    @CurrentUser() user: JwtUserPayload,
    @Query('timezone') timezone?: string,
  ): Promise<StreakStatusResponseDto> {
    return await this.streakService.getStreakStatus(user.sub, timezone);
  }

  /**
   * Endpoint #40: Lấy ma trận lịch học Heatmap 365 ngày qua
   */
  @Get('calendar')
  public async getStreakCalendar(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StreakCalendarResponseDto> {
    return await this.streakService.getStreakCalendar(user.sub);
  }

  /**
   * Endpoint #41: Kích hoạt 1 vé bảo lưu chuỗi Streak Freeze
   */
  @Post('freeze')
  @HttpCode(HttpStatus.OK)
  public async activateStreakFreeze(
    @CurrentUser() user: JwtUserPayload,
    @Query('timezone') timezone?: string,
  ): Promise<{ freezeCreditsRemaining: number; message: string }> {
    return await this.streakService.activateStreakFreeze(user.sub, timezone);
  }

  /**
   * Endpoint #42: Danh sách huy hiệu mốc chuyên cần
   */
  @Get('badges')
  public async getStreakBadges(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StreakBadgeListResponseDto> {
    return await this.streakService.getStreakBadges(user.sub);
  }
}
