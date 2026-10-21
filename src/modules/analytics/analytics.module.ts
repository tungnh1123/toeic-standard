import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStreakEntity } from './entities/user-streak.entity';
import { UserStreakActivityEntity } from './entities/user-streak-activity.entity';
import { StreakBadgeEntity } from './entities/streak-badge.entity';
import { UserStreakBadgeEntity } from './entities/user-streak-badge.entity';
import { StreakEngineService } from './services/streak-engine.service';
import { StreakController } from './controllers/streak.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStreakEntity,
      UserStreakActivityEntity,
      StreakBadgeEntity,
      UserStreakBadgeEntity,
    ]),
  ],
  controllers: [StreakController],
  providers: [StreakEngineService],
  exports: [StreakEngineService],
})
export class AnalyticsModule {}
