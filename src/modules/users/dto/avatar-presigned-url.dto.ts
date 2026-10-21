import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AvatarPresignedUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên tệp không được để trống.' })
  fileName: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Định dạng ảnh chỉ chấp nhận image/jpeg, image/png hoặc image/webp.',
  })
  mimeType: string;
}

