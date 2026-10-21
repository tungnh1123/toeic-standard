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
import { FlashcardDeckEntity } from './flashcard-deck.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_favorite_decks')
@Unique('uq_user_favorite_deck', ['userId', 'deckId'])
export class UserFavoriteDeckEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_fav_decks_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'deck_id', type: 'uuid' })
  deckId: string;

  @ManyToOne(() => FlashcardDeckEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck?: FlashcardDeckEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
