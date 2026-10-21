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
} from '@nestjs/common';
import { GrammarQuizService } from '../services/grammar-quiz.service';
import { SubmitGrammarQuizDto } from '../dto/submit-grammar-quiz.dto';
import { QuizQuestionsResponseDto } from '../dto/quiz-questions-response.dto';
import { QuizResultResponseDto } from '../dto/quiz-result-response.dto';
import { QuizHistoryResponseDto } from '../dto/quiz-attempt-history.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../../common/decorators/roles.decorator';

@Controller('student/grammar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class GrammarQuizController {
  constructor(private readonly quizService: GrammarQuizService) {}

  /**
   * Endpoint #35: Lấy câu hỏi quiz củng cố (ẩn đáp án đúng khi làm bài)
   */
  @Get('lessons/:id/quiz')
  public async getQuizQuestions(
    @Param('id', ParseUUIDPipe) lessonId: string,
  ): Promise<QuizQuestionsResponseDto> {
    return await this.quizService.getQuizQuestionsForStudent(lessonId);
  }

  /**
   * Endpoint #36: Nộp bài quiz, chấm điểm tự động, ghi nhận Streak
   */
  @Post('lessons/:id/quiz/submit')
  @HttpCode(HttpStatus.OK)
  public async submitQuiz(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() dto: SubmitGrammarQuizDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<QuizResultResponseDto> {
    return await this.quizService.submitQuiz(user.sub, lessonId, dto);
  }

  /**
   * Endpoint #37: Lấy danh sách lịch sử các lần làm quiz của bài học
   */
  @Get('lessons/:id/quiz/history')
  public async getQuizHistory(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<QuizHistoryResponseDto> {
    return await this.quizService.getLessonQuizHistory(user.sub, lessonId);
  }

  /**
   * Endpoint #38: Xem lại chi tiết bài làm quiz đúng/sai của một lần thi cụ thể
   */
  @Get('quiz/attempts/:attemptId')
  public async getAttemptDetail(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<QuizResultResponseDto> {
    return await this.quizService.getAttemptDetail(user.sub, attemptId);
  }
}

