import { IsNotEmpty, IsString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentType } from '../entities/assignment.entity';
import { SpeakingRubricDto } from './speaking-rubric.dto';

export class CreateSpeakingAssignmentDto {
  @IsString({ message: 'Tiêu đề đề bài phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tiêu đề đề bài không được để trống.' })
  title: string;

  @IsString({ message: 'Hướng dẫn làm bài instructions phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Hướng dẫn làm bài instructions không được để trống.' })
  instructions: string;

  @IsEnum(AssignmentType, { message: 'type phải là QUIZ, WRITING hoặc SPEAKING.' })
  type: AssignmentType;

  @ValidateNested()
  @Type(() => SpeakingRubricDto)
  @IsNotEmpty({ message: 'Cấu hình barem Speaking Rubric không được để trống.' })
  rubric: SpeakingRubricDto;
}

