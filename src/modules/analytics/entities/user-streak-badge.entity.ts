import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { StreakBadgeEntity } from './streak-badge.entity';

@Entity('user_streak_badges')
@Unique('uq_user_streak_badge', ['userId', 'badgeId'])
export class UserStreakBadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @ManyToOne(() => StreakBadgeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge?: StreakBadgeEntity;

  @Column({ name: 'achieved_streak_count', type: 'int' })
  achievedStreakCount: number;

  @CreateDateColumn({ name: 'unlocked_at', type: 'timestamptz' })
  unlockedAt: Date;
}
