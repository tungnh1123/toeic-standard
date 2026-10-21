export class SkillScoreDetailDto {
  skillCode:
    | 'VOCABULARY'
    | 'GRAMMAR'
    | 'LISTENING'
    | 'READING'
    | 'WRITING'
    | 'SPEAKING';
  skillName: string;
  score: number;
  levelLabel: string;
}

export class RecommendationItemDto {
  skillCode: string;
  skillName: string;
  recommendationTitle: string;
  recommendationType:
    | 'FLASHCARD_DECK'
    | 'GRAMMAR_LESSON'
    | 'TOEIC_PRACTICE'
    | 'ASSIGNMENT';
  targetId: string;
  actionUrl: string;
}

export class SkillRadarResponseDto {
  skills: SkillScoreDetailDto[];
  overallScore: number;
  estimatedCefr: string;
  estimatedToeicScore: number;
  targetToeicScore: number;
  scoreGap: number;
  weakestSkills: string[];
  recommendations: RecommendationItemDto[];
  lastCalculatedAt: string;
}
