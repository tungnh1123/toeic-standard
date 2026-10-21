import { Controller, Get, UseGuards } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../common/decorators/roles.decorator';

@Controller('student/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsStudentController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * Endpoint #52: Lấy danh sách bài tập được giao cho bản thân học viên
   * GET /api/v1/student/assignments
   */
  @Get()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  public async getMyAssignments(@CurrentUser() user: JwtUserPayload) {
    return await this.assignmentsService.getStudentAssignments(user.sub);
  }
}
