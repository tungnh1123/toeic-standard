import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SavePersonalNoteDto {
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Ghi chú không được để trống.' })
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự.' })
  note: string;
}

