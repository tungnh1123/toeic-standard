import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VocabularyNotebooksService } from '../services/vocabulary-notebooks.service';
import { CreateNotebookDto } from '../dto/create-notebook.dto';
import { UpdateNotebookDto } from '../dto/update-notebook.dto';
import { AddCardToNotebookDto } from '../dto/add-card-to-notebook.dto';
import { UpdateCardMnemonicDto } from '../dto/update-card-mnemonic.dto';
import {
  NotebookItemDto,
  NotebookDetailDto,
  QuickStarResponseDto,
  TroubledWordsResponseDto,
} from '../dto/notebook-response.dto';
import { UserVocabularyNotebookEntity } from '../entities/user-vocabulary-notebook.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/notebooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class VocabularyNotebooksController {
  constructor(
    private readonly notebooksService: VocabularyNotebooksService,
  ) {}

  /**
   * Endpoint #16: Lấy danh sách sổ tay cá nhân của học viên
   * GET /api/v1/student/notebooks
   */
  @Get()
  public async getUserNotebooks(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<NotebookItemDto[]> {
    return await this.notebooksService.getUserNotebooks(user.sub);
  }

  /**
   * Endpoint #17: Tạo sổ tay từ vựng cá nhân mới
   * POST /api/v1/student/notebooks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async createNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateNotebookDto,
  ): Promise<UserVocabularyNotebookEntity> {
    return await this.notebooksService.createNotebook(user.sub, dto);
  }

  /**
   * Sổ tay thông minh tự động gom từ khó nhớ (Smart Troubled Words)
   * GET /api/v1/student/notebooks/smart/troubled-words
   */
  @Get('smart/troubled-words')
  public async getSmartTroubledWords(
    @CurrentUser() user: JwtUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<TroubledWordsResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 20;
    return await this.notebooksService.getSmartTroubledWords(
      user.sub,
      pageNum,
      limitNum,
    );
  }

  /**
   * Endpoint #24: Đánh dấu sao nhanh / Bỏ sao (Quick Star Toggle)
   * POST /api/v1/student/notebooks/quick-star/:cardId
   */
  @Post('quick-star/:cardId')
  @HttpCode(HttpStatus.OK)
  public async toggleQuickStar(
    @CurrentUser() user: JwtUserPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<QuickStarResponseDto> {
    return await this.notebooksService.toggleQuickStar(user.sub, cardId);
  }

  /**
   * Endpoint #18: Cập nhật thông tin sổ tay (tiêu đề, màu sắc, ghim)
   * PUT /api/v1/student/notebooks/:id
   */
  @Put(':id')
  public async updateNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
    @Body() dto: UpdateNotebookDto,
  ): Promise<UserVocabularyNotebookEntity> {
    return await this.notebooksService.updateNotebook(user.sub, notebookId, dto);
  }

  /**
   * Endpoint #19: Xóa sổ tay từ vựng cá nhân
   * DELETE /api/v1/student/notebooks/:id
   */
  @Delete(':id')
  public async deleteNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.notebooksService.deleteNotebook(user.sub, notebookId);
  }

  /**
   * Endpoint #20: Lấy danh sách từ trong sổ tay (kèm mẹo nhớ, phân trang, tìm kiếm)
   * GET /api/v1/student/notebooks/:id/cards
   */
  @Get(':id/cards')
  public async getCardsInNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ): Promise<NotebookDetailDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 20;
    return await this.notebooksService.getCardsInNotebook(
      user.sub,
      notebookId,
      pageNum,
      limitNum,
      keyword,
    );
  }

  /**
   * Endpoint #21: Thêm từ vựng vào sổ tay kèm ghi chú mẹo nhớ
   * POST /api/v1/student/notebooks/:id/cards
   */
  @Post(':id/cards')
  @HttpCode(HttpStatus.CREATED)
  public async addCardToNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
    @Body() dto: AddCardToNotebookDto,
  ): Promise<{ success: boolean; message: string }> {
    return await this.notebooksService.addCardToNotebook(
      user.sub,
      notebookId,
      dto,
    );
  }

  /**
   * Endpoint #22: Xóa một từ vựng khỏi sổ tay cụ thể
   * DELETE /api/v1/student/notebooks/:id/cards/:cardId
   */
  @Delete(':id/cards/:cardId')
  public async removeCardFromNotebook(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.notebooksService.removeCardFromNotebook(
      user.sub,
      notebookId,
      cardId,
    );
  }

  /**
   * Endpoint #23: Cập nhật mẹo nhớ / câu ví dụ cá nhân cho từ trong sổ tay
   * PUT /api/v1/student/notebooks/:id/cards/:cardId/mnemonic
   */
  @Put(':id/cards/:cardId/mnemonic')
  public async updateCardMnemonic(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) notebookId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: UpdateCardMnemonicDto,
  ): Promise<{ success: boolean; message: string }> {
    return await this.notebooksService.updateCardMnemonic(
      user.sub,
      notebookId,
      cardId,
      dto,
    );
  }
}
