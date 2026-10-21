import { IsNotEmpty, IsString, IsInt, Min, IsIn, IsOptional } from 'class-validator';

export class InlineFeedbackItemDto {
  @IsString()
  @IsNotEmpty({ message: 'id của vị trí sửa lỗi không được để trống.' })
  id!: string;

  @IsInt({ message: 'startOffset phải là số nguyên.' })
  @Min(0, { message: 'startOffset phải lớn hơn hoặc bằng 0.' })
  startOffset!: number;

  @IsInt({ message: 'endOffset phải là số nguyên.' })
  @Min(0, { message: 'endOffset phải lớn hơn hoặc bằng 0.' })
  endOffset!: number;

  @IsString()
  @IsNotEmpty({ message: 'selectedText không được để trống.' })
  selectedText!: string;

  @IsString()
  @IsIn(['GRAMMAR', 'VOCABULARY', 'SPELLING', 'PUNCTUATION', 'COHERENCE'], {
    message: 'errorType phải là GRAMMAR, VOCABULARY, SPELLING, PUNCTUATION hoặc COHERENCE.',
  })
  errorType!: 'GRAMMAR' | 'VOCABULARY' | 'SPELLING' | 'PUNCTUATION' | 'COHERENCE';

  @IsString()
  @IsNotEmpty({ message: 'Nhận xét comment không được để trống.' })
  comment!: string;

  @IsString()
  @IsOptional()
  suggestion?: string;
}

