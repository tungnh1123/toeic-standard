import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('streak_badges')
@Index('idx_streak_badges_milestone', ['milestoneDays'])
export class StreakBadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'milestone_days', type: 'int', unique: true })
  milestoneDays: number;

  @Column({ name: 'icon_url', type: 'text' })
  iconUrl: string;

  @Column({ name: 'reward_exp', type: 'int', default: 50 })
  rewardExp: number;
}

