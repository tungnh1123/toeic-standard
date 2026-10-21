import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentQuestionEntity } from './entities/assignment-question.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsAdminController } from './assignments-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      AssignmentQuestionEntity,
    ]),
  ],
  controllers: [AssignmentsAdminController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
