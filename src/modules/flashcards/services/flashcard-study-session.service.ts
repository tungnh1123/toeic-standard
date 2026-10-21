import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { FlashcardDeckEntity } from '../entities/flashcard-deck.entity';
import { UserCardBookmarkEntity } from '../entities/user-card-bookmark.entity';
import { GetStudySessionQueryDto } from '../dto/get-study-session-query.dto';
import {
  StudyCardResponseDto,
  StudySessionResponseDto,
} from '../dto/study-card-response.dto';
import { SavePersonalNoteDto } from '../dto/save-personal-note.dto';

interface RawStudyCardRow {
  id: string;
  deckId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  audioUrl: string | null;
  audioSlowUrl: string | null;
  imageUrl: string | null;
  collocations: unknown;
  synonyms: unknown;
  isBookmarked: boolean;
  personalNote: string | null;
  repetitionCount: number | string;
  intervalDays: number | string;
}

@Injectable()
export class FlashcardStudySessionService {
  constructor(
    @InjectRepository(FlashcardEntity)
    private readonly cardRepo: Repository<FlashcardEntity>,
    @InjectRepository(FlashcardDeckEntity)
    private readonly deckRepo: Repository<FlashcardDeckEntity>,
    @InjectRepository(UserCardBookmarkEntity)
    private readonly bookmarkRepo: Repository<UserCardBookmarkEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Khởi tạo gói dữ liệu hoàn chỉnh cho một phiên học 3D tương tác
   */
  public async getStudySessionCards(
    userId: string | null,
    queryDto: GetStudySessionQueryDto,
  ): Promise<StudySessionResponseDto> {
    const { deckId, limit, onlyBookmarked, mode } = queryDto;

    const deck = await this.deckRepo.findOne({ where: { id: deckId, isPublic: true } });
    if (!deck) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bộ thẻ không tồn tại hoặc chưa được xuất bản.',
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const safeUserId = userId || '00000000-0000-0000-0000-000000000000';

    let orderClause = 'ORDER BY prog.due_date ASC NULLS LAST, card.created_at ASC';
    if (mode === 'SHUFFLE') {
      orderClause = 'ORDER BY RANDOM()';
    } else if (mode === 'NEW_FIRST') {
      orderClause = 'ORDER BY prog.due_date DESC NULLS FIRST, card.created_at ASC';
    }

    let filterBookmark = '';
    if (onlyBookmarked && userId) {
      filterBookmark = 'AND bkm.id IS NOT NULL';
    }

    let rawCards = await this.dataSource.query<RawStudyCardRow[]>(
      `
      SELECT 
        card.id,
        card.deck_id AS "deckId",
        card.term,
        card.phonetic_ipa AS "phoneticIpa",
        card.part_of_speech AS "partOfSpeech",
        card.definition,
        card.example_sentence AS "exampleSentence",
        card.example_translation AS "exampleTranslation",
        card.audio_url AS "audioUrl",
        card.audio_slow_url AS "audioSlowUrl",
        card.image_url AS "imageUrl",
        card.collocations,
        card.synonyms,
        CASE WHEN bkm.id IS NOT NULL THEN true ELSE false END AS "isBookmarked",
        bkm.user_personal_note AS "personalNote",
        COALESCE(prog.repetition_count, 0) AS "repetitionCount",
        COALESCE(prog.interval_days, 0) AS "intervalDays"
      FROM flashcards card
      LEFT JOIN user_flashcard_progress prog 
        ON prog.flashcard_id = card.id AND prog.user_id = $1
      LEFT JOIN user_card_bookmarks bkm 
        ON bkm.flashcard_id = card.id AND bkm.user_id = $1
      WHERE card.deck_id = $2
        ${filterBookmark}
        AND (prog.due_date IS NULL OR prog.due_date <= $3)
      ${orderClause}
      LIMIT $4
      `,
      [safeUserId, deckId, todayStr, limit],
    );

    // Nếu không có thẻ nào đến hạn hôm nay, lấy bù thẻ trong bộ để học tiếp
    if (rawCards.length === 0 && !onlyBookmarked) {
      rawCards = await this.dataSource.query<RawStudyCardRow[]>(
        `
        SELECT 
          card.id,
          card.deck_id AS "deckId",
          card.term,
          card.phonetic_ipa AS "phoneticIpa",
          card.part_of_speech AS "partOfSpeech",
          card.definition,
          card.example_sentence AS "exampleSentence",
          card.example_translation AS "exampleTranslation",
          card.audio_url AS "audioUrl",
          card.audio_slow_url AS "audioSlowUrl",
          card.image_url AS "imageUrl",
          card.collocations,
          card.synonyms,
          CASE WHEN bkm.id IS NOT NULL THEN true ELSE false END AS "isBookmarked",
          bkm.user_personal_note AS "personalNote",
          COALESCE(prog.repetition_count, 0) AS "repetitionCount",
          COALESCE(prog.interval_days, 0) AS "intervalDays"
        FROM flashcards card
        LEFT JOIN user_flashcard_progress prog 
          ON prog.flashcard_id = card.id AND prog.user_id = $1
        LEFT JOIN user_card_bookmarks bkm 
          ON bkm.flashcard_id = card.id AND bkm.user_id = $1
        WHERE card.deck_id = $2
        ORDER BY RANDOM()
        LIMIT $3
        `,
        [safeUserId, deckId, limit],
      );
    }

    const cards: StudyCardResponseDto[] = rawCards.map((c: RawStudyCardRow) => ({
      id: c.id,
      deckId: c.deckId,
      term: c.term,
      phoneticIpa: c.phoneticIpa,
      partOfSpeech: c.partOfSpeech,
      definition: c.definition,
      exampleSentence: c.exampleSentence,
      exampleTranslation: c.exampleTranslation,
      audioUrl: c.audioUrl,
      audioSlowUrl: c.audioSlowUrl,
      imageUrl: c.imageUrl,
      collocations: Array.isArray(c.collocations) ? (c.collocations as string[]) : [],
      synonyms: Array.isArray(c.synonyms) ? (c.synonyms as string[]) : [],
      isBookmarked: Boolean(c.isBookmarked),
      personalNote: c.personalNote,
      repetitionCount: Number(c.repetitionCount) || 0,
      intervalDays: Number(c.intervalDays) || 0,
    }));

    return {
      deckTitle: deck.title,
      totalInSession: cards.length,
      cards,
    };
  }

  /**
   * Đánh dấu hoặc hủy đánh dấu sao (Bookmark) từ vựng trong phiên học (Bọc Transaction)
   */
  public async toggleCardBookmark(
    userId: string,
    cardId: string,
  ): Promise<{ isBookmarked: boolean }> {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Thẻ từ vựng không tồn tại.',
      });
    }

    return await this.dataSource.transaction(
      async (manager: EntityManager): Promise<{ isBookmarked: boolean }> => {
        const existing = await manager.findOne(UserCardBookmarkEntity, {
          where: { userId, flashcardId: cardId },
        });

        if (existing) {
          await manager.delete(UserCardBookmarkEntity, {
            userId,
            flashcardId: cardId,
          });
          return { isBookmarked: false };
        } else {
          const newBookmark = manager.create(UserCardBookmarkEntity, {
            userId,
            flashcardId: cardId,
          });
          await manager.save(UserCardBookmarkEntity, newBookmark);
          return { isBookmarked: true };
        }
      },
    );
  }

  /**
   * Lấy danh sách thẻ từ vựng đã đánh dấu sao của học viên
   */
  public async getBookmarkedCards(userId: string): Promise<UserCardBookmarkEntity[]> {
    return await this.bookmarkRepo.find({
      where: { userId },
      relations: ['flashcard'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cập nhật ghi chú cá nhân của học viên cho từ vựng
   */
  public async savePersonalNote(
    userId: string,
    cardId: string,
    dto: SavePersonalNoteDto,
  ): Promise<UserCardBookmarkEntity> {
    let bookmark = await this.bookmarkRepo.findOne({
      where: { userId, flashcardId: cardId },
    });

    if (!bookmark) {
      bookmark = this.bookmarkRepo.create({
        userId,
        flashcardId: cardId,
      });
    }

    bookmark.userPersonalNote = dto.note;
    return await this.bookmarkRepo.save(bookmark);
  }
}

