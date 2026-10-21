import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsIn,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerItemDto {
  @IsUUID('4', { message: 'ID câu hỏi không hợp lệ (phải là UUID v4).' })
  questionId: string;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'], { message: 'Đáp án chọn phải là A, B, C hoặc D.' })
  selectedOption?: string;
}

export class SubmitGrammarQuizDto {
  @IsArray({ message: 'Danh sách câu trả lời phải là một mảng.' })
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers: QuizAnswerItemDto[];

  @IsInt({ message: 'Thời gian làm bài phải là số nguyên tính bằng giây.' })
  @Min(0, { message: 'Thời gian làm bài không được âm.' })
  durationSeconds: number;
}

