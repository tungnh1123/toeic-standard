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
import { AssignAssignmentDto } from './dto/assign-assignment.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { FilterAssignedListDto } from './dto/filter-assigned-list.dto';
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

  /**
   * Endpoint #56: Giao bài cho Lớp học hoặc Học viên kèm dueDate riêng
   * POST /api/v1/admin/assignments/:id/assign
   */
  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  public async assignAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AssignAssignmentDto,
  ) {
    return await this.assignmentsService.assignAssignment(id, user.sub, user.role, dto);
  }

  /**
   * Endpoint #58: Gia hạn Deadline bài tập cho lớp hoặc học viên
   * PUT /api/v1/admin/assignments/:id/extend-deadline
   */
  @Put(':id/extend-deadline')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  public async extendDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ExtendDeadlineDto,
  ) {
    return await this.assignmentsService.extendDeadline(id, user.sub, user.role, dto);
  }

  /**
   * Endpoint #59: Xem danh sách phân công, học viên đã giao bài và trạng thái nộp
   * GET /api/v1/admin/assignments/:id/assigned-list
   */
  @Get(':id/assigned-list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  public async getAssignedList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Query() filter: FilterAssignedListDto,
  ) {
    return await this.assignmentsService.getAssignedList(id, user.sub, user.role, filter);
  }
}

