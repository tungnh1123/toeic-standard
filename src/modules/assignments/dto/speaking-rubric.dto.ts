import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SpeakingRubricCriterionDto {
  @IsString({ message: 'key phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'key không được để trống.' })
  key: string;

  @IsString({ message: 'name phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'name không được để trống.' })
  name: string;

  @IsInt({ message: 'Trọng số weight phải là số nguyên.' })
  @Min(1, { message: 'Trọng số weight phải lớn hơn 0.' })
  @Max(100, { message: 'Trọng số weight không vượt quá 100.' })
  weight: number;

  @IsInt({ message: 'Điểm tối đa maxScore phải là số nguyên.' })
  @Min(1, { message: 'Điểm tối đa maxScore phải lớn hơn 0.' })
  @Max(100, { message: 'Điểm tối đa maxScore không vượt quá 100.' })
  maxScore: number;
}

export class SpeakingRubricDto {
  @IsInt({ message: 'preparationTimeSeconds phải là số nguyên.' })
  @Min(0, { message: 'Thời gian chuẩn bị preparationTimeSeconds không được âm.' })
  preparationTimeSeconds: number;

  @IsInt({ message: 'responseTimeSeconds phải là số nguyên.' })
  @Min(1, { message: 'Thời gian trả lời responseTimeSeconds tối thiểu là 1 giây.' })
  responseTimeSeconds: number;

  @IsString({ message: 'sampleAudioUrl phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Đường dẫn file audio mẫu sampleAudioUrl không được để trống.' })
  sampleAudioUrl: string;

  @IsString({ message: 'sampleTranscript phải là chuỗi ký tự.' })
  @IsOptional()
  sampleTranscript?: string;

  @IsArray({ message: 'criteria phải là một mảng các tiêu chí rubric.' })
  @ArrayMinSize(1, { message: 'Barem Rubric phải có ít nhất 1 tiêu chí chấm điểm.' })
  @ValidateNested({ each: true })
  @Type(() => SpeakingRubricCriterionDto)
  criteria: SpeakingRubricCriterionDto[];
}
