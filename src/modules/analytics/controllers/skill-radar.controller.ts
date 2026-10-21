import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkillRadarEngineService } from '../services/skill-radar-engine.service';
import { SkillRadarResponseDto } from '../dto/skill-radar-response.dto';
import { WeaknessDiagnosisResponseDto } from '../dto/weakness-diagnosis-response.dto';
import { HardWordsResponseDto } from '../dto/hard-words-response.dto';
import { SkillHistoryResponseDto } from '../dto/skill-history-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/skill-radar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.ADMIN)
export class SkillRadarController {
  constructor(private readonly skillRadarService: SkillRadarEngineService) {}

  /**
   * Endpoint #43: Lấy dữ liệu Radar 6 kỹ năng hiện tại & dự đoán điểm TOEIC
   */
  @Get('me')
  public async getSkillRadar(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SkillRadarResponseDto> {
    return await this.skillRadarService.getSkillRadar(user.sub);
  }

  /**
   * Endpoint #44: Chẩn đoán 2 điểm yếu nhất & danh sách gợi ý khắc phục
   */
  @Get('diagnose')
  public async diagnoseWeaknesses(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<WeaknessDiagnosisResponseDto> {
    return await this.skillRadarService.diagnoseWeaknesses(user.sub);
  }

  /**
   * Endpoint #45: Báo cáo danh sách từ khó tự động (EF <= 1.70 trong SM-2)
   */
  @Get('hard-words')
  public async getHardWordsReport(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<HardWordsResponseDto> {
    return await this.skillRadarService.getHardWordsReport(user.sub);
  }

  /**
   * Endpoint #46: Lấy lịch sử snapshots tăng trưởng năng lực theo thời gian
   */
  @Get('history')
  public async getSkillHistory(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SkillHistoryResponseDto> {
    return await this.skillRadarService.getSkillHistory(user.sub);
  }

  /**
   * Endpoint #47: Kích hoạt tính toán lại chỉ số 6 kỹ năng ngay lập tức
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  public async recalculateSkills(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<SkillRadarResponseDto> {
    return await this.skillRadarService.recalculateSkills(user.sub);
  }
}
