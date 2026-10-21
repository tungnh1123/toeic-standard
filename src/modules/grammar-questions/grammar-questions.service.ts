import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, ILike } from 'typeorm';
import * as XLSX from 'xlsx';
import { GrammarQuizQuestionEntity } from '../grammar/entities/grammar-quiz-question.entity';
import { GrammarLessonEntity } from '../grammar/entities/grammar-lesson.entity';
import { AssignmentEntity, AssignmentType } from '../assignments/entities/assignment.entity';
import { AssignmentQuestionEntity } from '../assignments/entities/assignment-question.entity';
import { CreateGrammarQuestionDto } from './dto/create-grammar-question.dto';
import { UpdateGrammarQuestionDto } from './dto/update-grammar-question.dto';
import { FilterGrammarQuestionDto } from './dto/filter-grammar-question.dto';
import { AttachQuestionsToAssignmentDto } from './dto/attach-questions-assignment.dto';
import { BatchImportQuestionsDto } from './dto/batch-import-questions.dto';

export interface PaginatedQuestionsResult {
  items: GrammarQuizQuestionEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExcelImportRow {
  lesson_id?: string;
  lessonId?: string;
  question_number?: number | string;
  questionNumber?: number | string;
  question_text?: string;
  questionText?: string;
  option_a?: string;
  optionA?: string;
  option_b?: string;
  optionB?: string;
  option_c?: string;
  optionC?: string;
  option_d?: string;
  optionD?: string;
  correct_option?: string;
  correctOption?: string;
  explanation?: string;
  translation?: string;
  difficulty_level?: string;
  difficultyLevel?: string;
}

@Injectable()
export class GrammarQuestionsService {
  private readonly logger = new Logger(GrammarQuestionsService.name);

  constructor(
    @InjectRepository(GrammarQuizQuestionEntity)
    private readonly questionRepo: Repository<GrammarQuizQuestionEntity>,
    @InjectRepository(GrammarLessonEntity)
    private readonly lessonRepo: Repository<GrammarLessonEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentQuestionEntity)
    private readonly assignmentQuestionRepo: Repository<AssignmentQuestionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Endpoint #1: Tìm kiếm & Lọc câu hỏi trong ngân hàng
   */
  public async getQuestions(
    filter: FilterGrammarQuestionDto,
  ): Promise<PaginatedQuestionsResult> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.lesson', 'lesson');

    if (filter.lessonId) {
      qb.andWhere('q.lessonId = :lessonId', { lessonId: filter.lessonId });
    }

    if (filter.difficulty) {
      qb.andWhere('q.difficultyLevel = :difficulty', { difficulty: filter.difficulty });
    }

    if (filter.search && filter.search.trim() !== '') {
      qb.andWhere('q.questionText ILIKE :search', { search: `%${filter.search.trim()}%` });
    }

    qb.orderBy('q.questionNumber', 'ASC');
    qb.addOrderBy('q.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy chi tiết 1 câu hỏi theo ID
   */
  public async getQuestionById(id: string): Promise<GrammarQuizQuestionEntity> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['lesson'],
    });

