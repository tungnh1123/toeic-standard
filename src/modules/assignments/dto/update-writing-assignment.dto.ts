import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WritingRubricDto } from './writing-rubric.dto';

export class UpdateWritingAssignmentDto {
  @IsString({ message: 'Tiêu đề đề bài phải là chuỗi ký tự.' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Hướng dẫn đề bài instructions phải là chuỗi ký tự.' })
  @IsOptional()
  instructions?: string;

  @ValidateNested()
  @Type(() => WritingRubricDto)
  @IsOptional()
  rubric?: WritingRubricDto;
}
