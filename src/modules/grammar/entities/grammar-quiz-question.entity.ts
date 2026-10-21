import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { GrammarLessonEntity } from './grammar-lesson.entity';

@Entity('grammar_quiz_questions')
@Check(`"correct_option" IN ('A', 'B', 'C', 'D')`)
export class GrammarQuizQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => GrammarLessonEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: GrammarLessonEntity;

  @Column({ name: 'question_number', type: 'int' })
  questionNumber: number;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb' })
  options: Record<string, string>;

  @Column({ name: 'correct_option', type: 'char', length: 1 })
  correctOption: string;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ type: 'text', nullable: true })
  translation: string | null;

  @Column({ name: 'difficulty_level', type: 'varchar', length: 10, default: 'MEDIUM' })
  difficultyLevel: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
