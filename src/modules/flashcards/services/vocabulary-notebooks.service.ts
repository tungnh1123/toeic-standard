import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  UserVocabularyNotebookEntity,
  NotebookType,
} from '../entities/user-vocabulary-notebook.entity';
import { UserNotebookCardEntity } from '../entities/user-notebook-card.entity';
import { FlashcardEntity } from '../entities/flashcard.entity';
import { UserCardBookmarkEntity } from '../entities/user-card-bookmark.entity';
import { CreateNotebookDto } from '../dto/create-notebook.dto';
import { UpdateNotebookDto } from '../dto/update-notebook.dto';
import { AddCardToNotebookDto } from '../dto/add-card-to-notebook.dto';
import { UpdateCardMnemonicDto } from '../dto/update-card-mnemonic.dto';
import {
  NotebookItemDto,
  NotebookDetailDto,
  NotebookCardItemDto,
  QuickStarResponseDto,
  TroubledWordItemDto,
  TroubledWordsResponseDto,
} from '../dto/notebook-response.dto';

@Injectable()
export class VocabularyNotebooksService {
  private readonly logger = new Logger(VocabularyNotebooksService.name);

  constructor(
    @InjectRepository(UserVocabularyNotebookEntity)
    private readonly notebookRepo: Repository<UserVocabularyNotebookEntity>,
    @InjectRepository(UserNotebookCardEntity)
    private readonly notebookCardRepo: Repository<UserNotebookCardEntity>,
    @InjectRepository(FlashcardEntity)
    private readonly cardRepo: Repository<FlashcardEntity>,
    @InjectRepository(UserCardBookmarkEntity)
    private readonly bookmarkRepo: Repository<UserCardBookmarkEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Đảm bảo học viên luôn có sổ tay STARRED mặc định
   */
  public async ensureStarredNotebook(
    userId: string,
    manager?: EntityManager,
  ): Promise<UserVocabularyNotebookEntity> {
    const repo = manager
      ? manager.getRepository(UserVocabularyNotebookEntity)
      : this.notebookRepo;

    let starred = await repo.findOne({
      where: { userId, notebookType: NotebookType.STARRED },
    });

    if (!starred) {
      starred = repo.create({
        userId,
        title: 'Từ vựng yêu thích (STARRED)',
        description: 'Kho lưu trữ các từ vựng gắn sao nhanh cần chú ý đặc biệt',
        notebookType: NotebookType.STARRED,
        colorCode: '#F59E0B',
        iconName: 'star',
        isPinned: true,
      });
      starred = await repo.save(starred);
    }

    return starred;
  }

  /**
   * Lấy danh sách sổ tay cá nhân của học viên kèm số lượng từ
   */
  public async getUserNotebooks(userId: string): Promise<NotebookItemDto[]> {
    // Đảm bảo sổ tay Starred luôn tồn tại
    await this.ensureStarredNotebook(userId);

    const rawNotebooks: Array<{
      id: string;
      title: string;
      description: string | null;
      notebookType: NotebookType;
      colorCode: string;
      iconName: string;
      isPinned: boolean;
      createdAt: Date;
      updatedAt: Date;
      totalCards: string;
    }> = await this.dataSource.query(
      `
      SELECT 
        nb.id,
        nb.title,
        nb.description,
        nb.notebook_type AS "notebookType",
        nb.color_code AS "colorCode",
        nb.icon_name AS "iconName",
        nb.is_pinned AS "isPinned",
        nb.created_at AS "createdAt",
        nb.updated_at AS "updatedAt",
        COUNT(nc.id)::int AS "totalCards"
      FROM user_vocabulary_notebooks nb
      LEFT JOIN user_notebook_cards nc ON nc.notebook_id = nb.id
      WHERE nb.user_id = $1
      GROUP BY nb.id
      ORDER BY nb.is_pinned DESC, nb.updated_at DESC
      `,
      [userId],
    );

    return rawNotebooks.map((nb) => ({
      id: nb.id,
      title: nb.title,
      description: nb.description,
      notebookType: nb.notebookType,
      colorCode: nb.colorCode,
      iconName: nb.iconName,
      isPinned: Boolean(nb.isPinned),
      totalCards: Number(nb.totalCards),
      createdAt: nb.createdAt,
      updatedAt: nb.updatedAt,
    }));
  }

  /**
   * Tạo sổ tay từ vựng cá nhân mới
   */
  public async createNotebook(
    userId: string,
    dto: CreateNotebookDto,
  ): Promise<UserVocabularyNotebookEntity> {
    const currentCount = await this.notebookRepo.count({ where: { userId } });
    if (currentCount >= 30) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Bạn đã đạt giới hạn tối đa 30 sổ tay từ vựng.',
      });
    }

    const notebook = this.notebookRepo.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      colorCode: dto.colorCode || '#2563EB',
      iconName: dto.iconName || 'bookmark',
      isPinned: dto.isPinned || false,
      notebookType: NotebookType.CUSTOM,
    });

    return await this.notebookRepo.save(notebook);
  }

  /**
   * Cập nhật thông tin sổ tay (tiêu đề, màu sắc, ghim)
   */
  public async updateNotebook(
    userId: string,
    notebookId: string,
    dto: UpdateNotebookDto,
  ): Promise<UserVocabularyNotebookEntity> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    // Nếu là sổ tay hệ thống STARRED, không cho đổi title thành rỗng
    if (notebook.notebookType === NotebookType.STARRED && dto.title) {
      notebook.title = dto.title;
    } else if (dto.title) {
      notebook.title = dto.title;
    }

    if (dto.description !== undefined) notebook.description = dto.description;
    if (dto.colorCode !== undefined) notebook.colorCode = dto.colorCode;
    if (dto.iconName !== undefined) notebook.iconName = dto.iconName;
    if (dto.isPinned !== undefined) notebook.isPinned = dto.isPinned;

    return await this.notebookRepo.save(notebook);
  }

  /**
   * Xóa sổ tay cá nhân
   */
  public async deleteNotebook(
    userId: string,
    notebookId: string,
  ): Promise<{ success: boolean; message: string }> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    if (notebook.notebookType === NotebookType.STARRED) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Không thể xóa sổ tay hệ thống STARRED mặc định.',
      });
    }

    await this.notebookRepo.remove(notebook);
    return { success: true, message: 'Đã xóa sổ tay từ vựng thành công.' };
  }

  /**
   * Lấy danh sách từ trong sổ tay kèm mẹo nhớ cá nhân và tiến độ SM-2
   */
  public async getCardsInNotebook(
    userId: string,
    notebookId: string,
    page: number = 1,
    limit: number = 20,
    keyword?: string,
  ): Promise<NotebookDetailDto> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    const offset = (page - 1) * limit;
    const filterKeyword = keyword ? `%${keyword.toLowerCase()}%` : null;

    const cardsRaw: Array<{
      entryItemId: string;
      flashcardId: string;
      term: string;
      phoneticIpa: string | null;
      partOfSpeech: string | null;
      definition: string;
      exampleSentence: string | null;
      exampleTranslation: string | null;
      audioUrl: string | null;
      personalMnemonic: string | null;
      customExample: string | null;
      addedAt: Date;
      easeFactor: string;
      intervalDays: string;
    }> = await this.dataSource.query(
      `
      SELECT 
        nc.id AS "entryItemId",
        c.id AS "flashcardId",
        c.term,
        c.phonetic_ipa AS "phoneticIpa",
        c.part_of_speech AS "partOfSpeech",
        c.definition,
        c.example_sentence AS "exampleSentence",
        c.example_translation AS "exampleTranslation",
        c.audio_url AS "audioUrl",
        nc.personal_mnemonic AS "personalMnemonic",
        nc.custom_example AS "customExample",
        nc.added_at AS "addedAt",
        COALESCE(prog.ease_factor, 2.50) AS "easeFactor",
        COALESCE(prog.interval_days, 0) AS "intervalDays"
      FROM user_notebook_cards nc
      INNER JOIN flashcards c ON c.id = nc.flashcard_id
      LEFT JOIN user_flashcard_progress prog 
        ON prog.flashcard_id = c.id AND prog.user_id = $1
      WHERE nc.notebook_id = $2
        AND ($5::text IS NULL OR LOWER(c.term) LIKE $5 OR LOWER(c.definition) LIKE $5)
      ORDER BY nc.added_at DESC
      LIMIT $3 OFFSET $4
      `,
      [userId, notebookId, limit, offset, filterKeyword],
    );

    const countRaw: Array<{ total: string }> = await this.dataSource.query(
      `
      SELECT COUNT(nc.id)::int AS total
      FROM user_notebook_cards nc
      INNER JOIN flashcards c ON c.id = nc.flashcard_id
      WHERE nc.notebook_id = $1
        AND ($2::text IS NULL OR LOWER(c.term) LIKE $2 OR LOWER(c.definition) LIKE $2)
      `,
      [notebookId, filterKeyword],
    );

    const totalCount = Number(countRaw[0]?.total ?? 0);

    const cards: NotebookCardItemDto[] = cardsRaw.map((row) => ({
      entryItemId: row.entryItemId,
      flashcardId: row.flashcardId,
      term: row.term,
      phoneticIpa: row.phoneticIpa,
      partOfSpeech: row.partOfSpeech,
      definition: row.definition,
      exampleSentence: row.exampleSentence,
      exampleTranslation: row.exampleTranslation,
      audioUrl: row.audioUrl,
      personalMnemonic: row.personalMnemonic,
      customExample: row.customExample,
      addedAt: row.addedAt,
      easeFactor: Number(row.easeFactor),
      intervalDays: Number(row.intervalDays),
    }));

    return {
      notebook: {
        id: notebook.id,
        title: notebook.title,
        description: notebook.description,
        colorCode: notebook.colorCode,
        iconName: notebook.iconName,
        notebookType: notebook.notebookType,
        isPinned: notebook.isPinned,
      },
      cards,
      total: totalCount,
      page,
      limit,
    };
  }

  /**
   * Thêm từ vựng vào sổ tay kèm ghi chú mẹo nhớ
   */
  public async addCardToNotebook(
    userId: string,
    notebookId: string,
    dto: AddCardToNotebookDto,
  ): Promise<{ success: boolean; message: string }> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    const card = await this.cardRepo.findOne({ where: { id: dto.flashcardId } });
    if (!card) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Thẻ từ vựng không tồn tại trong hệ thống.',
      });
    }

    const existing = await this.notebookCardRepo.findOne({
      where: { notebookId, flashcardId: dto.flashcardId },
    });
    if (existing) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Từ vựng này đã có trong sổ tay của bạn.',
      });
    }

    const newEntry = this.notebookCardRepo.create({
      notebookId,
      flashcardId: dto.flashcardId,
      personalMnemonic: dto.personalMnemonic ?? null,
      customExample: dto.customExample ?? null,
    });

    await this.notebookCardRepo.save(newEntry);
    await this.notebookRepo.update(notebookId, { updatedAt: new Date() });

    return { success: true, message: 'Đã thêm từ vựng vào sổ tay thành công.' };
  }

  /**
   * Xóa một từ vựng khỏi sổ tay chỉ định
   */
  public async removeCardFromNotebook(
    userId: string,
    notebookId: string,
    cardId: string,
  ): Promise<{ success: boolean; message: string }> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    const entry = await this.notebookCardRepo.findOne({
      where: { notebookId, flashcardId: cardId },
    });
    if (!entry) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Từ vựng không tồn tại trong sổ tay này.',
      });
    }

    await this.notebookCardRepo.remove(entry);
    await this.notebookRepo.update(notebookId, { updatedAt: new Date() });

    return { success: true, message: 'Đã xóa từ vựng khỏi sổ tay thành công.' };
  }

  /**
   * Cập nhật mẹo nhớ / câu ví dụ cá nhân cho từ trong sổ tay
   */
  public async updateCardMnemonic(
    userId: string,
    notebookId: string,
    cardId: string,
    dto: UpdateCardMnemonicDto,
  ): Promise<{ success: boolean; message: string }> {
    const notebook = await this.notebookRepo.findOne({
      where: { id: notebookId, userId },
    });
    if (!notebook) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Sổ tay không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      });
    }

    const entry = await this.notebookCardRepo.findOne({
      where: { notebookId, flashcardId: cardId },
    });
    if (!entry) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Từ vựng không có trong sổ tay này.',
      });
    }

    if (dto.personalMnemonic !== undefined) {
      entry.personalMnemonic = dto.personalMnemonic;
    }
    if (dto.customExample !== undefined) {
      entry.customExample = dto.customExample;
    }

    await this.notebookCardRepo.save(entry);
    return { success: true, message: 'Đã cập nhật mẹo nhớ cá nhân thành công.' };
  }

  /**
   * Đánh dấu sao nhanh / Bỏ sao (Quick Star Toggle)
   * Tự động đồng bộ vào Sổ tay STARRED và bảng user_card_bookmarks
   */
  public async toggleQuickStar(
    userId: string,
    cardId: string,
  ): Promise<QuickStarResponseDto> {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Thẻ từ vựng không tồn tại trong hệ thống.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Lấy hoặc tạo sổ tay Starred
      const starredNotebook = await this.ensureStarredNotebook(userId, manager);

      // 2. Kiểm tra tồn tại trong user_notebook_cards
      const existingInNotebook = await manager.findOne(UserNotebookCardEntity, {
        where: { notebookId: starredNotebook.id, flashcardId: cardId },
      });

      // 3. Kiểm tra trong user_card_bookmarks
      const existingBookmark = await manager.findOne(UserCardBookmarkEntity, {
        where: { userId, flashcardId: cardId },
      });

      if (existingInNotebook) {
        // Đã có -> Hủy gắn sao
        await manager.remove(UserNotebookCardEntity, existingInNotebook);
        if (existingBookmark) {
          await manager.remove(UserCardBookmarkEntity, existingBookmark);
        }
        await manager.update(UserVocabularyNotebookEntity, starredNotebook.id, {
          updatedAt: new Date(),
        });

        return {
          flashcardId: cardId,
          isStarred: false,
          message: 'Đã bỏ từ khỏi Sổ tay Từ vựng Yêu thích (STARRED).',
        };
      } else {
        // Chưa có -> Gắn sao
        const newCardEntry = manager.create(UserNotebookCardEntity, {
          notebookId: starredNotebook.id,
          flashcardId: cardId,
        });
        await manager.save(UserNotebookCardEntity, newCardEntry);

        if (!existingBookmark) {
          const newBookmark = manager.create(UserCardBookmarkEntity, {
            userId,
            flashcardId: cardId,
          });
          await manager.save(UserCardBookmarkEntity, newBookmark);
        }

        await manager.update(UserVocabularyNotebookEntity, starredNotebook.id, {
          updatedAt: new Date(),
        });

        return {
          flashcardId: cardId,
          isStarred: true,
          message: 'Đã thêm từ vào Sổ tay Từ vựng Yêu thích (STARRED).',
        };
      }
    });
  }

  /**
   * Sổ tay thông minh tự động gom từ khó nhớ (Smart Troubled Words: EF <= 1.70)
   */
  public async getSmartTroubledWords(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<TroubledWordsResponseDto> {
    const offset = (page - 1) * limit;

    const rawTroubled: Array<{
      flashcardId: string;
      term: string;
      phoneticIpa: string | null;
      partOfSpeech: string | null;
      definition: string;
      exampleSentence: string | null;
      audioUrl: string | null;
      easeFactor: string;
      intervalDays: string;
      repetitionCount: string;
      status: string;
      dueDate: string;
      lastReviewedAt: Date | null;
    }> = await this.dataSource.query(
      `
      SELECT 
        c.id AS "flashcardId",
        c.term,
        c.phonetic_ipa AS "phoneticIpa",
        c.part_of_speech AS "partOfSpeech",
        c.definition,
        c.example_sentence AS "exampleSentence",
        c.audio_url AS "audioUrl",
        prog.ease_factor AS "easeFactor",
        prog.interval_days AS "intervalDays",
        prog.repetition_count AS "repetitionCount",
        prog.status,
        prog.due_date AS "dueDate",
        prog.last_reviewed_at AS "lastReviewedAt"
      FROM user_flashcard_progress prog
      INNER JOIN flashcards c ON c.id = prog.flashcard_id
      WHERE prog.user_id = $1
        AND (
          prog.ease_factor <= 1.70 
          OR (prog.repetition_count = 0 AND prog.last_reviewed_at IS NOT NULL)
        )
      ORDER BY prog.ease_factor ASC, prog.last_reviewed_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );

    const countRaw: Array<{ total: string }> = await this.dataSource.query(
      `
      SELECT COUNT(prog.id)::int AS total
      FROM user_flashcard_progress prog
      WHERE prog.user_id = $1
        AND (
          prog.ease_factor <= 1.70 
          OR (prog.repetition_count = 0 AND prog.last_reviewed_at IS NOT NULL)
        )
      `,
      [userId],
    );

    const items: TroubledWordItemDto[] = rawTroubled.map((row) => ({
      flashcardId: row.flashcardId,
      term: row.term,
      phoneticIpa: row.phoneticIpa,
      partOfSpeech: row.partOfSpeech,
      definition: row.definition,
      exampleSentence: row.exampleSentence,
      audioUrl: row.audioUrl,
      easeFactor: Number(row.easeFactor),
      intervalDays: Number(row.intervalDays),
      repetitionCount: Number(row.repetitionCount),
      status: row.status,
      dueDate: row.dueDate,
      lastReviewedAt: row.lastReviewedAt,
    }));

    return {
      total: Number(countRaw[0]?.total ?? 0),
      items,
    };
  }
}

