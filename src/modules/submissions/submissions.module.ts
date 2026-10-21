import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { SubmissionReviewEntity } from './entities/submission-review.entity';
import { SubmissionsService } from './submissions.service';
import { SubmissionsAdminController } from './submissions-admin.controller';
import { WritingGradingService } from './writing-grading.service';
import { WritingGradingAdminController } from './writing-grading-admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentSubmissionEntity,
      SubmissionReviewEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [SubmissionsAdminController, WritingGradingAdminController],
  providers: [SubmissionsService, WritingGradingService],
  exports: [SubmissionsService, WritingGradingService],
})
export class SubmissionsModule {}
