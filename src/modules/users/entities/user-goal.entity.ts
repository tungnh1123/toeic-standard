import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_goals')
@Check(`"target_score" BETWEEN 10 AND 990 AND "target_score" % 5 = 0`)
@Check(`"target_exam_date" >= CURRENT_DATE`)
@Check(`"starting_score" BETWEEN 0 AND 990`)
@Check(`"daily_study_minutes" BETWEEN 10 AND 360`)
export class UserGoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.goal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'target_score', type: 'int' })
  targetScore: number;

  @Column({ name: 'target_exam_date', type: 'date', nullable: true })
  targetExamDate: string | null;

  @Column({ name: 'starting_score', type: 'int', default: 0 })
  startingScore: number;

  @Column({ name: 'daily_study_minutes', type: 'int', default: 30 })
  dailyStudyMinutes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

