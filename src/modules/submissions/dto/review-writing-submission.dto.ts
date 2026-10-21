import {
  IsNotEmpty,
  IsBoolean,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  validateSync,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import { InlineFeedbackItemDto } from './inline-feedback-item.dto';
import { CriterionScoreDto } from './criterion-score.dto';

export function IsCriteriaScoresMap(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCriteriaScoresMap',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
          }
          const keys = Object.keys(value as Record<string, unknown>);
          if (keys.length === 0) {
            return false;
          }
          for (const key of keys) {
            const item = (value as Record<string, unknown>)[key];
            if (!item || typeof item !== 'object') {
              return false;
            }
            const instance = plainToInstance(CriterionScoreDto, item);
            const errors = validateSync(instance);
            if (errors.length > 0) {
              return false;
            }
          }
          return true;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'criteriaScores phải chứa điểm tiêu chí hợp lệ (score, maxScore, weight).';
        },
      },
    });
  };
}

export class ReviewWritingSubmissionDto {
  @IsObject({ message: 'criteriaScores phải là một đối tượng chứa điểm tiêu chí.' })
  @IsNotEmpty({ message: 'criteriaScores không được để trống.' })
  @IsCriteriaScoresMap()
  criteriaScores!: Record<string, CriterionScoreDto>;

  @IsArray({ message: 'inlineFeedback phải là một mảng vị trí sửa lỗi.' })
  @ValidateNested({ each: true })
  @Type(() => InlineFeedbackItemDto)
  @IsOptional()
  inlineFeedback?: InlineFeedbackItemDto[];

  @IsString()
  @IsOptional()
  generalComment?: string;

  @IsString()
  @IsOptional()
  feedbackAudioUrl?: string;

  @IsBoolean({ message: 'isDraft phải là giá trị boolean (true/false).' })
  @IsNotEmpty({ message: 'Cờ isDraft không được để trống.' })
  isDraft!: boolean;
}

