import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateNotebookDto {
  @IsString({ message: 'Tiêu đề sổ tay phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tiêu đề sổ tay không được để trống.' })
  @MaxLength(150, { message: 'Tiêu đề sổ tay tối đa 150 ký tự.' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Mã màu phải là chuỗi ký tự.' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Mã màu phải là định dạng HEX hợp lệ (VD: #2563EB).',
  })
  colorCode?: string;

  @IsOptional()
  @IsString({ message: 'Tên biểu tượng phải là chuỗi ký tự.' })
  iconName?: string;

  @IsOptional()
  @IsBoolean({ message: 'isPinned phải là giá trị boolean.' })
  isPinned?: boolean;
}
