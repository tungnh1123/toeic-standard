import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { AssignmentEntity, AssignmentType } from './entities/assignment.entity';
import { CreateWritingAssignmentDto } from './dto/create-writing-assignment.dto';
import { CreateSpeakingAssignmentDto } from './dto/create-speaking-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateWritingAssignmentDto } from './dto/update-writing-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { FilterAssignmentDto } from './dto/filter-assignment.dto';

export interface PaginatedAssignmentsResult {
  items: AssignmentEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Endpoint #55: Tạo đề bài tập Writing gốc kèm Barem Rubric 4 tiêu chí
   */
  public async createWritingAssignment(
    userId: string,
    dto: CreateWritingAssignmentDto,
  ): Promise<AssignmentEntity> {
    if (dto.type !== AssignmentType.WRITING) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_TYPE',
        message: 'Loại bài tập phải là WRITING.',
      });
    }

    if (dto.rubric.minWords >= dto.rubric.maxWords) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_WORD_LIMIT',
        message: 'Số từ tối thiểu minWords phải nhỏ hơn số từ tối đa maxWords.',
      });
    }

    // Validate Barem Rubric 4 tiêu chí - Tổng trọng số phải bằng 100%
    const totalWeight = dto.rubric.criteria.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException({
        errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
        message: `Tổng trọng số các tiêu chí Rubric phải đúng bằng 100%. Hiện tại: ${totalWeight}%.`,
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = manager.create(AssignmentEntity, {
        title: dto.title,
        instructions: dto.instructions,
        type: AssignmentType.WRITING,
        rubric: dto.rubric as unknown as Record<string, unknown>,
        createdBy: userId,
      });

      return await manager.save(AssignmentEntity, assignment);
    });
  }

  /**
   * Endpoint #55: Tạo đề bài tập Speaking gốc kèm Audio mẫu bản xứ & Barem Rubric
   */
  public async createSpeakingAssignment(
    userId: string,
    dto: CreateSpeakingAssignmentDto,
  ): Promise<AssignmentEntity> {
    if (dto.type !== AssignmentType.SPEAKING) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_TYPE',
        message: 'Loại bài tập phải là SPEAKING.',
      });
    }

    if (!dto.rubric.sampleAudioUrl || dto.rubric.sampleAudioUrl.trim() === '') {
      throw new BadRequestException({
        errorCode: 'ERR_MISSING_SAMPLE_AUDIO',
        message: 'Đường dẫn file audio mẫu sampleAudioUrl không được để trống.',
      });
    }

    // Validate Barem Rubric Trọng số 100%
    const criteria = dto.rubric.criteria || [];
    const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException({
        errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
        message: `Tổng trọng số các tiêu chí Rubric phải đúng bằng 100%. Hiện tại: ${totalWeight}%.`,
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = manager.create(AssignmentEntity, {
        title: dto.title,
        instructions: dto.instructions,
        type: AssignmentType.SPEAKING,
        rubric: dto.rubric as unknown as Record<string, unknown>,
        createdBy: userId,
      });

      return await manager.save(AssignmentEntity, assignment);
    });
  }

  /**
   * Endpoint #55 Dispatcher: Xử lý tạo đề bài theo loại (WRITING, SPEAKING, QUIZ)
   */
  public async createAssignment(
    userId: string,
    dto: CreateAssignmentDto,
  ): Promise<AssignmentEntity> {
    if (dto.type === AssignmentType.WRITING) {
      return await this.createWritingAssignment(userId, dto as unknown as CreateWritingAssignmentDto);
    }
    if (dto.type === AssignmentType.SPEAKING) {
      return await this.createSpeakingAssignment(userId, dto as unknown as CreateSpeakingAssignmentDto);
    }

    // Type QUIZ
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = manager.create(AssignmentEntity, {
        title: dto.title,
        instructions: dto.instructions,
        type: AssignmentType.QUIZ,
        rubric: dto.rubric ?? null,
        createdBy: userId,
      });
      return await manager.save(AssignmentEntity, assignment);
    });
  }

  /**
   * Lấy danh sách đề bài tập gốc kèm bộ lọc & phân trang
   */
  public async getAssignments(
    filter: FilterAssignmentDto,
  ): Promise<PaginatedAssignmentsResult> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.creator', 'creator')
      .leftJoinAndSelect('a.questions', 'questions');

    if (filter.type) {
      qb.andWhere('a.type = :type', { type: filter.type });
    }

    if (filter.search && filter.search.trim() !== '') {
      qb.andWhere('a.title ILIKE :search', { search: `%${filter.search.trim()}%` });
    }

    qb.orderBy('a.createdAt', 'DESC');
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
   * Chi tiết đề bài tập theo ID
   */
  public async getAssignmentById(id: string): Promise<AssignmentEntity> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['creator', 'questions'],
    });

    if (!assignment) {
      throw new NotFoundException({
        errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
        message: 'Đề bài tập không tồn tại trong hệ thống.',
      });
    }

    return assignment;
  }

  /**
   * Endpoint #58: Cập nhật đề bài tập gốc (Writing / Speaking / Quiz) - chỉ khi chưa có bài nộp
   */
  public async updateAssignment(
    assignmentId: string,
    userId: string,
    dto: UpdateAssignmentDto,
  ): Promise<AssignmentEntity> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, {
        where: { id: assignmentId },
      });

      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập không tồn tại.',
        });
      }

      // Kiểm tra xem đề đã có bài nộp chưa trong assignment_submissions
      const submissionCountRows = await manager.query(
        `SELECT COUNT(id)::int AS cnt FROM assignment_submissions WHERE assignment_id = $1`,
        [assignmentId],
      );
      const submissionCount = Number(submissionCountRows[0]?.cnt || 0);

      if (submissionCount > 0) {
        throw new BadRequestException({
          errorCode: 'ERR_ASSIGNMENT_LOCKED',
          message: 'Không thể chỉnh sửa đề bài đã có học viên nộp bài làm.',
        });
      }

      if (dto.title !== undefined) {
        assignment.title = dto.title;
      }
      if (dto.instructions !== undefined) {
        assignment.instructions = dto.instructions;
      }

      if (dto.rubric) {
        if (assignment.type === AssignmentType.WRITING) {
          const rubric = dto.rubric as { minWords?: number; maxWords?: number; criteria?: Array<{ weight: number }> };
          if (rubric.minWords !== undefined && rubric.maxWords !== undefined && rubric.minWords >= rubric.maxWords) {
            throw new BadRequestException({
              errorCode: 'ERR_INVALID_WORD_LIMIT',
              message: 'Số từ tối thiểu minWords phải nhỏ hơn số từ tối đa maxWords.',
            });
          }

          if (rubric.criteria) {
            const totalWeight = rubric.criteria.reduce((sum, item) => sum + (item.weight || 0), 0);
            if (totalWeight !== 100) {
              throw new BadRequestException({
                errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
                message: `Tổng trọng số các tiêu chí Rubric phải đúng bằng 100%. Hiện tại: ${totalWeight}%.`,
              });
            }
          }
        } else if (assignment.type === AssignmentType.SPEAKING) {
          const rubric = dto.rubric as { sampleAudioUrl?: string; criteria?: Array<{ weight: number }> };
          if (rubric.sampleAudioUrl !== undefined && !rubric.sampleAudioUrl.trim()) {
            throw new BadRequestException({
              errorCode: 'ERR_MISSING_SAMPLE_AUDIO',
              message: 'Đường dẫn file audio phát âm mẫu sampleAudioUrl không được để trống.',
            });
          }

          if (rubric.criteria) {
            const totalWeight = rubric.criteria.reduce((sum, item) => sum + (item.weight || 0), 0);
            if (totalWeight !== 100) {
              throw new BadRequestException({
                errorCode: 'ERR_RUBRIC_WEIGHT_INVALID',
                message: `Tổng trọng số các tiêu chí Rubric phải đúng bằng 100%. Hiện tại: ${totalWeight}%.`,
              });
            }
          }
        }

        assignment.rubric = dto.rubric;
      }

      return await manager.save(AssignmentEntity, assignment);
    });
  }

  /**
   * Alias tương thích ngược cho Writing
   */
  public async updateWritingAssignment(
    assignmentId: string,
    userId: string,
    dto: UpdateWritingAssignmentDto,
  ): Promise<AssignmentEntity> {
    return await this.updateAssignment(assignmentId, userId, dto as UpdateAssignmentDto);
  }

  /**
   * Xóa đề bài tập gốc (chỉ khi chưa có bài nộp)
   */
  public async deleteAssignment(
    id: string,
  ): Promise<{ success: boolean; id: string }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập không tồn tại.',
        });
      }

      const submissionCountRows = await manager.query(
        `SELECT COUNT(id)::int AS cnt FROM assignment_submissions WHERE assignment_id = $1`,
        [id],
      );
      const submissionCount = Number(submissionCountRows[0]?.cnt || 0);

      if (submissionCount > 0) {
        throw new BadRequestException({
          errorCode: 'ERR_ASSIGNMENT_LOCKED',
          message: 'Không thể xóa đề bài đã có học viên nộp bài làm.',
        });
      }

      await manager.remove(AssignmentEntity, assignment);
      return { success: true, id };
    });
  }
}

