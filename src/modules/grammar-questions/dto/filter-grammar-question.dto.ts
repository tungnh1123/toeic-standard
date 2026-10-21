import { IsOptional, IsString, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGrammarQuestionDto {
  @IsUUID('4', { message: 'lessonId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  lessonId?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'], { message: 'difficulty phải là EASY, MEDIUM hoặc HARD.' })
  @IsOptional()
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

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

