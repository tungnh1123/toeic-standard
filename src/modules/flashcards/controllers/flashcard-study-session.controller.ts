import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlashcardStudySessionService } from '../services/flashcard-study-session.service';
import { GetStudySessionQueryDto } from '../dto/get-study-session-query.dto';
import { SavePersonalNoteDto } from '../dto/save-personal-note.dto';
import { StudySessionResponseDto } from '../dto/study-card-response.dto';
import { UserCardBookmarkEntity } from '../entities/user-card-bookmark.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Public,
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/flashcards')
export class FlashcardStudySessionController {
  constructor(
    private readonly studySessionService: FlashcardStudySessionService,
  ) {}

  /**
   * Endpoint #15: Khởi tạo gói dữ liệu cho phiên học 3D tương tác
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('study-session')
  public async getStudySession(
    @CurrentUser() user: JwtUserPayload | undefined,
    @Query() query: GetStudySessionQueryDto,
  ): Promise<StudySessionResponseDto> {
    return await this.studySessionService.getStudySessionCards(
      user?.sub ?? null,
      query,
    );
  }

  /**
   * Endpoint: Đánh dấu sao / Bỏ đánh dấu sao từ vựng (Toggle Bookmark)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  public async toggleBookmark(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ isBookmarked: boolean }> {
    return await this.studySessionService.toggleCardBookmark(user.sub, id);
  }

  /**
   * Endpoint: Lấy danh sách từ vựng đã đánh dấu sao của học viên
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('bookmarks')
  public async getBookmarks(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<UserCardBookmarkEntity[]> {
    return await this.studySessionService.getBookmarkedCards(user.sub);
  }

  /**
   * Endpoint: Lưu ghi chú cá nhân của học viên cho từ vựng
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Put(':id/personal-note')
  public async savePersonalNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SavePersonalNoteDto,
  ): Promise<UserCardBookmarkEntity> {
    return await this.studySessionService.savePersonalNote(
      user.sub,
      id,
      dto,
    );
  }
}
