import { IsInt, Min, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { RubricCriterionDto } from './rubric-criterion.dto';

export class WritingRubricDto {
  @IsInt({ message: 'timeLimitMinutes phải là số nguyên.' })
  @Min(5, { message: 'Thời gian làm bài tối thiểu là 5 phút.' })
  timeLimitMinutes: number;

  @IsInt({ message: 'minWords phải là số nguyên.' })
  @Min(10, { message: 'Số từ tối thiểu phải lớn hơn hoặc bằng 10.' })
  minWords: number;

  @IsInt({ message: 'maxWords phải là số nguyên.' })
  @Min(50, { message: 'Số từ tối đa phải lớn hơn hoặc bằng 50.' })
  maxWords: number;

  @IsArray({ message: 'criteria phải là một mảng các tiêu chí rubric.' })
  @ArrayMinSize(4, { message: 'Barem Rubric phải có ít nhất 4 tiêu chí chấm điểm.' })
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria: RubricCriterionDto[];
}
