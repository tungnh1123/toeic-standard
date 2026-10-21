import { IsNotEmpty, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class GeneratePresignedUrlDto {
  @IsString({ message: 'filename phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên file filename không được để trống.' })
  filename: string;

  @IsString({ message: 'mimeType phải là chuỗi ký tự.' })
  @IsIn(
    [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/webm',
      'audio/ogg',
      'audio/x-m4a',
    ],
    {
      message: 'mimeType phải là audio/mpeg, audio/mp3, audio/wav, audio/m4a hoặc audio/webm.',
    },
  )
  mimeType: string;

  @IsInt({ message: 'fileSize phải là số nguyên (bytes).' })
  @Min(1024, { message: 'Dung lượng file phải lớn hơn 1KB.' })
  @Max(26214400, { message: 'Dung lượng file audio vượt quá giới hạn tối đa 25MB.' })
  fileSize: number;
}
