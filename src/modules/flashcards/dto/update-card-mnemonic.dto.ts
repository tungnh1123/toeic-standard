import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCardMnemonicDto {
  @IsOptional()
  @IsString({ message: 'Mẹo nhớ phải là chuỗi ký tự.' })
  @MaxLength(500, { message: 'Mẹo nhớ tối đa 500 ký tự.' })
  personalMnemonic?: string;

  @IsOptional()
  @IsString({ message: 'Ví dụ cá nhân phải là chuỗi ký tự.' })
  @MaxLength(500, { message: 'Ví dụ cá nhân tối đa 500 ký tự.' })
  customExample?: string;
}
