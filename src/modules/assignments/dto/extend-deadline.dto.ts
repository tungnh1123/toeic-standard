import { IsUUID, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class ExtendDeadlineDto {
  @IsUUID('4', { message: 'targetId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  targetId?: string;

  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsOptional()
  classId?: string;

  @IsDateString({}, { message: 'newDueDate phải là định dạng chuỗi thời gian ISO 8601 hợp lệ.' })
  @IsNotEmpty({ message: 'Hạn nộp mới newDueDate không được để trống.' })
  newDueDate!: string;
}
