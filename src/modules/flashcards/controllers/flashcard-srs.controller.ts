import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlashcardSrsService } from '../services/flashcard-srs.service';
import { ReviewCardDto, BatchReviewDto } from '../dto/review-card.dto';
import {
  ReviewResponseDto,
  BatchReviewResponseDto,
  DueSummaryResponseDto,
  RetentionStatsResponseDto,
} from '../dto/review-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/flashcards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class FlashcardSrsController {
  constructor(private readonly srsService: FlashcardSrsService) {}

  /**
   * Endpoint #31: Đánh giá phản xạ SM-2 (1-4) cho 1 thẻ từ vựng
   * POST /api/v1/student/flashcards/:id/review
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  public async reviewCard(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) cardId: string,
    @Body() dto: ReviewCardDto,
  ): Promise<ReviewResponseDto> {
    return await this.srsService.processReview(user.sub, cardId, dto);
  }

  /**
   * Endpoint #32: Đánh giá theo lô nhiều thẻ từ sau một phiên học
   * POST /api/v1/student/flashcards/batch-review
   */
  @Post('batch-review')
  @HttpCode(HttpStatus.OK)
  public async batchReview(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: BatchReviewDto,
  ): Promise<BatchReviewResponseDto> {
    return await this.srsService.processBatchReview(user.sub, dto);
  }

  /**
   * Endpoint #33: Tổng quan số lượng từ đến hạn ôn hôm nay theo từng bộ thẻ
   * GET /api/v1/student/flashcards/due-summary
   */
  @Get('due-summary')
  public async getDueSummary(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<DueSummaryResponseDto> {
    return await this.srsService.getDueSummary(user.sub);
  }

  /**
   * Endpoint #34: Thống kê tỷ lệ ghi nhớ dài hạn (Retention Rate) & phân bổ thẻ
   * GET /api/v1/student/flashcards/retention-stats
   */
  @Get('retention-stats')
  public async getRetentionStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<RetentionStatsResponseDto> {
    return await this.srsService.getRetentionStats(user.sub);
  }
}

