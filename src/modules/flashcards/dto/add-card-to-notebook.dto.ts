import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
} from 'class-validator';

export class AddCardToNotebookDto {
  @IsUUID('4', { message: 'flashcardId phải là định dạng UUID hợp lệ.' })
  flashcardId: string;

  @IsOptional()
  @IsString({ message: 'Mẹo nhớ phải là chuỗi ký tự.' })
  @MaxLength(500, { message: 'Mẹo nhớ tối đa 500 ký tự.' })
  personalMnemonic?: string;

  @IsOptional()
  @IsString({ message: 'Ví dụ cá nhân phải là chuỗi ký tự.' })
  @MaxLength(500, { message: 'Ví dụ cá nhân tối đa 500 ký tự.' })
  customExample?: string;
}

export class BatchAddCardsToNotebookDto {
  @IsArray({ message: 'Danh sách flashcardIds phải là một mảng.' })
  @IsUUID('4', { each: true, message: 'Từng phần tử phải là định dạng UUID.' })
  flashcardIds: string[];
}
