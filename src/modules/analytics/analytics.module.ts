import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStreakEntity } from './entities/user-streak.entity';
import { UserStreakActivityEntity } from './entities/user-streak-activity.entity';
import { StreakBadgeEntity } from './entities/streak-badge.entity';
import { UserStreakBadgeEntity } from './entities/user-streak-badge.entity';
import { UserSkillProfileEntity } from './entities/user-skill-profile.entity';
import { UserSkillHistoryEntity } from './entities/user-skill-history.entity';
import { UserGoalEntity } from '../users/entities/user-goal.entity';
import { StreakEngineService } from './services/streak-engine.service';
import { SkillRadarEngineService } from './services/skill-radar-engine.service';
import { StreakController } from './controllers/streak.controller';
import { SkillRadarController } from './controllers/skill-radar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStreakEntity,
      UserStreakActivityEntity,
      StreakBadgeEntity,
      UserStreakBadgeEntity,
      UserSkillProfileEntity,
      UserSkillHistoryEntity,
      UserGoalEntity,
    ]),
  ],
  controllers: [StreakController, SkillRadarController],
  providers: [StreakEngineService, SkillRadarEngineService],
  exports: [StreakEngineService, SkillRadarEngineService],
})
export class AnalyticsModule {}
