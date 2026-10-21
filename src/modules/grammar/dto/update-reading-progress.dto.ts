import { IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class UpdateReadingProgressDto {
  @IsInt({ message: 'Phần trăm cuộn trang phải là số nguyên.' })
  @Min(0, { message: 'Phần trăm cuộn trang tối thiểu là 0%.' })
  @Max(100, { message: 'Phần trăm cuộn trang tối đa là 100%.' })
  scrollPercentage: number;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoàn thành phải là giá trị boolean.' })
  markAsCompleted?: boolean;
}
