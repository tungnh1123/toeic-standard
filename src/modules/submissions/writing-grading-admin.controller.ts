import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WritingGradingService, GradingReviewResult } from './writing-grading.service';
import { ReviewWritingSubmissionDto } from './dto/review-writing-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../common/decorators/roles.decorator';

@Controller('admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WritingGradingAdminController {
  constructor(private readonly gradingService: WritingGradingService) {}

  /**
   * Lấy thông tin chi tiết bài nộp và bản nháp chấm điểm cũ
   * GET /api/v1/admin/submissions/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  public async getSubmissionForGrading(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return await this.gradingService.getSubmissionForGrading(id, {
      id: user.sub,
      role: user.role,
    });
  }

  /**
   * Endpoint #60: Lưu kết quả chấm Rubric, highlight sửa lỗi và nhận xét
   * POST /api/v1/admin/submissions/:id/review
   */
  @Post(':id/review')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  public async reviewWritingSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ReviewWritingSubmissionDto,
  ): Promise<GradingReviewResult> {
    return await this.gradingService.reviewWritingSubmission(
      id,
      user.sub,
      user.role,
      dto,
    );
  }
}
