import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export type StudySessionMode = 'DUE_FIRST' | 'NEW_FIRST' | 'SHUFFLE';

export class GetStudySessionQueryDto {
  @IsUUID('4', { message: 'deckId phải đúng định dạng UUID.' })
  deckId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng thẻ mỗi phiên phải là số nguyên.' })
  @Min(5, { message: 'Số lượng tối thiểu là 5 thẻ.' })
  @Max(50, { message: 'Số lượng tối đa là 50 thẻ.' })
  limit: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'onlyBookmarked phải là kiểu boolean.' })
  onlyBookmarked?: boolean;

  @IsOptional()
  @IsIn(['DUE_FIRST', 'NEW_FIRST', 'SHUFFLE'], {
    message: 'mode phải là DUE_FIRST, NEW_FIRST hoặc SHUFFLE.',
  })
  mode?: StudySessionMode = 'DUE_FIRST';
}
