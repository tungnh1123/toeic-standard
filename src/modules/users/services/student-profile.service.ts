import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';
import { UserGoalEntity } from '../entities/user-goal.entity';
import { ToeicExamAttemptEntity, ExamAttemptStatus } from '../../toeic/entities/toeic-exam-attempt.entity';
import { SetTargetScoreDto } from '../dto/set-target-score.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AvatarPresignedUrlDto } from '../dto/avatar-presigned-url.dto';

export interface StudentProfileOverview {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    currentStreak: number;
    longestStreak: number;
  };
  goal: {
    targetScore: number;
    currentScore: number;
    scoreGap: number;
    progressPercentage: number;
    targetExamDate: string | null;
    daysRemaining: number | null;
    dailyStudyMinutes: number;
  };
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserGoalEntity)
    private readonly goalRepo: Repository<UserGoalEntity>,
    @InjectRepository(ToeicExamAttemptEntity)
    private readonly examAttemptRepo: Repository<ToeicExamAttemptEntity>,
  ) {}

  /**
   * Lấy hồ sơ học viên tổng hợp: Thông tin, Mục tiêu TOEIC, Điểm gần nhất, Khoảng cách điểm
   */
  public async getStudentProfileOverview(userId: string): Promise<StudentProfileOverview> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['streak'],
    });

    if (!user) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ người dùng.',
      });
    }

    const goal = await this.goalRepo.findOne({ where: { userId } });

    // Lấy bài thi TOEIC hoàn thành gần nhất
    const latestAttempt = await this.examAttemptRepo.findOne({
      where: { userId, status: ExamAttemptStatus.COMPLETED },
      order: { submittedAt: 'DESC' },
    });

    const currentScore = latestAttempt ? latestAttempt.totalScore : (goal?.startingScore ?? 0);
    const targetScore = goal ? goal.targetScore : 650;

    let daysRemaining: number | null = null;
    if (goal?.targetExamDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const examDate = new Date(goal.targetExamDate);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const progressPercentage = Math.min(
      100,
      targetScore > 0 ? Math.round((currentScore / targetScore) * 100) : 0,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        currentStreak: user.streak?.currentStreak ?? 0,
        longestStreak: user.streak?.longestStreak ?? 0,
      },
      goal: {
        targetScore,
        currentScore,
        scoreGap: Math.max(0, targetScore - currentScore),
        progressPercentage,
        targetExamDate: goal?.targetExamDate ?? null,
        daysRemaining,
        dailyStudyMinutes: goal?.dailyStudyMinutes ?? 30,
      },
    };
  }

  /**
   * Cập nhật thông tin cá nhân (Họ tên, Avatar URL)
   */
  public async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
      });
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    return await this.userRepo.save(user);
  }

  /**
   * Cập nhật mục tiêu điểm thi TOEIC và ngày thi (bội số của 5, từ 10 đến 990)
   */
  public async setTargetScore(userId: string, dto: SetTargetScoreDto): Promise<UserGoalEntity> {
    if (dto.targetScore % 5 !== 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_008',
        message: 'Mục tiêu điểm số TOEIC bắt buộc phải là bội số của 5 (từ 10 đến 990).',
      });
    }

    const examDate = new Date(dto.targetExamDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (examDate < today) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_009',
        message: 'Ngày thi dự kiến không được ở trong quá khứ.',
      });
    }

    let goal = await this.goalRepo.findOne({ where: { userId } });
    if (!goal) {
      goal = this.goalRepo.create({ userId });
    }

    goal.targetScore = dto.targetScore;
    goal.targetExamDate = dto.targetExamDate;
    if (dto.dailyStudyMinutes !== undefined) {
      goal.dailyStudyMinutes = dto.dailyStudyMinutes;
    }

    return await this.goalRepo.save(goal);
  }

  /**
   * Đổi mật khẩu tài khoản học viên
   */
  public async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
      });
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException({
        errorCode: 'ERR_AUTH_INVALID_PASSWORD',
        message: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepo.save(user);

    return { success: true };
  }

  /**
   * Cấp S3 Presigned PUT URL để tải ảnh đại diện trực tiếp
   */
  public async generateAvatarPresignedUrl(
    userId: string,
    dto: AvatarPresignedUrlDto,
  ): Promise<PresignedUrlResponse> {
    const extension = dto.fileName.split('.').pop() ?? 'jpg';
    const timestamp = Date.now();
    const fileKey = `avatars/${userId}/${timestamp}.${extension}`;

    // S3 Presigned URL có thời hạn 15 phút (900 giây)
    const expiresInSeconds = 900;
    const bucketUrl = process.env.S3_BUCKET_URL ?? 'https://s3.ap-southeast-1.amazonaws.com/toeic-storage';
    const uploadUrl = `${bucketUrl}/${fileKey}?mock-presigned=true&expires=${expiresInSeconds}`;

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds,
    };
  }
}

