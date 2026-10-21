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
import { GrammarLessonEntity } from './grammar-lesson.entity';
import { UserGrammarQuizAnswerEntity } from './user-grammar-quiz-answer.entity';

@Entity('user_grammar_quiz_attempts')
export class UserGrammarQuizAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => GrammarLessonEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: GrammarLessonEntity;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  score: number;

  @Column({ name: 'correct_count', type: 'int' })
  correctCount: number;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions: number;

  @Column({ name: 'is_passed', type: 'boolean', default: false })
  isPassed: boolean;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ name: 'attempt_number', type: 'int', default: 1 })
  attemptNumber: number;

  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @OneToMany(() => UserGrammarQuizAnswerEntity, (ans) => ans.attempt)
  answers?: UserGrammarQuizAnswerEntity[];
}

