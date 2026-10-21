import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { FilterSubmissionsDto } from './dto/filter-submissions.dto';

export interface SubmissionItemResult {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string | null;
  className: string;
  status: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';
  submissionText: string | null;
  audioFileUrl: string | null;
  durationSeconds: number | null;
  isOverdue48h: boolean;
  submittedAt: Date;
}

export interface PaginatedSubmissionsResult {
  items: SubmissionItemResult[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<AssignmentSubmissionEntity>,
  ) {}

  public async getSubmissions(
    currentUser: { id: string; role: string },
    filters: FilterSubmissionsDto,
  ): Promise<PaginatedSubmissionsResult> {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;

    // Zero Duplication JOIN: JOIN trực tiếp qua s.class_id, tuyệt đối cấm JOIN qua class_enrollments
    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.assignment', 'a')
      .leftJoinAndSelect('s.student', 'u')
      .leftJoinAndSelect('s.class', 'c');

    // Cách ly dữ liệu: Nếu là TEACHER, chỉ xem các bài nộp thuộc lớp do mình phụ trách giảng dạy
    if (currentUser.role === 'TEACHER') {
      qb.andWhere('c.teacherId = :teacherId', { teacherId: currentUser.id });
    }

    if (filters.classId) {
      qb.andWhere('s.classId = :classId', { classId: filters.classId });
    }

    if (filters.assignmentId) {
      qb.andWhere('s.assignmentId = :assignmentId', { assignmentId: filters.assignmentId });
    }

    if (filters.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    if (filters.type) {
      qb.andWhere('a.type = :type', { type: filters.type });
    }

    if (filters.search && filters.search.trim() !== '') {
      qb.andWhere('(u.fullName ILIKE :search OR a.title ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    qb.orderBy('s.submittedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const now = Date.now();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;

    const mappedData: SubmissionItemResult[] = items.map((item) => {
      const submittedTime = new Date(item.submittedAt).getTime();
      const isOverdue48h =
        ['SUBMITTED', 'GRADING'].includes(item.status) && now - submittedTime > fortyEightHoursMs;

      return {
        id: item.id,
        assignmentId: item.assignmentId,
        assignmentTitle: item.assignment?.title || 'Bài tập không xác định',
        assignmentType: item.assignment?.type || '',
        studentId: item.studentId,
        studentName: item.student?.fullName || 'Học viên ẩn danh',
        studentEmail: item.student?.email || '',
        classId: item.classId,
        className: item.class?.name || 'Lớp cá nhân / Không có lớp',
        status: item.status,
        submissionText: item.submissionText,
        audioFileUrl: item.audioFileUrl,
        durationSeconds: item.durationSeconds,
        isOverdue48h,
        submittedAt: item.submittedAt,
      };
    });

    return {
      items: mappedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
