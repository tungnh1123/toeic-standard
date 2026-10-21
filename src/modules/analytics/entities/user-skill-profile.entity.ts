import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_skill_profiles')
@Check(`"vocab_score" BETWEEN 0 AND 100`)
@Check(`"grammar_score" BETWEEN 0 AND 100`)
@Check(`"listening_score" BETWEEN 0 AND 100`)
@Check(`"reading_score" BETWEEN 0 AND 100`)
@Check(`"writing_score" BETWEEN 0 AND 100`)
@Check(`"speaking_score" BETWEEN 0 AND 100`)
@Check(`"overall_score" BETWEEN 0 AND 100`)
@Check(`"estimated_toeic_score" BETWEEN 10 AND 990`)
export class UserSkillProfileEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'vocab_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  vocabScore: number;

  @Column({ name: 'grammar_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  grammarScore: number;

  @Column({ name: 'listening_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  listeningScore: number;

  @Column({ name: 'reading_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  readingScore: number;

  @Column({ name: 'writing_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  writingScore: number;

  @Column({ name: 'speaking_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  speakingScore: number;

  @Column({ name: 'overall_score', type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  overallScore: number;

  @Column({ name: 'estimated_cefr', type: 'varchar', length: 10, default: 'A1' })
  estimatedCefr: string;

  @Column({ name: 'estimated_toeic_score', type: 'int', default: 200 })
  estimatedToeicScore: number;

  @CreateDateColumn({ name: 'last_calculated_at', type: 'timestamptz' })
  lastCalculatedAt: Date;
}
