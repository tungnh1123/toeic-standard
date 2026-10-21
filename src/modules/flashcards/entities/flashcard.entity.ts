import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FlashcardDeckEntity } from './flashcard-deck.entity';

@Entity('flashcards')
export class FlashcardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_flashcards_deck_id')
  @Column({ name: 'deck_id', type: 'uuid' })
  deckId: string;

  @ManyToOne(() => FlashcardDeckEntity, (deck) => deck.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck?: FlashcardDeckEntity;

  @Column({ type: 'varchar', length: 150 })
  term: string;

  @Column({ name: 'phonetic_ipa', type: 'varchar', length: 100, nullable: true })
  phoneticIpa: string | null;

  @Column({ name: 'part_of_speech', type: 'varchar', length: 50, nullable: true })
  partOfSpeech: string | null;

  @Column({ type: 'text' })
  definition: string;

  @Column({ name: 'example_sentence', type: 'text', nullable: true })
  exampleSentence: string | null;

  @Column({ name: 'example_translation', type: 'text', nullable: true })
  exampleTranslation: string | null;

  @Column({ name: 'audio_url', type: 'text', nullable: true })
  audioUrl: string | null;

  @Column({ name: 'audio_slow_url', type: 'text', nullable: true })
  audioSlowUrl: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  collocations: unknown[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  synonyms: unknown[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
