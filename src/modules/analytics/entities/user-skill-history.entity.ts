import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export interface SkillScoresSnapshot {
  vocabScore: number;
  grammarScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  overallScore: number;
}

@Entity('user_skill_history')
@Index('idx_user_skill_history_date', ['userId', 'snapshotDate'])
export class UserSkillHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'snapshot_date', type: 'date', default: () => 'CURRENT_DATE' })
  snapshotDate: string;

  @Column({ name: 'skill_scores', type: 'jsonb' })
  skillScores: SkillScoresSnapshot;

  @Column({ name: 'estimated_toeic_score', type: 'int' })
  estimatedToeicScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

