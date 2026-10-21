import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { GrammarLessonsService } from '../services/grammar-lessons.service';
import { UpdateReadingProgressDto } from '../dto/update-reading-progress.dto';
import { GrammarCategoryResponseDto } from '../dto/grammar-category-response.dto';
import { GrammarLessonItemDto } from '../dto/grammar-lesson-item.dto';
import { GrammarLessonDetailResponseDto } from '../dto/grammar-lesson-detail.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Public,
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/grammar')
export class GrammarLessonsController {
  constructor(private readonly grammarService: GrammarLessonsService) {}

  /**
   * Endpoint #25: Danh mục chuyên đề ngữ pháp kèm % tiến độ
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('categories')
  public async getCategories(
    @CurrentUser() user: JwtUserPayload | undefined,
  ): Promise<GrammarCategoryResponseDto[]> {
    return await this.grammarService.getCategoriesWithProgress(
      user?.sub ?? null,
    );
  }

  /**
   * Endpoint #26: Danh sách bài học thuộc chuyên đề
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('categories/:id/lessons')
  public async getCategoryLessons(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: JwtUserPayload | undefined,
  ): Promise<GrammarLessonItemDto[]> {
    return await this.grammarService.getLessonsByCategory(
      user?.sub ?? null,
      categoryId,
    );
  }

  /**
   * Endpoint #30: Danh sách bài học ngữ pháp vừa đọc gần đây
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('recent')
  public async getRecentLessons(
    @CurrentUser() user: JwtUserPayload,
    @Query('limit') limit?: string,
  ): Promise<GrammarLessonItemDto[]> {
    const parsedLimit = limit ? Math.min(Math.max(Number(limit), 1), 50) : 10;
    return await this.grammarService.getRecentLessons(user.sub, parsedLimit);
  }

  /**
   * Endpoint #27: Chi tiết bài giảng Markdown GFM, mục lục TOC
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('lessons/:id')
  public async getLessonDetail(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtUserPayload | undefined,
  ): Promise<GrammarLessonDetailResponseDto> {
    return await this.grammarService.getLessonDetail(
      user?.sub ?? null,
      lessonId,
    );
  }

  /**
   * Endpoint #28: Cập nhật % cuộn trang đọc & hoàn thành bài
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @Post('lessons/:id/progress')
  public async updateProgress(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateReadingProgressDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ isCompleted: boolean; scrollPercentage: number }> {
    return await this.grammarService.updateProgress(user.sub, lessonId, dto);
  }

  /**
   * Endpoint #29: Đánh dấu yêu thích bài giảng ngữ pháp (Toggle)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @Post('lessons/:id/bookmark')
  public async toggleBookmark(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ isBookmarked: boolean }> {
    return await this.grammarService.toggleBookmark(user.sub, lessonId);
  }
}
