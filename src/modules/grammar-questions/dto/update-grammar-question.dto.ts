import {
  IsUUID,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionOptionsDto } from './options.dto';

export class UpdateGrammarQuestionDto {
  @IsUUID('4', { message: 'lessonId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  lessonId?: string;

  @IsInt({ message: 'questionNumber phải là số nguyên.' })
  @Min(1, { message: 'questionNumber phải lớn hơn hoặc bằng 1.' })
  @IsOptional()
  questionNumber?: number;

  @IsString({ message: 'questionText phải là chuỗi ký tự.' })
  @IsOptional()
  questionText?: string;

  @ValidateNested()
  @Type(() => QuestionOptionsDto)
  @IsOptional()
  options?: QuestionOptionsDto;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'correctOption phải là một trong các giá trị A, B, C, D.' })
  @IsOptional()
  correctOption?: 'A' | 'B' | 'C' | 'D';

  @IsString({ message: 'explanation phải là chuỗi ký tự.' })
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  translation?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'], { message: 'difficultyLevel phải là EASY, MEDIUM hoặc HARD.' })
  @IsOptional()
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
}
