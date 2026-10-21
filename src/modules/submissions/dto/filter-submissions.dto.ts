import { IsOptional, IsUUID, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SubmissionStatusEnum {
  SUBMITTED = 'SUBMITTED',
  GRADING = 'GRADING',
  GRADED = 'GRADED',
  REJECTED = 'REJECTED',
}

export enum AssignmentTypeEnum {
  QUIZ = 'QUIZ',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

export class FilterSubmissionsDto {
  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  classId?: string;

  @IsUUID('4', { message: 'assignmentId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  assignmentId?: string;

  @IsEnum(SubmissionStatusEnum, { message: 'status phải là SUBMITTED, GRADING, GRADED hoặc REJECTED.' })
  @IsOptional()
  status?: SubmissionStatusEnum;

  @IsEnum(AssignmentTypeEnum, { message: 'type phải là QUIZ, WRITING hoặc SPEAKING.' })
  @IsOptional()
  type?: AssignmentTypeEnum;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
