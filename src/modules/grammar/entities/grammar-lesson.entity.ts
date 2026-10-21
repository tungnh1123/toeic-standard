import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { GrammarCategoryEntity } from './grammar-category.entity';
import { UserGrammarProgressEntity } from './user-grammar-progress.entity';
import { UserGrammarBookmarkEntity } from './user-grammar-bookmark.entity';

@Entity('grammar_lessons')
export class GrammarLessonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => GrammarCategoryEntity, (category) => category.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: GrammarCategoryEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'content_markdown', type: 'text' })
  contentMarkdown: string;

  @Column({ name: 'estimated_read_time_minutes', type: 'int', default: 10 })
  estimatedReadTimeMinutes: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UserGrammarProgressEntity, (progress) => progress.lesson)
  progressList: UserGrammarProgressEntity[];

  @OneToMany(() => UserGrammarBookmarkEntity, (bookmark) => bookmark.lesson)
  bookmarks: UserGrammarBookmarkEntity[];
}
