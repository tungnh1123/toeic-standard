import { IsOptional, IsUUID, IsBooleanString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAssignedListDto {
  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  classId?: string;

  @IsBooleanString()
  @IsOptional()
  isCompleted?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

