import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { FlashcardEntity } from './flashcard.entity';

@Entity('flashcard_study_logs')
@Check(`"rating" BETWEEN 1 AND 4`)
export class FlashcardStudyLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_study_logs_user_id')
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

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ name: 'previous_interval', type: 'int' })
  previousInterval: number;

  @Column({ name: 'new_interval', type: 'int' })
  newInterval: number;

  @Column({
    name: 'previous_ef',
    type: 'numeric',
    precision: 4,
    scale: 2,
  })
  previousEf: number;

  @Column({
    name: 'new_ef',
    type: 'numeric',
    precision: 4,
    scale: 2,
  })
  newEf: number;

  @Column({ name: 'study_duration_ms', type: 'int', default: 0 })
  studyDurationMs: number;

  @Index('idx_study_logs_user_date')
  @CreateDateColumn({ name: 'reviewed_at', type: 'timestamptz' })
  reviewedAt: Date;
}

