import { IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class CriterionScoreDto {
  @IsNumber({}, { message: 'Điểm score phải là giá trị số.' })
  @Min(0, { message: 'Điểm tối thiểu là 0.' })
  @Max(100, { message: 'Điểm tối đa không vượt quá 100.' })
  score!: number;

  @IsNumber()
  @Min(1)
  maxScore!: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  weight!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

