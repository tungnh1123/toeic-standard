import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewCardDto {
  @IsInt({ message: 'Điểm phản xạ SM-2 phải là số nguyên.' })
  @Min(1, { message: 'Mức đánh giá tối thiểu là 1 (Quên).' })
  @Max(4, { message: 'Mức đánh giá tối đa là 4 (Dễ).' })
  rating: number;

  @IsOptional()
  @IsInt({ message: 'Thời gian học phải là số nguyên (miligiây).' })
  studyDurationMs?: number;

  @IsOptional()
  @IsDateString({}, { message: 'reviewedAt phải theo định dạng ISO-8601.' })
  reviewedAt?: string;
}

export class BatchReviewCardItemDto {
  @IsUUID('4', { message: 'ID thẻ từ vựng phải là định dạng UUID hợp lệ.' })
  flashcardId: string;

  @IsInt({ message: 'Điểm phản xạ SM-2 phải là số nguyên.' })
  @Min(1, { message: 'Mức đánh giá tối thiểu là 1 (Quên).' })
  @Max(4, { message: 'Mức đánh giá tối đa là 4 (Dễ).' })
  rating: number;

  @IsOptional()
  @IsInt({ message: 'Thời gian học phải là số nguyên (miligiây).' })
  studyDurationMs?: number;

  @IsOptional()
  @IsDateString({}, { message: 'reviewedAt phải theo định dạng ISO-8601.' })
  reviewedAt?: string;
}

export class BatchReviewDto {
  @IsArray({ message: 'Danh sách đánh giá phải là một mảng.' })
  @ValidateNested({ each: true })
  @Type(() => BatchReviewCardItemDto)
  items: BatchReviewCardItemDto[];
}
