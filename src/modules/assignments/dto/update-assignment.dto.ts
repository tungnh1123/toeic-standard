import { IsOptional, IsString } from 'class-validator';

export class UpdateAssignmentDto {
  @IsString({ message: 'Tiêu đề đề bài phải là chuỗi ký tự.' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Hướng dẫn đề bài instructions phải là chuỗi ký tự.' })
  @IsOptional()
  instructions?: string;

  @IsOptional()
  rubric?: Record<string, unknown>;
}

