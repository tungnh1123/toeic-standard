import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AttachQuestionsToAssignmentDto {
  @IsArray({ message: 'questionIds phải là một mảng chuỗi UUID.' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 câu hỏi để gắn vào bài tập.' })
  @IsUUID('4', { each: true, message: 'Mỗi questionId phải là chuỗi UUID v4 hợp lệ.' })
  questionIds: string[];
}
