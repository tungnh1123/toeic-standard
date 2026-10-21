import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmissionEntity } from './entities/assignment-submission.entity';
import { SubmissionsService } from './submissions.service';
import { SubmissionsAdminController } from './submissions-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssignmentSubmissionEntity])],
  controllers: [SubmissionsAdminController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
