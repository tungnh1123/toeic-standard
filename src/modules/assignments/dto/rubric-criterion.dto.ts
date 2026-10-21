import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';

export class RubricCriterionDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã tiêu chí key không được để trống.' })
  key: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên tiêu chí name không được để trống.' })
  name: string;

  @IsInt({ message: 'Trọng số weight phải là số nguyên.' })
  @Min(1, { message: 'Trọng số weight phải lớn hơn 0.' })
  @Max(100, { message: 'Trọng số weight không vượt quá 100.' })
  weight: number;

  @IsInt({ message: 'Điểm tối đa maxScore phải là số nguyên.' })
  @Min(1, { message: 'Điểm tối đa maxScore phải lớn hơn 0.' })
  @Max(100, { message: 'Điểm tối đa maxScore không vượt quá 100.' })
  maxScore: number;
}
