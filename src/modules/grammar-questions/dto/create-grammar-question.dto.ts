import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionOptionsDto } from './options.dto';

export class CreateGrammarQuestionDto {
  @IsUUID('4', { message: 'lessonId phải là chuỗi UUID v4 hợp lệ.' })
  @IsNotEmpty({ message: 'lessonId không được để trống.' })
  lessonId: string;

  @IsInt({ message: 'questionNumber phải là số nguyên.' })
  @Min(1, { message: 'questionNumber phải lớn hơn hoặc bằng 1.' })
  questionNumber: number;

  @IsString({ message: 'questionText phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống.' })
  questionText: string;

  @ValidateNested()
  @Type(() => QuestionOptionsDto)
  @IsNotEmpty({ message: 'Danh sách phương án options không được để trống.' })
  options: QuestionOptionsDto;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'correctOption phải là một trong các giá trị A, B, C, D.' })
  @IsNotEmpty({ message: 'Đáp án đúng correctOption không được để trống.' })
  correctOption: 'A' | 'B' | 'C' | 'D';

  @IsString({ message: 'explanation phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Lời giải explanation không được để trống.' })
  explanation: string;

  @IsString()
  @IsOptional()
  translation?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'], { message: 'difficultyLevel phải là EASY, MEDIUM hoặc HARD.' })
  @IsOptional()
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
}

