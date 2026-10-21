import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { AssignmentType } from '../entities/assignment.entity';

export class CreateAssignmentDto {
  @IsString({ message: 'Tiêu đề đề bài phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tiêu đề đề bài không được để trống.' })
  title: string;

  @IsString({ message: 'Hướng dẫn làm bài instructions phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Hướng dẫn làm bài instructions không được để trống.' })
  instructions: string;

  @IsEnum(AssignmentType, { message: 'type phải là QUIZ, WRITING hoặc SPEAKING.' })
  type: AssignmentType;

  @IsOptional()
  rubric?: Record<string, unknown>;
}
