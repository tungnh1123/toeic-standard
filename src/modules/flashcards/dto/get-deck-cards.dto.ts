import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDeckCardsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên.' })
  @Min(1, { message: 'Số trang tối thiểu là 1.' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn số bản ghi phải là số nguyên.' })
  @Min(1, { message: 'Giới hạn tối thiểu là 1 bản ghi.' })
  @Max(100, { message: 'Giới hạn tối đa là 100 bản ghi.' })
  limit: number = 20;
}
