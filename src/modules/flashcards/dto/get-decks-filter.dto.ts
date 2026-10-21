import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CefrLevel } from '../entities/flashcard-deck.entity';

export class GetDecksFilterDto {
  @IsOptional()
  @IsEnum(CefrLevel, { message: 'Cấp độ CEFR không hợp lệ (chỉ chấp nhận A1, A2, B1, B2, C1, C2).' })
  level?: CefrLevel;

  @IsOptional()
  @IsString({ message: 'Mã chủ đề phải là chuỗi ký tự.' })
  topicCode?: string;

  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự.' })
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'onlyFavorites phải là kiểu boolean.' })
  onlyFavorites?: boolean;

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
