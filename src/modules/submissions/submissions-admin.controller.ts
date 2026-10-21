import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubmissionsService, PaginatedSubmissionsResult } from './submissions.service';
import { FilterSubmissionsDto } from './dto/filter-submissions.dto';
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
export class SubmissionsAdminController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * Endpoint #59: Tìm kiếm & Lọc danh sách bài nộp của học viên
   * GET /api/v1/admin/submissions
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  public async getSubmissions(
    @CurrentUser() user: JwtUserPayload,
    @Query() filters: FilterSubmissionsDto,
  ): Promise<PaginatedSubmissionsResult> {
    return await this.submissionsService.getSubmissions(
      { id: user.sub, role: user.role },
      filters,
    );
  }
}

