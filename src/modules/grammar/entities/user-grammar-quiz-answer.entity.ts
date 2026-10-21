import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserGrammarQuizAttemptEntity } from './user-grammar-quiz-attempt.entity';
import { GrammarQuizQuestionEntity } from './grammar-quiz-question.entity';

@Entity('user_grammar_quiz_answers')
export class UserGrammarQuizAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => UserGrammarQuizAttemptEntity, (attempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt?: UserGrammarQuizAttemptEntity;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => GrammarQuizQuestionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: GrammarQuizQuestionEntity;

  @Column({ name: 'selected_option', type: 'char', length: 1, nullable: true })
  selectedOption: string | null;

  @Column({ name: 'is_correct', type: 'boolean' })
  isCorrect: boolean;
}
