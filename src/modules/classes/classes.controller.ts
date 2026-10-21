import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClassesService, ClassWithStudentCount } from './classes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../common/decorators/roles.decorator';

@Controller('admin/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  public async getClasses(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<ClassWithStudentCount[]> {
    return await this.classesService.getClasses(user.sub, user.role);
  }
}

