import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AssignmentEntity } from './assignment.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ClassEntity } from '../../classes/entities/class.entity';

@Entity('assignment_targets')
@Unique('uq_assign_student', ['assignmentId', 'studentId', 'classId'])
export class AssignmentTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId!: string;

  @ManyToOne(() => AssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: AssignmentEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId!: string | null;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  classGroup!: ClassEntity | null;

  @Column({ type: 'timestamptz', name: 'due_date' })
  dueDate!: Date;

  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted!: boolean;
}
