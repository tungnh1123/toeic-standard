import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserSkillProfileEntity } from '../entities/user-skill-profile.entity';
import {
  UserSkillHistoryEntity,
  SkillScoresSnapshot,
} from '../entities/user-skill-history.entity';
import { UserGoalEntity } from '../../users/entities/user-goal.entity';
import {
  SkillRadarResponseDto,
  SkillScoreDetailDto,
  RecommendationItemDto,
} from '../dto/skill-radar-response.dto';
import {
  WeaknessDiagnosisResponseDto,
  WeakSkillDetailDto,
} from '../dto/weakness-diagnosis-response.dto';
import {
  HardWordsResponseDto,
  HardWordItemDto,
} from '../dto/hard-words-response.dto';
import {
  SkillHistoryResponseDto,
  SkillHistorySnapshotDto,
} from '../dto/skill-history-response.dto';

interface VocabStatsRow {
  total: string | number;
  mastered: string | number;
}

interface GrammarStatsRow {
  avg_score: string | number | null;
  attempt_count: string | number;
}

interface ToeicAttemptRow {
  listening_score: string | number | null;
  reading_score: string | number | null;
}

interface ReviewScoreRow {
  avg_score: string | number | null;
}

interface HardWordRow {
  cardId: string;
  term: string;
  vietnameseMeaning: string;
  partOfSpeech: string;
  deckId: string;
  deckTitle: string;
  easeFactor: string | number;
  intervalDays: string | number;
  repetitionCount: string | number;
  dueDate: string;
}

interface HistoryRow {
  id: string;
  snapshot_date: string;
  skill_scores: SkillScoresSnapshot;
  estimated_toeic_score: number;
}

@Injectable()
export class SkillRadarEngineService {
  private readonly logger = new Logger(SkillRadarEngineService.name);

  constructor(
    @InjectRepository(UserSkillProfileEntity)
    private readonly profileRepo: Repository<UserSkillProfileEntity>,
    @InjectRepository(UserSkillHistoryEntity)
    private readonly historyRepo: Repository<UserSkillHistoryEntity>,
    @InjectRepository(UserGoalEntity)
    private readonly goalRepo: Repository<UserGoalEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Endpoint #43: Lấy dữ liệu Radar 6 kỹ năng & dự đoán TOEIC
   */
  public async getSkillRadar(userId: string): Promise<SkillRadarResponseDto> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      return await this.recalculateSkills(userId);
    }

