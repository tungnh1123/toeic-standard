import { RecommendationItemDto } from './skill-radar-response.dto';

export class WeakSkillDetailDto {
  skillCode: string;
  skillName: string;
  currentScore: number;
  targetBenchmark: number;
  gap: number;
  reasonSummary: string;
  recommendations: RecommendationItemDto[];
}

export class WeaknessDiagnosisResponseDto {
  primaryWeakness: WeakSkillDetailDto;
  secondaryWeakness: WeakSkillDetailDto;
  diagnosisSummary: string;
  suggestedDailyMinutes: number;
}

