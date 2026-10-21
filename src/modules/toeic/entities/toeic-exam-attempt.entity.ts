import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ExamAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

@Entity('toeic_exam_attempts')
export class ToeicExamAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_toeic_attempts_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ExamAttemptStatus.IN_PROGRESS,
  })
  status: ExamAttemptStatus;

  @Column({ name: 'listening_score', type: 'int', default: 0 })
  listeningScore: number;

  @Column({ name: 'reading_score', type: 'int', default: 0 })
  readingScore: number;

  @Column({ name: 'total_score', type: 'int', default: 0 })
  totalScore: number;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

