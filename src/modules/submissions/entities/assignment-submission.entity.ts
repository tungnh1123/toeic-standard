import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AssignmentEntity } from '../../assignments/entities/assignment.entity';
import { ClassEntity } from '../../classes/entities/class.entity';

@Entity('assignment_submissions')
export class AssignmentSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId!: string;

  @ManyToOne(() => AssignmentEntity)
  @JoinColumn({ name: 'assignment_id' })
  assignment!: AssignmentEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId!: string | null;

  @ManyToOne(() => ClassEntity, { nullable: true })
  @JoinColumn({ name: 'class_id' })
  class!: ClassEntity | null;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId!: string | null;

  @Column({ type: 'text', name: 'submission_text', nullable: true })
  submissionText!: string | null;

  @Column({ type: 'text', name: 'audio_file_url', nullable: true })
  audioFileUrl!: string | null;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null;

  @Column({
    type: 'enum',
    enum: ['SUBMITTED', 'GRADING', 'GRADED', 'REJECTED'],
    default: 'SUBMITTED',
  })
  status!: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';

  @CreateDateColumn({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt!: Date;
}