    if (!question) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy câu hỏi trong ngân hàng.',
      });
    }

    return question;
  }

  /**
   * Endpoint #2: Thêm mới 1 câu hỏi vào ngân hàng
   */
  public async createQuestion(
    dto: CreateGrammarQuestionDto,
  ): Promise<GrammarQuizQuestionEntity> {
    const lesson = await this.lessonRepo.findOne({ where: { id: dto.lessonId } });
    if (!lesson) {
      throw new BadRequestException({
        errorCode: 'ERR_LESSON_NOT_FOUND',
        message: 'Chủ đề ngữ pháp (lessonId) không tồn tại trong hệ thống.',
      });
    }

    const question = this.questionRepo.create({
      lessonId: dto.lessonId,
      questionNumber: dto.questionNumber,
      questionText: dto.questionText,
      options: {
        A: dto.options.A,
        B: dto.options.B,
        C: dto.options.C,
        D: dto.options.D,
      },
      correctOption: dto.correctOption,
      explanation: dto.explanation,
      translation: dto.translation ?? null,
      difficultyLevel: dto.difficultyLevel ?? 'MEDIUM',
    });

    return await this.questionRepo.save(question);
  }

  /**
   * Endpoint #3: Cập nhật thông tin câu hỏi
   */
  public async updateQuestion(
    id: string,
    dto: UpdateGrammarQuestionDto,
  ): Promise<GrammarQuizQuestionEntity> {
    const question = await this.getQuestionById(id);

    if (dto.lessonId && dto.lessonId !== question.lessonId) {
      const lesson = await this.lessonRepo.findOne({ where: { id: dto.lessonId } });
      if (!lesson) {
        throw new BadRequestException({
          errorCode: 'ERR_LESSON_NOT_FOUND',
          message: 'Chủ đề ngữ pháp (lessonId) không tồn tại.',
        });
      }
      question.lessonId = dto.lessonId;
    }

    if (dto.questionNumber !== undefined) {
      question.questionNumber = dto.questionNumber;
    }
    if (dto.questionText !== undefined) {
      question.questionText = dto.questionText;
    }
    if (dto.options !== undefined) {
      question.options = {
        A: dto.options.A,
        B: dto.options.B,
        C: dto.options.C,
        D: dto.options.D,
      };
    }
    if (dto.correctOption !== undefined) {
      question.correctOption = dto.correctOption;
    }
    if (dto.explanation !== undefined) {
      question.explanation = dto.explanation;
    }
    if (dto.translation !== undefined) {
      question.translation = dto.translation;
    }
    if (dto.difficultyLevel !== undefined) {
      question.difficultyLevel = dto.difficultyLevel;
    }

    return await this.questionRepo.save(question);
  }

  /**
   * Endpoint #4: Xóa 1 câu hỏi khỏi ngân hàng
   */
  public async deleteQuestion(id: string): Promise<{ success: boolean; id: string }> {
    const question = await this.getQuestionById(id);
    await this.questionRepo.remove(question);
    return { success: true, id };
  }

  /**
   * Endpoint #5 (JSON Batch): Nhập danh sách câu hỏi theo lô
   */
  public async importBatch(dto: BatchImportQuestionsDto): Promise<{
    importedCount: number;
    message: string;
  }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const entities: GrammarQuizQuestionEntity[] = [];

      for (const item of dto.questions) {
        const question = manager.create(GrammarQuizQuestionEntity, {
          lessonId: item.lessonId,
          questionNumber: item.questionNumber,
          questionText: item.questionText,
          options: {
            A: item.options.A,
            B: item.options.B,
            C: item.options.C,
            D: item.options.D,
          },
          correctOption: item.correctOption,
          explanation: item.explanation,
          translation: item.translation ?? null,
          difficultyLevel: item.difficultyLevel ?? 'MEDIUM',
        });
        entities.push(question);
      }

      await manager.save(GrammarQuizQuestionEntity, entities);

      return {
        importedCount: entities.length,
        message: `Đã nhập thành công ${entities.length} câu hỏi vào ngân hàng.`,
      };
    });
  }

  /**
   * Endpoint #5 (Excel): Nhập hàng loạt câu hỏi từ file Excel buffer
   */
  public async importExcel(buffer: Buffer): Promise<{
    importedCount: number;
    errors: string[];
    message: string;
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException({
        errorCode: 'ERR_EMPTY_EXCEL',
        message: 'File Excel không có sheet dữ liệu nào.',
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelImportRow>(worksheet);

    if (!rows || rows.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_EMPTY_EXCEL',
        message: 'File Excel rỗng, không có dữ liệu câu hỏi.',
      });
    }

    const errors: string[] = [];
    const validEntities: GrammarQuizQuestionEntity[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // header is line 1

      const lessonId = row.lesson_id || row.lessonId;
      const questionText = row.question_text || row.questionText;
      const optionA = row.option_a || row.optionA;
      const optionB = row.option_b || row.optionB;
      const optionC = row.option_c || row.optionC;
      const optionD = row.option_d || row.optionD;
      const correctOptionRaw = (row.correct_option || row.correctOption || '').toString().trim().toUpperCase();
      const explanation = row.explanation || 'Không có giải thích chi tiết.';
      const translation = row.translation || null;
      const difficultyLevelRaw = (row.difficulty_level || row.difficultyLevel || 'MEDIUM').toString().trim().toUpperCase();

      if (!lessonId) {
        errors.push(`Dòng ${lineNum}: Thiếu lesson_id.`);
        continue;
      }
      if (!questionText) {
        errors.push(`Dòng ${lineNum}: Thiếu nội dung câu hỏi.`);
        continue;
      }
      if (!optionA || !optionB || !optionC || !optionD) {
        errors.push(`Dòng ${lineNum}: Phải có đủ 4 phương án A, B, C, D.`);
        continue;
      }
      if (!['A', 'B', 'C', 'D'].includes(correctOptionRaw)) {
        errors.push(`Dòng ${lineNum}: correct_option phải là A, B, C hoặc D.`);
        continue;
      }

      const difficultyLevel = ['EASY', 'MEDIUM', 'HARD'].includes(difficultyLevelRaw)
        ? difficultyLevelRaw
        : 'MEDIUM';

      const entity = this.questionRepo.create({
        lessonId,
        questionNumber: Number(row.question_number || row.questionNumber) || i + 1,
        questionText,
        options: {
          A: String(optionA),
          B: String(optionB),
          C: String(optionC),
          D: String(optionD),
        },
        correctOption: correctOptionRaw,
        explanation: String(explanation),
        translation: translation ? String(translation) : null,
        difficultyLevel,
      });

      validEntities.push(entity);
    }

    if (errors.length > 0 && validEntities.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_EXCEL_VALIDATION',
        message: 'File Excel chứa các lỗi dữ liệu không hợp lệ.',
        errors,
      });
    }

    await this.dataSource.transaction(async (manager: EntityManager) => {
      await manager.save(GrammarQuizQuestionEntity, validEntities);
    });

    return {
      importedCount: validEntities.length,
      errors,
      message: `Nhập thành công ${validEntities.length} câu hỏi. Có ${errors.length} dòng bị bỏ qua do lỗi.`,
    };
  }

  /**
   * Endpoint #57: Gắn danh sách câu hỏi vào Bài tập dạng Quiz (Inviolable Red Line #4 Transaction)
   */
  public async attachQuestionsToAssignment(
    assignmentId: string,
    dto: AttachQuestionsToAssignmentDto,
  ): Promise<{
    assignmentId: string;
    attachedCount: number;
    message: string;
  }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, {
        where: { id: assignmentId },
      });

      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Bài tập không tồn tại trong hệ thống.',
        });
      }

      if (assignment.type !== AssignmentType.QUIZ) {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_ASSIGNMENT_TYPE',
          message: 'Chỉ có thể gắn câu hỏi trắc nghiệm vào bài tập dạng QUIZ.',
        });
      }

      // Xóa các liên kết cũ của bài tập này
      await manager.delete(AssignmentQuestionEntity, { assignmentId });

      // Gắn các câu hỏi mới theo thứ tự
      const entities = dto.questionIds.map((qId, index) => {
        return manager.create(AssignmentQuestionEntity, {
          assignmentId,
          questionId: qId,
          questionType: 'GRAMMAR_QUIZ',
          orderIndex: index + 1,
        });
      });

      await manager.save(AssignmentQuestionEntity, entities);

      return {
        assignmentId,
        attachedCount: entities.length,
        message: `Đã gắn thành công ${entities.length} câu hỏi vào bài tập quiz.`,
      };
    });
  }
}
