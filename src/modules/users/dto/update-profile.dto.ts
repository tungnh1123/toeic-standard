import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Họ tên không được vượt quá 150 ký tự.' })
  fullName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn avatar không hợp lệ.' })
  avatarUrl?: string;
}

