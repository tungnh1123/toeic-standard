import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssignmentsService, PaginatedAssignmentsResult } from './assignments.service';
import { CreateWritingAssignmentDto } from './dto/create-writing-assignment.dto';
import { CreateSpeakingAssignmentDto } from './dto/create-speaking-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { FilterAssignmentDto } from './dto/filter-assignment.dto';
import { AssignmentEntity } from './entities/assignment.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  UserRole,
  JwtUserPayload,
} from '../../common/decorators/roles.decorator';

@Controller('admin/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class AssignmentsAdminController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * Endpoint #55: Tạo đề bài tập gốc (QUIZ, WRITING, SPEAKING)
   * POST /api/v1/admin/assignments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async createAssignment(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentEntity> {
    return await this.assignmentsService.createAssignment(user.sub, dto);
  }

  /**
   * Danh sách đề bài tập gốc
   * GET /api/v1/admin/assignments
   */
  @Get()
  public async getAssignments(
    @Query() filter: FilterAssignmentDto,
  ): Promise<PaginatedAssignmentsResult> {
    return await this.assignmentsService.getAssignments(filter);
  }

  /**
   * Chi tiết đề bài tập gốc theo ID
   * GET /api/v1/admin/assignments/:id
   */
  @Get(':id')
  public async getAssignmentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentEntity> {
    return await this.assignmentsService.getAssignmentById(id);
  }

  /**
   * Endpoint #58: Cập nhật đề bài tập gốc (Writing / Speaking / Quiz) - chỉ khi chưa có bài nộp
   * PUT /api/v1/admin/assignments/:id
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  public async updateAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<AssignmentEntity> {
    return await this.assignmentsService.updateAssignment(id, user.sub, dto);
  }

  /**
   * Xóa đề bài tập gốc
   * DELETE /api/v1/admin/assignments/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  public async deleteAssignment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; id: string }> {
    return await this.assignmentsService.deleteAssignment(id);
  }
}

