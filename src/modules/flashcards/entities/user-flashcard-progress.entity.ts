import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
  Check,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { FlashcardEntity } from './flashcard.entity';

export enum FlashcardStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  MASTERED = 'MASTERED',
}

@Entity('user_flashcard_progress')
@Unique('uq_user_flashcard', ['userId', 'flashcardId'])
@Check(`"repetition_count" >= 0`)
@Check(`"interval_days" >= 0`)
@Check(`"ease_factor" >= 1.30`)
export class UserFlashcardProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_user_progress_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'flashcard_id', type: 'uuid' })
  flashcardId: string;

  @ManyToOne(() => FlashcardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flashcard_id' })
  flashcard?: FlashcardEntity;

  @Column({ name: 'repetition_count', type: 'int', default: 0 })
  repetitionCount: number;

  @Column({ name: 'interval_days', type: 'int', default: 0 })
  intervalDays: number;

  @Column({
    name: 'ease_factor',
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 2.5,
  })
  easeFactor: number;

  @Column({
    type: 'enum',
    enum: FlashcardStatus,
    default: FlashcardStatus.NEW,
  })
  status: FlashcardStatus;

  @Column({ name: 'due_date', type: 'date', default: () => 'CURRENT_DATE' })
  dueDate: string;

  @Column({ name: 'last_reviewed_at', type: 'timestamptz', nullable: true })
  lastReviewedAt: Date | null;
}
