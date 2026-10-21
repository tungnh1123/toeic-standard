import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { AssignmentEntity, AssignmentType } from './entities/assignment.entity';
import { AssignmentTargetEntity } from './entities/assignment-target.entity';
import { ClassEntity } from '../classes/entities/class.entity';
import { ClassEnrollmentEntity } from '../classes/entities/class-enrollment.entity';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { CreateWritingAssignmentDto } from './dto/create-writing-assignment.dto';
import { CreateSpeakingAssignmentDto } from './dto/create-speaking-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateWritingAssignmentDto } from './dto/update-writing-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { FilterAssignmentDto } from './dto/filter-assignment.dto';
import { AssignAssignmentDto } from './dto/assign-assignment.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { FilterAssignedListDto } from './dto/filter-assigned-list.dto';

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
    @InjectRepository(AssignmentTargetEntity)
    private readonly targetRepo: Repository<AssignmentTargetEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationsQueue: NotificationsQueueService,
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

  /**
   * Endpoint #56: Giao bài tập cho Lớp học hoặc Danh sách học viên kèm Deadline độc lập
   */
  public async assignAssignment(
    assignmentId: string,
    userId: string,
    userRole: string,
    dto: AssignAssignmentDto,
  ): Promise<{
    assignmentId: string;
    classId: string | null;
    assignedCount: number;
    dueDate: string;
    notificationsDispatched: boolean;
  }> {
    const dueDateTime = new Date(dto.dueDate);
    if (isNaN(dueDateTime.getTime()) || dueDateTime <= new Date()) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_DUE_DATE',
        message: 'Hạn nộp dueDate phải nằm ở thời điểm tương lai.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id: assignmentId } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập gốc không tồn tại.',
        });
      }

      let studentIdsToAssign: string[] = [];

      // Kiểm tra Scope Lớp học nếu người thực hiện là Giáo viên (TEACHER)
      if (dto.classId) {
        if (userRole === 'TEACHER') {
          const classObj = await manager.findOne(ClassEntity, { where: { id: dto.classId, teacherId: userId } });
          if (!classObj) {
            throw new ForbiddenException({
              errorCode: 'ERR_AUTH_003',
              message: 'Bạn không có quyền giao bài cho lớp học này.',
            });
          }
        }

        const enrollments = await manager.find(ClassEnrollmentEntity, { where: { classId: dto.classId } });
        studentIdsToAssign = enrollments.map((e) => e.studentId);
      } else if (dto.studentIds && dto.studentIds.length > 0) {
        studentIdsToAssign = dto.studentIds;
      }

      if (studentIdsToAssign.length === 0) {
        throw new BadRequestException({
          errorCode: 'ERR_NO_STUDENTS_FOUND',
          message: 'Không tìm thấy học viên nào để thực hiện giao bài tập.',
        });
      }

      // Upsert các bản ghi phân công vào assignment_targets
      for (const sId of studentIdsToAssign) {
        if (dto.classId) {
          await manager.query(
            `INSERT INTO assignment_targets (assignment_id, student_id, class_id, due_date, is_completed)
             VALUES ($1, $2, $3, $4, false)
             ON CONFLICT (assignment_id, student_id, class_id)
             DO UPDATE SET due_date = EXCLUDED.due_date, is_completed = false`,
            [assignmentId, sId, dto.classId, dueDateTime],
          );
        } else {
          // If individual assignment without classId
          const existing = await manager.findOne(AssignmentTargetEntity, {
            where: { assignmentId, studentId: sId, classId: null as unknown as string },
          });
          if (existing) {
            existing.dueDate = dueDateTime;
            existing.isCompleted = false;
            await manager.save(AssignmentTargetEntity, existing);
          } else {
            const target = manager.create(AssignmentTargetEntity, {
              assignmentId,
              studentId: sId,
              classId: null,
              dueDate: dueDateTime,
              isCompleted: false,
            });
            await manager.save(AssignmentTargetEntity, target);
          }
        }
      }

      // Đẩy Async Job vào BullMQ Queue thông báo Push & Email cho Học viên
      await this.notificationsQueue.add('assignment-assigned', {
        assignmentId,
        assignmentTitle: assignment.title,
        studentIds: studentIdsToAssign,
        dueDate: dto.dueDate,
        timestamp: new Date(),
      });

      return {
        assignmentId,
        classId: dto.classId || null,
        assignedCount: studentIdsToAssign.length,
        dueDate: dto.dueDate,
        notificationsDispatched: true,
      };
    });
  }

  /**
   * Endpoint #58: Gia hạn Deadline bài tập cho Lớp học hoặc Học viên cá nhân
   */
  public async extendDeadline(
    assignmentId: string,
    userId: string,
    userRole: string,
    dto: ExtendDeadlineDto,
  ): Promise<{
    assignmentId: string;
    updatedRecords: number;
    newDueDate: string;
  }> {
    const newDueDateTime = new Date(dto.newDueDate);
    if (isNaN(newDueDateTime.getTime()) || newDueDateTime <= new Date()) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_DUE_DATE',
        message: 'Hạn nộp mới newDueDate phải nằm ở thời điểm tương lai.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const assignment = await manager.findOne(AssignmentEntity, { where: { id: assignmentId } });
      if (!assignment) {
        throw new NotFoundException({
          errorCode: 'ERR_ASSIGNMENT_NOT_FOUND',
          message: 'Đề bài tập không tồn tại.',
        });
      }

      if (dto.classId && userRole === 'TEACHER') {
        const classObj = await manager.findOne(ClassEntity, { where: { id: dto.classId, teacherId: userId } });
        if (!classObj) {
          throw new ForbiddenException({
            errorCode: 'ERR_AUTH_003',
            message: 'Bạn không có quyền gia hạn deadline cho lớp học này.',
          });
        }
      }

      const qb = manager
        .createQueryBuilder()
        .update(AssignmentTargetEntity)
        .set({ dueDate: newDueDateTime })
        .where('assignment_id = :assignmentId', { assignmentId });

      if (dto.targetId) {
        qb.andWhere('id = :targetId', { targetId: dto.targetId });
      } else if (dto.classId) {
        qb.andWhere('class_id = :classId', { classId: dto.classId });
      }

      const result = await qb.execute();

      // Dispatch async notification for extended deadline
      await this.notificationsQueue.add('deadline-extended', {
        assignmentId,
        assignmentTitle: assignment.title,
        studentIds: [],
        dueDate: dto.newDueDate,
        timestamp: new Date(),
      });

      return {
        assignmentId,
        updatedRecords: result.affected || 0,
        newDueDate: dto.newDueDate,
      };
    });
  }

  /**
   * Endpoint #59: Xem danh sách phân công, học viên đã giao bài và trạng thái nộp
   */
  public async getAssignedList(
    assignmentId: string,
    userId: string,
    userRole: string,
    filter: FilterAssignedListDto,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalAssigned: number;
      completedCount: number;
      overdueCount: number;
    };
  }> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.targetRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.student', 'student')
      .leftJoinAndSelect('t.classGroup', 'classGroup')
      .where('t.assignmentId = :assignmentId', { assignmentId });

    if (filter.classId) {
      qb.andWhere('t.classId = :classId', { classId: filter.classId });
    }

    if (filter.isCompleted !== undefined) {
      const isComp = filter.isCompleted === 'true';
      qb.andWhere('t.isCompleted = :isComp', { isComp });
    }

    qb.orderBy('t.dueDate', 'ASC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const now = new Date();
    const enrichedItems = items.map((item) => {
      const isOverdue = now > item.dueDate && !item.isCompleted;
      const remainingSeconds = Math.max(0, Math.floor((item.dueDate.getTime() - now.getTime()) / 1000));
      return {
        id: item.id,
        assignmentId: item.assignmentId,
        studentId: item.studentId,
        classId: item.classId,
        dueDate: item.dueDate,
        isCompleted: item.isCompleted,
        isOverdue,
        remainingSeconds,
        student: item.student
          ? {
              id: item.student.id,
              email: item.student.email,
              fullName: item.student.fullName,
            }
          : null,
        classGroup: item.classGroup
          ? {
              id: item.classGroup.id,
              code: item.classGroup.code,
              name: item.classGroup.name,
            }
          : null,
      };
    });

    const completedCount = enrichedItems.filter((i) => i.isCompleted).length;
    const overdueCount = enrichedItems.filter((i) => i.isOverdue).length;

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAssigned: total,
        completedCount,
        overdueCount,
      },
    };
  }

  /**
   * Endpoint #52: Lấy danh sách bài tập được giao cho bản thân học viên
   */
  public async getStudentAssignments(studentId: string): Promise<Array<Record<string, unknown>>> {
    const targets = await this.targetRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignment', 'a')
      .leftJoinAndSelect('t.classGroup', 'c')
      .where('t.studentId = :studentId', { studentId })
      .orderBy('t.dueDate', 'ASC')
      .getMany();

    const now = new Date();

    return targets.map((t) => {
      const a = t.assignment;
      let rubric = a.rubric as Record<string, unknown> | null;

      // Mask sample audio if Speaking assignment and not completed yet
      if (a.type === AssignmentType.SPEAKING && !t.isCompleted && rubric) {
        rubric = {
          ...rubric,
          sampleAudioUrl: null, // Masked per Spec STT 52 & 1.1
          sampleTranscript: null,
        };
      }

      const isOverdue = now > t.dueDate && !t.isCompleted;
      const remainingSeconds = Math.max(0, Math.floor((t.dueDate.getTime() - now.getTime()) / 1000));

      return {
        targetId: t.id,
        assignmentId: a.id,
        title: a.title,
        instructions: a.instructions,
        type: a.type,
        rubric,
        classGroup: t.classGroup
          ? { id: t.classGroup.id, code: t.classGroup.code, name: t.classGroup.name }
          : null,
        dueDate: t.dueDate,
        isCompleted: t.isCompleted,
        isOverdue,
        remainingSeconds,
      };
    });
  }
}

