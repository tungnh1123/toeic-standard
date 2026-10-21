import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssignmentSubmissionEntity } from './assignment-submission.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { InlineFeedbackItemDto } from '../dto/inline-feedback-item.dto';
import { CriterionScoreDto } from '../dto/criterion-score.dto';

@Entity('submission_reviews')
export class SubmissionReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'submission_id', unique: true })
  submissionId!: string;

  @OneToOne(() => AssignmentSubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission!: AssignmentSubmissionEntity;

  @Column({ type: 'uuid', name: 'teacher_id' })
  teacherId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'teacher_id' })
  teacher!: UserEntity;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'total_score' })
  totalScore!: number;

  @Column({ type: 'jsonb', name: 'criteria_scores' })
  criteriaScores!: Record<string, CriterionScoreDto>;

  @Column({ type: 'jsonb', name: 'inline_feedback', nullable: true })
  inlineFeedback!: InlineFeedbackItemDto[] | null;

  @Column({ type: 'text', name: 'general_comment', nullable: true })
  generalComment!: string | null;

  @Column({ type: 'text', name: 'feedback_audio_url', nullable: true })
  feedbackAudioUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'reviewed_at' })
  reviewedAt!: Date;
}
