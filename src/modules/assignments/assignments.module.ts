import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentQuestionEntity } from './entities/assignment-question.entity';
import { AssignmentTargetEntity } from './entities/assignment-target.entity';
import { ClassEntity } from '../classes/entities/class.entity';
import { ClassEnrollmentEntity } from '../classes/entities/class-enrollment.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsAdminController } from './assignments-admin.controller';
import { AssignmentsStudentController } from './assignments-student.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      AssignmentQuestionEntity,
      AssignmentTargetEntity,
      ClassEntity,
      ClassEnrollmentEntity,
    ]),
    NotificationsModule,
    ClassesModule,
  ],
  controllers: [AssignmentsAdminController, AssignmentsStudentController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
