import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.',
  })
  newPassword: string;
}

