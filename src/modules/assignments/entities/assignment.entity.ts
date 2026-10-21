import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AssignmentQuestionEntity } from './assignment-question.entity';

export enum AssignmentType {
  QUIZ = 'QUIZ',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

@Entity('assignments')
export class AssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  instructions: string;

  @Column({
    type: 'enum',
    enum: AssignmentType,
  })
  type: AssignmentType;

  @Column({ type: 'jsonb', nullable: true })
  rubric: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @OneToMany(() => AssignmentQuestionEntity, (aq) => aq.assignment)
  questions?: AssignmentQuestionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
