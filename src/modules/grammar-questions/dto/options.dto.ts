import { IsNotEmpty, IsString } from 'class-validator';

export class QuestionOptionsDto {
  @IsString()
  @IsNotEmpty({ message: 'Phương án A không được để trống.' })
  A: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án B không được để trống.' })
  B: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án C không được để trống.' })
  C: string;

  @IsString()
  @IsNotEmpty({ message: 'Phương án D không được để trống.' })
  D: string;
}

