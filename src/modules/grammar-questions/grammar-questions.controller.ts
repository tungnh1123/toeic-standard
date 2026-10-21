import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GrammarQuestionsService, PaginatedQuestionsResult } from './grammar-questions.service';
import { CreateGrammarQuestionDto } from './dto/create-grammar-question.dto';
import { UpdateGrammarQuestionDto } from './dto/update-grammar-question.dto';
import { FilterGrammarQuestionDto } from './dto/filter-grammar-question.dto';
import { AttachQuestionsToAssignmentDto } from './dto/attach-questions-assignment.dto';
import { BatchImportQuestionsDto } from './dto/batch-import-questions.dto';
import { GrammarQuizQuestionEntity } from '../grammar/entities/grammar-quiz-question.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class GrammarQuestionsController {
  constructor(private readonly questionsService: GrammarQuestionsService) {}

  /**
   * Endpoint #1: Tìm kiếm & Lọc câu hỏi trong ngân hàng
   * GET /api/v1/admin/grammar/questions
   */
  @Get('grammar/questions')
  public async getQuestions(
    @Query() filter: FilterGrammarQuestionDto,
  ): Promise<PaginatedQuestionsResult> {
    return await this.questionsService.getQuestions(filter);
  }

  /**
   * Chi tiết câu hỏi theo ID
   * GET /api/v1/admin/grammar/questions/:id
   */
  @Get('grammar/questions/:id')
  public async getQuestionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GrammarQuizQuestionEntity> {
    return await this.questionsService.getQuestionById(id);
  }

  /**
   * Endpoint #2: Thêm mới 1 câu hỏi vào ngân hàng
   * POST /api/v1/admin/grammar/questions
   */
  @Post('grammar/questions')
  @HttpCode(HttpStatus.CREATED)
  public async createQuestion(
    @Body() dto: CreateGrammarQuestionDto,
  ): Promise<GrammarQuizQuestionEntity> {
    return await this.questionsService.createQuestion(dto);
  }

  /**
   * Endpoint #3: Cập nhật thông tin câu hỏi
   * PUT /api/v1/admin/grammar/questions/:id
   */
  @Put('grammar/questions/:id')
  @HttpCode(HttpStatus.OK)
  public async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrammarQuestionDto,
  ): Promise<GrammarQuizQuestionEntity> {
    return await this.questionsService.updateQuestion(id, dto);
  }

  /**
   * Endpoint #4: Xóa 1 câu hỏi khỏi ngân hàng
   * DELETE /api/v1/admin/grammar/questions/:id
   */
  @Delete('grammar/questions/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteQuestion(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; id: string }> {
    return await this.questionsService.deleteQuestion(id);
  }

  /**
   * Endpoint #5: Nhập hàng loạt câu hỏi (Hỗ trợ cả File Excel .xlsx và JSON Batch)
   * POST /api/v1/admin/grammar/questions/import-excel
   */
  @Post('grammar/questions/import-excel')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public async importExcelOrBatch(
    @UploadedFile() file?: { buffer: Buffer },
    @Body() body?: BatchImportQuestionsDto,
  ): Promise<Record<string, unknown>> {
    if (file && file.buffer) {
      return await this.questionsService.importExcel(file.buffer);
    }
    if (body && Array.isArray(body.questions) && body.questions.length > 0) {
      return await this.questionsService.importBatch(body);
    }
    return {
      success: false,
      message: 'Vui lòng tải lên tệp Excel (.xlsx) hoặc gửi mảng danh sách câu hỏi qua JSON.',
    };
  }

  /**
   * Endpoint #57: Gắn danh sách câu hỏi vào Bài tập dạng Quiz
   * POST /api/v1/admin/assignments/:id/questions
   */
  @Post('assignments/:id/questions')
  @HttpCode(HttpStatus.OK)
  public async attachQuestionsToAssignment(
    @Param('id', ParseUUIDPipe) assignmentId: string,
    @Body() dto: AttachQuestionsToAssignmentDto,
  ): Promise<{ assignmentId: string; attachedCount: number; message: string }> {
    return await this.questionsService.attachQuestionsToAssignment(assignmentId, dto);
  }
}

