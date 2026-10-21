import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { UserNotebookCardEntity } from './user-notebook-card.entity';

export enum NotebookType {
  CUSTOM = 'CUSTOM',
  STARRED = 'STARRED',
  AUTO_DIFFICULT = 'AUTO_DIFFICULT',
}

@Entity('user_vocabulary_notebooks')
@Index('idx_notebooks_user', ['userId', 'isPinned', 'updatedAt'])
export class UserVocabularyNotebookEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'notebook_type',
    type: 'enum',
    enum: NotebookType,
    default: NotebookType.CUSTOM,
  })
  notebookType: NotebookType;

  @Column({ name: 'color_code', type: 'varchar', length: 20, default: '#2563EB' })
  colorCode: string;

  @Column({ name: 'icon_name', type: 'varchar', length: 50, default: 'bookmark' })
  iconName: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UserNotebookCardEntity, (nc) => nc.notebook)
  cards?: UserNotebookCardEntity[];
}