    return await this.buildRadarResponse(userId, profile);
  }

  /**
   * Endpoint #44: Chẩn đoán 2 điểm yếu nhất & bài học gợi ý
   */
  public async diagnoseWeaknesses(
    userId: string,
  ): Promise<WeaknessDiagnosisResponseDto> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      await this.recalculateSkills(userId);
      profile = await this.profileRepo.findOne({ where: { userId } });
    }

    const skills = [
      { code: 'VOCABULARY', name: 'Từ vựng (Vocabulary)', score: Number(profile?.vocabScore || 0) },
      { code: 'GRAMMAR', name: 'Ngữ pháp (Grammar)', score: Number(profile?.grammarScore || 0) },
      { code: 'LISTENING', name: 'Nghe hiểu (Listening)', score: Number(profile?.listeningScore || 0) },
      { code: 'READING', name: 'Đọc hiểu (Reading)', score: Number(profile?.readingScore || 0) },
      { code: 'WRITING', name: 'Kỹ năng Viết (Writing)', score: Number(profile?.writingScore || 0) },
      { code: 'SPEAKING', name: 'Kỹ năng Nói (Speaking)', score: Number(profile?.speakingScore || 0) },
    ].sort((a, b) => a.score - b.score);

    const primary = skills[0];
    const secondary = skills[1];

    const primaryRecs = await this.generateRecommendations(primary.code);
    const secondaryRecs = await this.generateRecommendations(secondary.code);

    const primaryWeakness: WeakSkillDetailDto = {
      skillCode: primary.code,
      skillName: primary.name,
      currentScore: primary.score,
      targetBenchmark: 75.0,
      gap: Number(Math.max(0, 75.0 - primary.score).toFixed(1)),
      reasonSummary: this.getReasonSummary(primary.code, primary.score),
      recommendations: primaryRecs,
    };

    const secondaryWeakness: WeakSkillDetailDto = {
      skillCode: secondary.code,
      skillName: secondary.name,
      currentScore: secondary.score,
      targetBenchmark: 75.0,
      gap: Number(Math.max(0, 75.0 - secondary.score).toFixed(1)),
      reasonSummary: this.getReasonSummary(secondary.code, secondary.score),
      recommendations: secondaryRecs,
    };

    return {
      primaryWeakness,
      secondaryWeakness,
      diagnosisSummary: `Dựa trên kết quả thực tế, bạn cần tập trung củng cố 2 kỹ năng: ${primary.name} (${primary.score}/100) và ${secondary.name} (${secondary.score}/100) để nhanh chóng đạt mục tiêu TOEIC.`,
      suggestedDailyMinutes: 45,
    };
  }

  /**
   * Endpoint #45: Báo cáo danh sách từ khó tự động (EF <= 1.70 trong SM-2)
   */
  public async getHardWordsReport(userId: string): Promise<HardWordsResponseDto> {
    const rawWords: HardWordRow[] = await this.dataSource.query(
      `
      SELECT 
        p.flashcard_id AS "cardId",
        c.term,
        c.definition AS "vietnameseMeaning",
        c.part_of_speech AS "partOfSpeech",
        d.id AS "deckId",
        d.title AS "deckTitle",
        p.ease_factor AS "easeFactor",
        p.interval_days AS "intervalDays",
        p.repetition_count AS "repetitionCount",
        p.due_date AS "dueDate"
      FROM user_flashcard_progress p
      JOIN flashcards c ON c.id = p.flashcard_id
      JOIN flashcard_decks d ON d.id = c.deck_id
      WHERE p.user_id = $1 AND p.ease_factor <= 1.70
      ORDER BY p.ease_factor ASC, p.due_date ASC
      LIMIT 100
      `,
      [userId],
    );

    const words: HardWordItemDto[] = rawWords.map((row) => ({
      cardId: row.cardId,
      term: row.term,
      vietnameseMeaning: row.vietnameseMeaning,
      partOfSpeech: row.partOfSpeech,
      deckId: row.deckId,
      deckTitle: row.deckTitle,
      easeFactor: Number(row.easeFactor),
      intervalDays: Number(row.intervalDays),
      repetitionCount: Number(row.repetitionCount),
      dueDate: row.dueDate,
    }));

    return {
      totalHardWords: words.length,
      words,
    };
  }

  /**
   * Endpoint #46: Lấy lịch sử snapshots tăng trưởng năng lực theo thời gian
   */
  public async getSkillHistory(userId: string): Promise<SkillHistoryResponseDto> {
    const rawHistory: HistoryRow[] = await this.dataSource.query(
      `
      SELECT 
        id,
        TO_CHAR(snapshot_date, 'YYYY-MM-DD') AS snapshot_date,
        skill_scores,
        estimated_toeic_score
      FROM user_skill_history
      WHERE user_id = $1
      ORDER BY snapshot_date ASC
      LIMIT 60
      `,
      [userId],
    );

    const history: SkillHistorySnapshotDto[] = rawHistory.map((item) => ({
      date: item.snapshot_date,
      vocabScore: Number(item.skill_scores?.vocabScore || 0),
      grammarScore: Number(item.skill_scores?.grammarScore || 0),
      listeningScore: Number(item.skill_scores?.listeningScore || 0),
      readingScore: Number(item.skill_scores?.readingScore || 0),
      writingScore: Number(item.skill_scores?.writingScore || 0),
      speakingScore: Number(item.skill_scores?.speakingScore || 0),
      overallScore: Number(item.skill_scores?.overallScore || 0),
      estimatedToeicScore: Number(item.estimated_toeic_score || 200),
    }));

    return {
      totalSnapshots: history.length,
      history,
    };
  }

  /**
   * Endpoint #47: Kích hoạt tính toán lại chỉ số 6 kỹ năng
   */
  public async recalculateSkills(userId: string): Promise<SkillRadarResponseDto> {
    // Check which tables are currently available in the database
    const tableCheck: { table_name: string }[] = await this.dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('submission_reviews', 'toeic_exam_attempts', 'user_flashcard_progress', 'user_grammar_quiz_attempts')`,
    );
    const existingTables = new Set(tableCheck.map((r) => r.table_name));

    // 1. VOCABULARY (Dựa trên SM-2 Spaced Repetition)
    let vocabScore = 50.0;
    if (existingTables.has('user_flashcard_progress')) {
      const vocabRows: VocabStatsRow[] = await this.dataSource.query(
        `SELECT COUNT(id)::int AS total, COUNT(CASE WHEN interval_days > 21 AND repetition_count >= 3 THEN 1 END)::int AS mastered FROM user_flashcard_progress WHERE user_id = $1`,
        [userId],
      );
      const totalCards = Number(vocabRows[0]?.total || 0);
      const masteredCards = Number(vocabRows[0]?.mastered || 0);
      vocabScore = totalCards > 0 ? Math.min(100, Math.round((masteredCards / totalCards) * 100)) : 50.0;
    }

    // 2. GRAMMAR (Dựa trên 5 lượt làm quiz gần nhất)
    let grammarScore = 55.0;
    if (existingTables.has('user_grammar_quiz_attempts')) {
      const grammarRows: GrammarStatsRow[] = await this.dataSource.query(
        `SELECT AVG(score)::numeric(5,2) AS avg_score, COUNT(id)::int as attempt_count FROM (SELECT score, id FROM user_grammar_quiz_attempts WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 5) q`,
        [userId],
      );
      if (Number(grammarRows[0]?.attempt_count || 0) > 0) {
        grammarScore = Number(grammarRows[0]?.avg_score || 55.0);
      }
    }

    // 3. LISTENING & READING (Từ bài thi thử gần nhất)
    let listeningScore = 60.0;
    let readingScore = 55.0;
    if (existingTables.has('toeic_exam_attempts')) {
      const toeicRows: ToeicAttemptRow[] = await this.dataSource
        .query(
          `SELECT listening_score, reading_score FROM toeic_exam_attempts WHERE user_id = $1 AND status = 'COMPLETED' ORDER BY submitted_at DESC LIMIT 1`,
          [userId],
        )
        .catch(() => []);
      if (toeicRows.length > 0 && toeicRows[0].listening_score !== null) {
        const rawListening = Number(toeicRows[0].listening_score || 250);
        const rawReading = Number(toeicRows[0].reading_score || 230);
        listeningScore = Math.min(100, Math.round((rawListening / 495) * 100));
        readingScore = Math.min(100, Math.round((rawReading / 495) * 100));
      }
    }

    // 4. WRITING
    let writingScore = 45.0;
    if (existingTables.has('submission_reviews')) {
      const writingRows: ReviewScoreRow[] = await this.dataSource
        .query(
          `SELECT AVG(r.total_score)::numeric(5,2) AS avg_score FROM submission_reviews r JOIN assignment_submissions s ON s.id = r.submission_id JOIN assignments a ON a.id = s.assignment_id WHERE s.student_id = $1 AND a.assignment_type = 'WRITING'`,
          [userId],
        )
        .catch(() => []);
      if (writingRows.length > 0 && writingRows[0]?.avg_score !== null) {
        writingScore = Number(writingRows[0].avg_score);
      }
    }

    // 5. SPEAKING
    let speakingScore = 40.0;
    if (existingTables.has('submission_reviews')) {
      const speakingRows: ReviewScoreRow[] = await this.dataSource
        .query(
          `SELECT AVG(r.total_score)::numeric(5,2) AS avg_score FROM submission_reviews r JOIN assignment_submissions s ON s.id = r.submission_id JOIN assignments a ON a.id = s.assignment_id WHERE s.student_id = $1 AND a.assignment_type = 'SPEAKING'`,
          [userId],
        )
        .catch(() => []);
      if (speakingRows.length > 0 && speakingRows[0]?.avg_score !== null) {
        speakingScore = Number(speakingRows[0].avg_score);
      }
    }

    // 6. OVERALL & ESTIMATED TOEIC
    const overallScore = Number(
      (
        (vocabScore +
          grammarScore +
          listeningScore +
          readingScore +
          writingScore +
          speakingScore) /
        6
      ).toFixed(2),
    );

    const estimatedListening = Math.round((listeningScore / 100) * 495);
    const estimatedReading = Math.round((readingScore / 100) * 495);
    let estimatedToeicScore = Math.min(
      990,
      Math.max(10, Math.round((estimatedListening + estimatedReading) / 5) * 5),
    );

    const estimatedCefr = this.mapToeicToCefr(estimatedToeicScore);

    // 7. Multi-table write inside Transaction (Inviolable Red Line #4)
    const savedProfile = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        let profile = await manager.findOne(UserSkillProfileEntity, {
          where: { userId },
        });

        if (!profile) {
          profile = manager.create(UserSkillProfileEntity, { userId });
        }

        profile.vocabScore = vocabScore;
        profile.grammarScore = grammarScore;
        profile.listeningScore = listeningScore;
        profile.readingScore = readingScore;
        profile.writingScore = writingScore;
        profile.speakingScore = speakingScore;
        profile.overallScore = overallScore;
        profile.estimatedCefr = estimatedCefr;
        profile.estimatedToeicScore = estimatedToeicScore;
        profile.lastCalculatedAt = new Date();

        await manager.save(UserSkillProfileEntity, profile);

        // 8. Lưu snapshot lịch sử
        const today = new Date().toISOString().split('T')[0];
        const snapshot: SkillScoresSnapshot = {
          vocabScore,
          grammarScore,
          listeningScore,
          readingScore,
          writingScore,
          speakingScore,
          overallScore,
        };

        const existingSnapshot = await manager.findOne(UserSkillHistoryEntity, {
          where: { userId, snapshotDate: today },
        });

        if (existingSnapshot) {
          existingSnapshot.skillScores = snapshot;
          existingSnapshot.estimatedToeicScore = estimatedToeicScore;
          await manager.save(UserSkillHistoryEntity, existingSnapshot);
        } else {
          const historyRecord = manager.create(UserSkillHistoryEntity, {
            userId,
            snapshotDate: today,
            skillScores: snapshot,
            estimatedToeicScore,
          });
          await manager.save(UserSkillHistoryEntity, historyRecord);
        }

        return profile;
      },
    );

    return await this.buildRadarResponse(userId, savedProfile);
  }

  private async buildRadarResponse(
    userId: string,
    profile: UserSkillProfileEntity,
  ): Promise<SkillRadarResponseDto> {
    const goal = await this.goalRepo.findOne({ where: { userId } });
    const targetToeicScore = goal?.targetScore || 750;

    const skills: SkillScoreDetailDto[] = [
      {
        skillCode: 'VOCABULARY',
        skillName: 'Từ vựng',
        score: Number(profile.vocabScore),
        levelLabel: this.getLevelLabel(Number(profile.vocabScore)),
      },
      {
        skillCode: 'GRAMMAR',
        skillName: 'Ngữ pháp',
        score: Number(profile.grammarScore),
        levelLabel: this.getLevelLabel(Number(profile.grammarScore)),
      },
      {
        skillCode: 'LISTENING',
        skillName: 'Nghe hiểu',
        score: Number(profile.listeningScore),
        levelLabel: this.getLevelLabel(Number(profile.listeningScore)),
      },
      {
        skillCode: 'READING',
        skillName: 'Đọc hiểu',
        score: Number(profile.readingScore),
        levelLabel: this.getLevelLabel(Number(profile.readingScore)),
      },
      {
        skillCode: 'WRITING',
        skillName: 'Kỹ năng Viết',
        score: Number(profile.writingScore),
        levelLabel: this.getLevelLabel(Number(profile.writingScore)),
      },
      {
        skillCode: 'SPEAKING',
        skillName: 'Kỹ năng Nói',
        score: Number(profile.speakingScore),
        levelLabel: this.getLevelLabel(Number(profile.speakingScore)),
      },
    ];

    const sorted = [...skills].sort((a, b) => a.score - b.score);
    const weakestSkills = [sorted[0].skillCode, sorted[1].skillCode];

    const recs1 = await this.generateRecommendations(weakestSkills[0]);
    const recs2 = await this.generateRecommendations(weakestSkills[1]);
    const recommendations = [...recs1, ...recs2];

    const scoreGap = Math.max(0, targetToeicScore - profile.estimatedToeicScore);

    return {
      skills,
      overallScore: Number(profile.overallScore),
      estimatedCefr: profile.estimatedCefr,
      estimatedToeicScore: profile.estimatedToeicScore,
      targetToeicScore,
      scoreGap,
      weakestSkills,
      recommendations,
      lastCalculatedAt: profile.lastCalculatedAt.toISOString(),
    };
  }

  private getLevelLabel(score: number): string {
    if (score >= 80) return 'Thành thạo (Advanced)';
    if (score >= 65) return 'Khá (Proficient)';
    if (score >= 50) return 'Trung bình (Intermediate)';
    return 'Cần cải thiện (Needs Work)';
  }

  private mapToeicToCefr(score: number): string {
    if (score < 255) return 'A1';
    if (score < 405) return 'A2';
    if (score < 605) return 'B1';
    if (score < 785) return 'B2';
    if (score < 905) return 'C1';
    return 'C2';
  }

  private getReasonSummary(code: string, score: number): string {
    switch (code) {
      case 'VOCABULARY':
        return `Tỷ lệ từ vựng dài hạn đạt ${score}%. Bạn có một số từ vựng khó nhớ cần ôn tập thường xuyên hơn bằng thuật toán SM-2.`;
      case 'GRAMMAR':
        return `Điểm các bài kiểm tra ngữ pháp trung bình là ${score}%. Một số chuyên đề thì và mệnh đề quan hệ cần được củng cố lại lý thuyết.`;
      case 'LISTENING':
        return `Điểm Nghe hiểu đạt ${score}%. Cần rèn luyện phản xạ nghe trong các đoạn hội thoại Part 3 và bài nói Part 4.`;
      case 'READING':
        return `Điểm Đọc hiểu đạt ${score}%. Cần tăng tốc độ đọc lướt (Skimming) và đọc quét (Scanning) văn bản dài trong Part 7.`;
      case 'WRITING':
        return `Điểm Viết đạt ${score}%. Cần mở rộng vốn từ vựng học thuật và cấu trúc câu phức trong phần viết phản hồi Email.`;
      case 'SPEAKING':
        return `Điểm Nói đạt ${score}%. Cần chú ý phát âm đuôi -s/-es/-ed và ngữ điệu câu hỏi trong phần trả lời phỏng vấn.`;
      default:
        return `Điểm số hiện tại là ${score}%, cần tiếp tục luyện tập để thu hẹp khoảng cách điểm mục tiêu.`;
    }
  }

  private async generateRecommendations(
    code: string,
  ): Promise<RecommendationItemDto[]> {
    switch (code) {
      case 'VOCABULARY':
        return [
          {
            skillCode: 'VOCABULARY',
            skillName: 'Từ vựng',
            recommendationTitle: 'Ôn tập 20 từ vựng có độ khó cao (EF <= 1.70) bằng thẻ 3D',
            recommendationType: 'FLASHCARD_DECK',
            targetId: 'vocab-troubled-words',
            actionUrl: '/student/decks',
          },
        ];
      case 'GRAMMAR':
        return [
          {
            skillCode: 'GRAMMAR',
            skillName: 'Ngữ pháp',
            recommendationTitle: 'Học lại chuyên đề: Thì Hiện tại hoàn thành & Bẫy đề thi Part 5',
            recommendationType: 'GRAMMAR_LESSON',
            targetId: 'grammar-present-perfect',
            actionUrl: '/student/grammar',
          },
        ];
      case 'LISTENING':
        return [
          {
            skillCode: 'LISTENING',
            skillName: 'Nghe hiểu',
            recommendationTitle: 'Luyện đề nghe Part 1 & Part 2 TOEIC ngắn (20 câu)',
            recommendationType: 'TOEIC_PRACTICE',
            targetId: 'practice-listening-p12',
            actionUrl: '/student/exams',
          },
        ];
      case 'READING':
        return [
          {
            skillCode: 'READING',
            skillName: 'Đọc hiểu',
            recommendationTitle: 'Chiến thuật giải nhanh Part 5 trong 10 phút',
            recommendationType: 'TOEIC_PRACTICE',
            targetId: 'practice-reading-p5',
            actionUrl: '/student/exams',
          },
        ];
      case 'WRITING':
        return [
          {
            skillCode: 'WRITING',
            skillName: 'Kỹ năng Viết',
            recommendationTitle: 'Luyện viết Email phản hồi phàn nàn của khách hàng (Part 2 Writing)',
            recommendationType: 'ASSIGNMENT',
            targetId: 'assignment-writing-email',
            actionUrl: '/student/assignments',
          },
        ];
      case 'SPEAKING':
        return [
          {
            skillCode: 'SPEAKING',
            skillName: 'Kỹ năng Nói',
            recommendationTitle: 'Thu âm trả lời câu hỏi Speaking Part 1 - Read a text aloud',
            recommendationType: 'ASSIGNMENT',
            targetId: 'assignment-speaking-p1',
            actionUrl: '/student/assignments',
          },
        ];
      default:
        return [];
    }
  }
}
