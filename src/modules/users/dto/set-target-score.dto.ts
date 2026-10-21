import {
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class SetTargetScoreDto {
  @IsInt({ message: 'Mục tiêu điểm số phải là số nguyên.' })
  @Min(10, { message: 'Điểm mục tiêu tối thiểu là 10.' })
  @Max(990, { message: 'Điểm mục tiêu tối đa là 990.' })
  targetScore: number;

  @IsDateString({}, { message: 'Ngày thi dự kiến không hợp lệ (định dạng YYYY-MM-DD).' })
  targetExamDate: string;

  @IsOptional()
  @IsInt({ message: 'Thời gian học mỗi ngày phải là số nguyên.' })
  @Min(10, { message: 'Thời gian học tối thiểu là 10 phút/ngày.' })
  @Max(360, { message: 'Thời gian học tối đa là 360 phút/ngày.' })
  dailyStudyMinutes?: number;
}

