import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserGoalEntity } from './entities/user-goal.entity';
import { ToeicExamAttemptEntity } from '../toeic/entities/toeic-exam-attempt.entity';
import { StudentProfileService } from './services/student-profile.service';
import { StudentProfileController } from './controllers/student-profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserGoalEntity,
      ToeicExamAttemptEntity,
    ]),
  ],
  controllers: [StudentProfileController],
  providers: [StudentProfileService],
  exports: [StudentProfileService],
})
export class UsersModule {}

