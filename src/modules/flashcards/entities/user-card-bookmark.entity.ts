import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { FlashcardEntity } from './flashcard.entity';

@Entity('user_card_bookmarks')
@Unique('uq_user_card_bookmark', ['userId', 'flashcardId'])
export class UserCardBookmarkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_card_bookmarks_user')
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

  @Column({ name: 'user_personal_note', type: 'text', nullable: true })
  userPersonalNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
