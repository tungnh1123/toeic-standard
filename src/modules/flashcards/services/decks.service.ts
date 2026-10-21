import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { FlashcardDeckEntity } from '../entities/flashcard-deck.entity';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { UserFavoriteDeckEntity } from '../entities/user-favorite-deck.entity';
import { GetDecksFilterDto } from '../dto/get-decks-filter.dto';
import { GetDeckCardsDto } from '../dto/get-deck-cards.dto';
import {
  DeckCatalogItemDto,
  DeckDetailResponseDto,
  TodayDecksSummaryDto,
} from '../dto/deck-catalog-response.dto';

interface RawDeckCatalogRow {
  id: string;
  title: string;
  description: string | null;
  level: string;
  topicCode: string;
  thumbnailUrl: string | null;
  totalCards: string | number;
  dueTodayCount: string | number;
  newCardsCount: string | number;
  learningCardsCount: string | number;
  masteredCardsCount: string | number;
  isFavorite: boolean;
}

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(FlashcardDeckEntity)
    private readonly deckRepo: Repository<FlashcardDeckEntity>,
    @InjectRepository(FlashcardEntity)
    private readonly cardRepo: Repository<FlashcardEntity>,
    @InjectRepository(UserFavoriteDeckEntity)
    private readonly favoriteRepo: Repository<UserFavoriteDeckEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lấy danh mục bộ thẻ kèm số liệu tiến độ cá nhân hóa (Anti N+1 Query - Single Aggregation SQL)
   */
  public async getCatalogWithUserProgress(
    userId: string | null,
    filter: GetDecksFilterDto,
  ): Promise<{ items: DeckCatalogItemDto[]; total: number; page: number; limit: number }> {
    const { level, topicCode, keyword, onlyFavorites, page, limit } = filter;
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.level,
        d.topic_code AS "topicCode",
        d.thumbnail_url AS "thumbnailUrl",
        COUNT(c.id)::int AS "totalCards",
        COUNT(CASE WHEN p.id IS NOT NULL AND p.due_date <= CURRENT_DATE THEN 1 END)::int AS "dueTodayCount",
        COUNT(CASE WHEN p.id IS NULL OR (p.repetition_count = 0 AND p.last_reviewed_at IS NULL) THEN 1 END)::int AS "newCardsCount",
        COUNT(CASE WHEN p.id IS NOT NULL AND p.interval_days <= 21 AND p.repetition_count > 0 THEN 1 END)::int AS "learningCardsCount",
        COUNT(CASE WHEN p.id IS NOT NULL AND p.interval_days > 21 AND p.repetition_count >= 3 THEN 1 END)::int AS "masteredCardsCount",
        CASE WHEN fav.id IS NOT NULL THEN true ELSE false END AS "isFavorite"
      FROM flashcard_decks d
      LEFT JOIN flashcards c ON c.deck_id = d.id
      LEFT JOIN user_flashcard_progress p ON p.flashcard_id = c.id AND p.user_id = $1
      LEFT JOIN user_favorite_decks fav ON fav.deck_id = d.id AND fav.user_id = $1
      WHERE d.is_public = true
    `;

    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';
    const params: unknown[] = [effectiveUserId];
    let paramIndex = 2;

    if (level) {
      baseQuery += ` AND d.level = $${paramIndex++}`;
      params.push(level);
    }
    if (topicCode) {
      baseQuery += ` AND d.topic_code = $${paramIndex++}`;
      params.push(topicCode);
    }
    if (keyword) {
      baseQuery += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }
    if (onlyFavorites && userId) {
      baseQuery += ` AND fav.id IS NOT NULL`;
    }

    baseQuery += `
      GROUP BY d.id, fav.id
      ORDER BY "dueTodayCount" DESC, d.created_at ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const rawRows = await this.dataSource.query<RawDeckCatalogRow[]>(baseQuery, params);

    const items: DeckCatalogItemDto[] = rawRows.map((row: RawDeckCatalogRow) => {
      const total = Number(row.totalCards) || 0;
      const mastered = Number(row.masteredCardsCount) || 0;
      const masteryPercentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        level: row.level,
        topicCode: row.topicCode,
        thumbnailUrl: row.thumbnailUrl,
        totalCards: total,
        dueTodayCount: Number(row.dueTodayCount) || 0,
        newCardsCount: Number(row.newCardsCount) || 0,
        learningCardsCount: Number(row.learningCardsCount) || 0,
        masteredCardsCount: mastered,
        masteryPercentage,
        isFavorite: Boolean(row.isFavorite),
      };
    });

    return {
      items,
      total: items.length,
      page,
      limit,
    };
  }

  /**
   * Xem thông tin chi tiết của 1 bộ thẻ kèm 5 từ xem trước (Preview Words)
   */
  public async getDeckDetail(deckId: string, userId: string | null): Promise<DeckDetailResponseDto> {
    const deck = await this.deckRepo.findOne({ where: { id: deckId, isPublic: true } });
    if (!deck) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bộ thẻ không tồn tại hoặc đã bị ẩn.',
      });
    }

    const catalogResult = await this.getCatalogWithUserProgress(userId, {
      page: 1,
      limit: 1,
      keyword: deck.title,
    });

    const deckData = catalogResult.items.find((d) => d.id === deckId);
    if (!deckData) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Không tìm thấy dữ liệu thống kê của bộ thẻ.',
      });
    }

    // Lấy trước 5 từ xem trước
    const previewCards = await this.cardRepo.find({
      where: { deckId },
      select: ['id', 'term', 'phoneticIpa', 'partOfSpeech', 'definition'],
      take: 5,
      order: { createdAt: 'ASC' },
    });

    return {
      ...deckData,
      previewCards: previewCards.map((c) => ({
        id: c.id,
        term: c.term,
        phoneticIpa: c.phoneticIpa,
        partOfSpeech: c.partOfSpeech,
        definition: c.definition,
      })),
    };
  }

  /**
   * Lấy danh sách từ vựng trong bộ thẻ (có phân trang)
   */
  public async getDeckCards(
    deckId: string,
    query: GetDeckCardsDto,
  ): Promise<{ items: FlashcardEntity[]; total: number; page: number; limit: number }> {
    const deck = await this.deckRepo.findOne({ where: { id: deckId, isPublic: true } });
    if (!deck) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bộ thẻ không tồn tại.',
      });
    }

    const [items, total] = await this.cardRepo.findAndCount({
      where: { deckId },
      order: { createdAt: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Đánh dấu hoặc hủy đánh dấu bộ thẻ yêu thích (Toggle) bọc Transaction
   */
  public async toggleFavorite(userId: string, deckId: string): Promise<{ isFavorite: boolean }> {
    const deck = await this.deckRepo.findOne({ where: { id: deckId } });
    if (!deck) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Bộ thẻ không tồn tại.',
      });
    }

    return await this.dataSource.transaction(
      async (manager: EntityManager): Promise<{ isFavorite: boolean }> => {
        const existing = await manager.findOne(UserFavoriteDeckEntity, {
          where: { userId, deckId },
        });

        if (existing) {
          await manager.delete(UserFavoriteDeckEntity, { userId, deckId });
          return { isFavorite: false };
        } else {
          const newFavorite = manager.create(UserFavoriteDeckEntity, {
            userId,
            deckId,
          });
          await manager.save(UserFavoriteDeckEntity, newFavorite);
          return { isFavorite: true };
        }
      },
    );
  }

  /**
   * Thống kê nhanh tổng số từ đến hạn ôn hôm nay trên toàn bộ các deck
   */
  public async getTodaySummary(userId: string): Promise<TodayDecksSummaryDto> {
    const query = `
      SELECT 
        COUNT(CASE WHEN p.due_date <= CURRENT_DATE THEN 1 END)::int AS "totalDueCards",
        COUNT(DISTINCT CASE WHEN p.due_date <= CURRENT_DATE THEN c.deck_id END)::int AS "dueDecksCount",
        COUNT(CASE WHEN p.interval_days > 21 AND p.repetition_count >= 3 THEN 1 END)::int AS "totalMasteredCards"
      FROM user_flashcard_progress p
      INNER JOIN flashcards c ON c.id = p.flashcard_id
      WHERE p.user_id = $1
    `;

    const raw = await this.dataSource.query<
      Array<{
        totalDueCards: string | number;
        dueDecksCount: string | number;
        totalMasteredCards: string | number;
      }>
    >(query, [userId]);

    const result = raw[0];
    return {
      totalDueCards: Number(result?.totalDueCards) || 0,
      dueDecksCount: Number(result?.dueDecksCount) || 0,
      totalMasteredCards: Number(result?.totalMasteredCards) || 0,
    };
  }
}
