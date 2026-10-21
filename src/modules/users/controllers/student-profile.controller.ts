import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser, UserRole, JwtUserPayload } from '../../../common/decorators/roles.decorator';
import {
  StudentProfileService,
  StudentProfileOverview,
  PresignedUrlResponse,
} from '../services/student-profile.service';
import { SetTargetScoreDto } from '../dto/set-target-score.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AvatarPresignedUrlDto } from '../dto/avatar-presigned-url.dto';
import { UserEntity } from '../entities/user.entity';
import { UserGoalEntity } from '../entities/user-goal.entity';

@Controller('student/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentProfileController {
  constructor(private readonly profileService: StudentProfileService) {}

  @Get('me')
  public async getProfileOverview(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<StudentProfileOverview> {
    return await this.profileService.getStudentProfileOverview(user.sub);
  }

  @Put('me')
  public async updateProfile(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return await this.profileService.updateProfile(user.sub, dto);
  }

  @Put('target')
  public async setTargetScore(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SetTargetScoreDto,
  ): Promise<UserGoalEntity> {
    return await this.profileService.setTargetScore(user.sub, dto);
  }

  @Put('password')
  public async changePassword(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return await this.profileService.changePassword(user.sub, dto);
  }

  @Post('avatar/presigned-url')
  @HttpCode(HttpStatus.OK)
  public async getAvatarPresignedUrl(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AvatarPresignedUrlDto,
  ): Promise<PresignedUrlResponse> {
    return await this.profileService.generateAvatarPresignedUrl(user.sub, dto);
  }
}

