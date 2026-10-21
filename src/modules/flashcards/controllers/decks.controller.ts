import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DecksService } from '../services/decks.service';
import { GetDecksFilterDto } from '../dto/get-decks-filter.dto';
import { GetDeckCardsDto } from '../dto/get-deck-cards.dto';
import {
  DeckCatalogItemDto,
  DeckDetailResponseDto,
  TodayDecksSummaryDto,
} from '../dto/deck-catalog-response.dto';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Public,
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  /**
   * Endpoint #10: Lấy danh mục bộ thẻ từ vựng kèm bộ lọc CEFR, Topic & Tiến độ cá nhân
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get()
  public async getCatalog(
    @CurrentUser() user: JwtUserPayload | undefined,
    @Query() filter: GetDecksFilterDto,
  ): Promise<{ items: DeckCatalogItemDto[]; total: number; page: number; limit: number }> {
    return await this.decksService.getCatalogWithUserProgress(user?.sub ?? null, filter);
  }

  /**
   * Endpoint #14: Thống kê nhanh tổng số từ đến hạn ôn trong ngày trên toàn hệ thống
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('summary/today')
  public async getTodaySummary(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<TodayDecksSummaryDto> {
    return await this.decksService.getTodaySummary(user.sub);
  }

  /**
   * Endpoint #11: Lấy thông tin chi tiết một bộ thẻ và 5 từ xem trước
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  public async getDeckDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload | undefined,
  ): Promise<DeckDetailResponseDto> {
    return await this.decksService.getDeckDetail(id, user?.sub ?? null);
  }

  /**
   * Endpoint #12: Lấy danh sách từ vựng chi tiết trong bộ thẻ (Phân trang)
   */
  @Public()
  @UseGuards(JwtAuthGuard)
  @Get(':id/cards')
  public async getDeckCards(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetDeckCardsDto,
  ): Promise<{ items: FlashcardEntity[]; total: number; page: number; limit: number }> {
    return await this.decksService.getDeckCards(id, query);
  }

  /**
   * Endpoint #13: Đánh dấu / Hủy đánh dấu bộ thẻ yêu thích (Toggle)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  public async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ isFavorite: boolean }> {
    return await this.decksService.toggleFavorite(user.sub, id);
  }
}
