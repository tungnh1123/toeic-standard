import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_streaks')
@Check(`"current_streak" >= 0`)
@Check(`"longest_streak" >= 0`)
@Check(`"freeze_credits" >= 0`)
export class UserStreakEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.streak, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'freeze_credits', type: 'int', default: 2 })
  freezeCredits: number;

  @Column({ name: 'last_activity_date', type: 'date', default: () => 'CURRENT_DATE' })
  lastActivityDate: string;

  @Column({ name: 'streak_started_date', type: 'date', default: () => 'CURRENT_DATE' })
  streakStartedDate: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

