import { IsNotEmpty, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentType } from '../entities/assignment.entity';
import { WritingRubricDto } from './writing-rubric.dto';

export class CreateWritingAssignmentDto {
  @IsString({ message: 'Tiêu đề đề bài phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tiêu đề đề bài không được để trống.' })
  title: string;

  @IsString({ message: 'Hướng dẫn đề bài instructions phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Hướng dẫn đề bài instructions không được để trống.' })
  instructions: string;

  @IsEnum(AssignmentType, { message: 'type phải là QUIZ, WRITING hoặc SPEAKING.' })
  type: AssignmentType;

  @ValidateNested()
  @Type(() => WritingRubricDto)
  @IsNotEmpty({ message: 'Cấu hình barem Rubric không được để trống.' })
  rubric: WritingRubricDto;
}

