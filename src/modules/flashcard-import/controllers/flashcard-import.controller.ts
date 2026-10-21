import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FlashcardImportService } from '../services/flashcard-import.service';
import {
  ImportMatrixResultDto,
  ImportDeckWordsResultDto,
} from '../dto/import-flashcard.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';
import * as path from 'path';
import * as fs from 'fs';

@Controller('admin/flashcards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FlashcardImportController {
  constructor(
    private readonly flashcardImportService: FlashcardImportService,
  ) {}

  /**
   * Endpoint FNC_ADM_12: Nhập từ vựng hàng loạt vào một bộ thẻ chỉ định từ file Excel
   * POST /api/v1/admin/flashcards/decks/:id/import-words
   */
  @Post('decks/:id/import-words')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public async importWordsToDeck(
    @Param('id', ParseUUIDPipe) deckId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportDeckWordsResultDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Vui lòng đính kèm tệp Excel (.xlsx) trong trường "file".',
      });
    }

    return await this.flashcardImportService.importWordsToDeck(
      deckId,
      file.buffer,
    );
  }

  /**
   * Nhập ma trận từ vựng Oxford toàn diện (tự động phân loại theo bộ thẻ CEFR)
   * POST /api/v1/admin/flashcards/import-oxford-matrix
   */
  @Post('import-oxford-matrix')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public async importOxfordMatrix(
    @CurrentUser() user?: JwtUserPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportMatrixResultDto> {
    // Nếu có file upload từ client, ưu tiên dùng buffer đó
    if (file && file.buffer) {
      return await this.flashcardImportService.importOxfordMatrix(
        file.buffer,
        user?.sub,
      );
    }

    // Nếu không có file upload, tìm file mặc định trong root dự án
    const defaultFilePath = path.resolve(
      process.cwd(),
      'oxford_vocabulary_matrix-import.xlsx',
    );
    if (!fs.existsSync(defaultFilePath)) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message:
          'Không tìm thấy tệp "oxford_vocabulary_matrix-import.xlsx" tại máy chủ và không có tệp đính kèm.',
      });
    }

    return await this.flashcardImportService.importOxfordMatrixFile(
      defaultFilePath,
    );
  }
}

