import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { AssignmentTargetEntity } from '../assignments/entities/assignment-target.entity';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { ReviewWritingSubmissionDto } from './dto/review-writing-submission.dto';

export interface GradingReviewResult {
  reviewId: string;
  submissionId: string;
  totalScore: number;
  status: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';
  isDraft: boolean;
  criteriaScores: Record<string, unknown>;
  inlineFeedback: unknown[] | null;
  generalComment: string | null;
  reviewedAt: Date;
}

@Injectable()
export class WritingGradingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsQueue: NotificationsQueueService,
  ) {}

  /**
   * Endpoint #59: Lấy thông tin chi tiết bài nộp, văn bản bài luận, rubric và bản nháp chấm cũ
   */
  public async getSubmissionForGrading(
    submissionId: string,
    currentUser: { id: string; role: string },
  ) {
    const submission = await this.dataSource
      .getRepository(AssignmentSubmissionEntity)
      .findOne({
        where: { id: submissionId },
        relations: ['assignment', 'student', 'class'],
      });

    if (!submission) {
      throw new NotFoundException({
        errorCode: 'ERR_SUBMISSION_NOT_FOUND',
        message: 'Bài nộp không tồn tại trong hệ thống.',
      });
    }

    if (
      currentUser.role === 'TEACHER' &&
      submission.class &&
      submission.class.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Bạn không có quyền truy cập bài nộp của lớp học này.',
      });
    }

    const review = await this.dataSource
      .getRepository(SubmissionReviewEntity)
      .findOne({
        where: { submissionId },
      });

    return {
      submission: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment?.title || '',
        assignmentType: submission.assignment?.type || '',
        rubric: submission.assignment?.rubric || null,
        instructions: submission.assignment?.instructions || '',
        studentId: submission.studentId,
        studentName: submission.student?.fullName || '',
        studentEmail: submission.student?.email || '',
        classId: submission.classId,
        className: submission.class?.name || '',
        targetId: submission.targetId,
        submissionText: submission.submissionText,
        audioFileUrl: submission.audioFileUrl,
        durationSeconds: submission.durationSeconds,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
      review: review
        ? {
            id: review.id,
            totalScore: Number(review.totalScore),
            criteriaScores: review.criteriaScores,
            inlineFeedback: review.inlineFeedback,
            generalComment: review.generalComment,
            feedbackAudioUrl: review.feedbackAudioUrl,
            reviewedAt: review.reviewedAt,
          }
        : null,
    };
  }

  /**
   * Endpoint #60: Lưu kết quả chấm Rubric, highlight sửa lỗi và nhận xét
   */
  public async reviewWritingSubmission(
    submissionId: string,
    teacherId: string,
    userRole: string,
    dto: ReviewWritingSubmissionDto,
  ): Promise<GradingReviewResult> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const submission = await manager.findOne(AssignmentSubmissionEntity, {
        where: { id: submissionId },
        relations: ['assignment', 'class'],
      });

      if (!submission) {
        throw new NotFoundException({
          errorCode: 'ERR_SUBMISSION_NOT_FOUND',
          message: 'Bài nộp không tồn tại trong hệ thống.',
        });
      }

      if (
        userRole === 'TEACHER' &&
        submission.class &&
        submission.class.teacherId !== teacherId
      ) {
        throw new ForbiddenException({
          errorCode: 'ERR_AUTH_003',
          message: 'Bạn không có quyền chấm bài nộp của lớp học này.',
        });
      }

      if (submission.assignment?.type !== 'WRITING') {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_ASSIGNMENT_TYPE',
          message: 'Bài nộp này không phải là bài tập kỹ năng Viết (WRITING).',
        });
      }

      // Thuật toán Tự động Tính Tổng Điểm từ Barem Rubric (Thang 100)
      let calculatedTotalScore = 0;
      const criteriaScores = dto.criteriaScores;
      for (const key of Object.keys(criteriaScores)) {
        const item = criteriaScores[key];
        const weightedPart = (item.score / item.maxScore) * item.weight;
        calculatedTotalScore += weightedPart;
      }
      calculatedTotalScore = Math.round(calculatedTotalScore * 100) / 100;

      // Upsert bản ghi vào submission_reviews (Unique trên submission_id)
      let review = await manager.findOne(SubmissionReviewEntity, {
        where: { submissionId },
      });

      if (!review) {
        review = manager.create(SubmissionReviewEntity, {
          submissionId,
          teacherId,
        });
      }

      review.teacherId = teacherId;
      review.totalScore = calculatedTotalScore;
      review.criteriaScores = dto.criteriaScores;
      review.inlineFeedback = dto.inlineFeedback || [];
      review.generalComment = dto.generalComment || null;
      review.feedbackAudioUrl = dto.feedbackAudioUrl || null;
      review.reviewedAt = new Date();

      await manager.save(SubmissionReviewEntity, review);

      // Cập nhật trạng thái bài nộp
      const newStatus = dto.isDraft ? 'GRADING' : 'GRADED';
      submission.status = newStatus;
      await manager.save(AssignmentSubmissionEntity, submission);

      // Nếu công bố điểm chính thức, đánh dấu hoàn thành target
      if (!dto.isDraft) {
        if (submission.targetId) {
          await manager.update(AssignmentTargetEntity, submission.targetId, {
            isCompleted: true,
          });
        } else {
          await manager.update(
            AssignmentTargetEntity,
            { assignmentId: submission.assignmentId, studentId: submission.studentId },
            { isCompleted: true },
          );
        }

        // Đẩy Async Job vào BullMQ Notifications Queue
        await this.notificationsQueue.add('submission-graded', {
          assignmentId: submission.assignmentId,
          assignmentTitle: submission.assignment?.title || 'Bài tập Writing',
          studentIds: [submission.studentId],
          dueDate: new Date().toISOString(),
          totalScore: calculatedTotalScore,
          gradedAt: review.reviewedAt,
        });
      }

      return {
        reviewId: review.id,
        submissionId: submission.id,
        totalScore: calculatedTotalScore,
        status: newStatus,
        isDraft: dto.isDraft,
        criteriaScores: review.criteriaScores,
        inlineFeedback: review.inlineFeedback,
        generalComment: review.generalComment,
        reviewedAt: review.reviewedAt,
      };
    });
  }
}
