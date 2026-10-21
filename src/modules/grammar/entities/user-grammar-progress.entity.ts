import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { GrammarLessonEntity } from './grammar-lesson.entity';

@Entity('user_grammar_progress')
@Unique('uq_user_grammar_progress', ['userId', 'lessonId'])
@Check(`"scroll_percentage" BETWEEN 0 AND 100`)
export class UserGrammarProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => GrammarLessonEntity, (lesson) => lesson.progressList, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: GrammarLessonEntity;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ name: 'scroll_percentage', type: 'int', default: 0 })
  scrollPercentage: number;

  @Column({
    name: 'last_read_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastReadAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}

