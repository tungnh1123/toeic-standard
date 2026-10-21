import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ClassEntity } from './class.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('class_enrollments')
@Unique('uq_class_student', ['classId', 'studentId'])
export class ClassEnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'class_id' })
  classId!: string;

  @ManyToOne(() => ClassEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup!: ClassEntity;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'enrolled_at' })
  enrolledAt!: Date;
}

