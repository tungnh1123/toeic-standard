import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';

export class AssignAssignmentDto {
  @ValidateIf((o) => !o.studentIds || o.studentIds.length === 0)
  @IsUUID('4', { message: 'classId phải là chuỗi UUID v4 hợp lệ.' })
  @IsNotEmpty({ message: 'Phải chọn Lớp học (classId) hoặc Danh sách học viên (studentIds).' })
  classId?: string;

  @ValidateIf((o) => !o.classId)
  @IsArray({ message: 'studentIds phải là mảng chuỗi UUID.' })
  @ArrayMinSize(1, { message: 'Danh sách studentIds phải chứa ít nhất 1 học viên.' })
  @IsUUID('4', { each: true, message: 'Mỗi studentId phải là chuỗi UUID v4 hợp lệ.' })
  studentIds?: string[];

  @IsDateString({}, { message: 'dueDate phải là định dạng chuỗi thời gian ISO 8601 hợp lệ.' })
  @IsNotEmpty({ message: 'Hạn nộp dueDate không được để trống.' })
  dueDate!: string;
}

