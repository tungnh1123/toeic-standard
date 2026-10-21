import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CefrLevel } from '../../flashcards/entities/flashcard-deck.entity';
import { GrammarLessonEntity } from './grammar-lesson.entity';

@Entity('grammar_categories')
export class GrammarCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'target_level',
    type: 'enum',
    enum: CefrLevel,
    enumName: 'cefr_level_enum',
    default: CefrLevel.A2,
  })
  targetLevel: CefrLevel;

  @Column({ name: 'icon_name', type: 'varchar', length: 50, default: 'book' })
  iconName: string;

  @Column({ name: 'color_code', type: 'varchar', length: 20, default: '#2563EB' })
  colorCode: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => GrammarLessonEntity, (lesson) => lesson.category)
  lessons: GrammarLessonEntity[];
}
