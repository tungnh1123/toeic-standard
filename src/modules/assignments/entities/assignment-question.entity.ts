import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AssignmentEntity } from './assignment.entity';

@Entity('assignment_questions')
@Unique('uq_assignment_question', ['assignmentId', 'questionId'])
export class AssignmentQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @ManyToOne(() => AssignmentEntity, (a) => a.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: AssignmentEntity;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ name: 'question_type', type: 'varchar', length: 50, default: 'GRAMMAR_QUIZ' })
  questionType: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}

