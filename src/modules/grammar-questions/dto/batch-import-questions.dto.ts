import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGrammarQuestionDto } from './create-grammar-question.dto';

export class BatchImportQuestionsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách câu hỏi nhập theo lô không được rỗng.' })
  @ValidateNested({ each: true })
  @Type(() => CreateGrammarQuestionDto)
  questions: CreateGrammarQuestionDto[];
}

