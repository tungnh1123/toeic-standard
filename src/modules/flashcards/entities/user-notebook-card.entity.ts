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
import { UserVocabularyNotebookEntity } from './user-vocabulary-notebook.entity';
import { FlashcardEntity } from './flashcard.entity';

@Entity('user_notebook_cards')
@Unique('uq_notebook_flashcard', ['notebookId', 'flashcardId'])
export class UserNotebookCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_notebook_cards_nb_id')
  @Column({ name: 'notebook_id', type: 'uuid' })
  notebookId: string;

  @ManyToOne(() => UserVocabularyNotebookEntity, (nb) => nb.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notebook_id' })
  notebook?: UserVocabularyNotebookEntity;

  @Index('idx_notebook_cards_card_id')
  @Column({ name: 'flashcard_id', type: 'uuid' })
  flashcardId: string;

  @ManyToOne(() => FlashcardEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flashcard_id' })
  flashcard?: FlashcardEntity;

  @Column({ name: 'personal_mnemonic', type: 'text', nullable: true })
  personalMnemonic: string | null;

  @Column({ name: 'custom_example', type: 'text', nullable: true })
  customExample: string | null;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;
}

