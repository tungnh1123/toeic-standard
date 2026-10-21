import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import {
  FlashcardDeckEntity,
  CefrLevel,
} from '../../flashcards/entities/flashcard-deck.entity';
import { FlashcardEntity } from '../../flashcards/entities/flashcard.entity';
import {
  ImportMatrixResultDto,
  ImportDeckWordsResultDto,
  DeckImportSummaryItem,
} from '../dto/import-flashcard.dto';

export interface ParsedVocabularyItem {
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  cefrLevel: CefrLevel;
  topicCode: string;
  definition: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  synonyms: string[];
  collocations: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function parseCefrLevel(value: unknown): CefrLevel {
  const str = safeString(value)?.toUpperCase();
  if (str === 'A1') return CefrLevel.A1;
  if (str === 'A2') return CefrLevel.A2;
  if (str === 'B1') return CefrLevel.B1;
  if (str === 'B2') return CefrLevel.B2;
  if (str === 'C1') return CefrLevel.C1;
  if (str === 'C2') return CefrLevel.C2;
  return CefrLevel.A1;
}

function parseStringArray(value: unknown): string[] {
  const str = safeString(value);
  if (!str) return [];
  return str
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

@Injectable()
export class FlashcardImportService {
  private readonly logger = new Logger(FlashcardImportService.name);

  constructor(
    @InjectRepository(FlashcardDeckEntity)
    private readonly deckRepo: Repository<FlashcardDeckEntity>,
    @InjectRepository(FlashcardEntity)
    private readonly cardRepo: Repository<FlashcardEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Phân tích tệp Excel và trích xuất danh sách từ vựng chuẩn hóa
   */
  public parseExcelBuffer(buffer: Buffer): ParsedVocabularyItem[] {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer' });
    } catch (err: unknown) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Định dạng tệp Excel không hợp lệ hoặc bị lỗi mã hóa.',
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Tệp Excel không chứa bất kỳ Sheet nào.',
      });
    }

    // Ưu tiên Sheet có tên 'Từ vựng' hoặc 'Oxford', hoặc sheet đầu tiên
    const targetSheetName =
      workbook.SheetNames.find(
        (name) =>
          name.includes('Từ vựng') ||
          name.toLowerCase().includes('oxford') ||
          name.toLowerCase().includes('vocab'),
      ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: `Không tìm thấy Sheet "${targetSheetName}" trong tệp Excel.`,
      });
    }

    const rawRows: unknown[] = xlsx.utils.sheet_to_json(sheet);
    const parsedItems: ParsedVocabularyItem[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!isRecord(row)) continue;

      const term =
        safeString(row['word']) ||
        safeString(row['Term']) ||
        safeString(row['Từ vựng']) ||
        safeString(row['tu_vung']);

      if (!term) continue; // Bỏ qua dòng không có từ

      const definition =
        safeString(row['meaning']) ||
        safeString(row['Meaning']) ||
        safeString(row['Định nghĩa']) ||
        safeString(row['englishDefinition']) ||
        'Đang cập nhật định nghĩa';

      const phoneticIpa =
        safeString(row['phonetic']) ||
        safeString(row['Phonetic']) ||
        safeString(row['Phiên âm']) ||
        safeString(row['phonetic_ipa']);

      const partOfSpeech =
        safeString(row['partOfSpeech']) ||
        safeString(row['Part of speech']) ||
        safeString(row['Từ loại']) ||
        safeString(row['part_of_speech']);

      const cefrLevel = parseCefrLevel(
        row['cefrLevel'] || row['Level'] || row['Cấp độ'] || row['cefr_level'],
      );

      const topicCode =
        safeString(row['topicCode']) ||
        safeString(row['Topic']) ||
        safeString(row['Chủ đề']) ||
        'VOC014';

      const exampleSentence =
        safeString(row['exampleSentence']) ||
        safeString(row['Example']) ||
        safeString(row['Ví dụ']) ||
        safeString(row['example_sentence']);

      const exampleTranslation =
        safeString(row['exampleTranslation']) ||
        safeString(row['Example translation']) ||
        safeString(row['Dịch ví dụ']) ||
        safeString(row['example_translation']);

      const synonyms = parseStringArray(
        row['synonyms'] || row['Synonyms'] || row['Từ đồng nghĩa'],
      );

      const collocations = parseStringArray(
        row['collocations'] || row['Collocations'] || row['Cụm từ'],
      );

      parsedItems.push({
        term,
        phoneticIpa,
        partOfSpeech,
        cefrLevel,
        topicCode,
        definition,
        exampleSentence,
        exampleTranslation,
        synonyms,
        collocations,
      });
    }

    return parsedItems;
  }

  /**
   * Import toàn bộ ma trận từ vựng Oxford (phân chia tự động theo bộ thẻ CEFR)
   */
  public async importOxfordMatrix(
    buffer: Buffer,
    createdBy?: string,
  ): Promise<ImportMatrixResultDto> {
    const items = this.parseExcelBuffer(buffer);
    if (items.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Tệp Excel không chứa dòng dữ liệu từ vựng hợp lệ nào.',
      });
    }

    // Nhóm từ vựng theo CEFR level
    const cefrGroups = new Map<CefrLevel, ParsedVocabularyItem[]>();
    for (const item of items) {
      const group = cefrGroups.get(item.cefrLevel) ?? [];
      group.push(item);
      cefrGroups.set(item.cefrLevel, group);
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    const decksSummary: DeckImportSummaryItem[] = [];

    // Duyệt qua từng cấp độ CEFR và lưu trong transaction
    for (const [level, groupItems] of cefrGroups.entries()) {
      const deckTitle = `Bộ từ vựng Oxford 3000/5000 - Cấp độ ${level}`;

      const { createdCount, skippedCount, deck } = await this.dataSource.transaction(
        async (manager) => {
          // 1. Tìm hoặc tạo Deck cho CEFR level này
          let currentDeck = await manager.findOne(FlashcardDeckEntity, {
            where: { title: deckTitle, level },
          });

          if (!currentDeck) {
            currentDeck = manager.create(FlashcardDeckEntity, {
              title: deckTitle,
              description: `Kho từ vựng cốt lõi Oxford 3000/5000 phân loại theo chuẩn Châu Âu CEFR ${level}`,
              level,
              topicCode: 'VOC014',
              isPublic: true,
              createdBy: createdBy ?? null,
            });
            currentDeck = await manager.save(FlashcardDeckEntity, currentDeck);
          }

          // 2. Lấy danh sách từ đã có trong deck để tránh trùng lặp
          const existingCards = await manager.find(FlashcardEntity, {
            where: { deckId: currentDeck.id },
            select: ['id', 'term'],
          });
          const existingTermSet = new Set(
            existingCards.map((c) => c.term.trim().toLowerCase()),
          );

          // 3. Chuẩn bị danh sách thẻ mới
          const newCardsToInsert: Partial<FlashcardEntity>[] = [];
          let currentDeckSkipped = 0;

          for (const item of groupItems) {
            const normalizedTerm = item.term.trim().toLowerCase();
            if (existingTermSet.has(normalizedTerm)) {
              currentDeckSkipped++;
              continue;
            }
            existingTermSet.add(normalizedTerm);

            newCardsToInsert.push({
              deckId: currentDeck.id,
              term: item.term,
              phoneticIpa: item.phoneticIpa,
              partOfSpeech: item.partOfSpeech,
              definition: item.definition,
              exampleSentence: item.exampleSentence,
              exampleTranslation: item.exampleTranslation,
              audioUrl: null,
              audioSlowUrl: null,
              imageUrl: null,
              synonyms: item.synonyms,
              collocations: item.collocations,
            });
          }

          // 4. Lưu theo từng chunk 100 bản ghi
          if (newCardsToInsert.length > 0) {
            await manager.save(FlashcardEntity, newCardsToInsert as FlashcardEntity[], {
              chunk: 100,
            });
          }

          return {
            createdCount: newCardsToInsert.length,
            skippedCount: currentDeckSkipped,
            deck: currentDeck,
          };
        },
      );

      totalCreated += createdCount;
      totalSkipped += skippedCount;
      decksSummary.push({
        deckId: deck.id,
        deckTitle: deck.title,
        cefrLevel: level,
        cardsCount: createdCount,
      });

      this.logger.log(
        `[CEFR ${level}] Đã lưu ${createdCount} thẻ mới vào "${deckTitle}" (Bỏ qua ${skippedCount} thẻ trùng).`,
      );
    }

    return {
      totalRowsProcessed: items.length,
      totalCardsCreated: totalCreated,
      totalCardsSkipped: totalSkipped,
      decksSummary,
    };
  }

  /**
   * Import từ vựng trực tiếp vào 1 bộ thẻ chỉ định (theo Endpoint FNC_ADM_12)
   */
  public async importWordsToDeck(
    deckId: string,
    buffer: Buffer,
  ): Promise<ImportDeckWordsResultDto> {
    const deck = await this.deckRepo.findOne({ where: { id: deckId } });
    if (!deck) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: `Bộ thẻ với ID ${deckId} không tồn tại.`,
      });
    }

    const items = this.parseExcelBuffer(buffer);
    if (items.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VAL_001',
        message: 'Tệp Excel không chứa từ vựng hợp lệ nào để import.',
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      const existingCards = await manager.find(FlashcardEntity, {
        where: { deckId },
        select: ['id', 'term'],
      });
      const existingTermSet = new Set(
        existingCards.map((c) => c.term.trim().toLowerCase()),
      );

      const newCardsToInsert: Partial<FlashcardEntity>[] = [];
      let skipped = 0;

      for (const item of items) {
        const normalizedTerm = item.term.trim().toLowerCase();
        if (existingTermSet.has(normalizedTerm)) {
          skipped++;
          continue;
        }
        existingTermSet.add(normalizedTerm);

        newCardsToInsert.push({
          deckId,
          term: item.term,
          phoneticIpa: item.phoneticIpa,
          partOfSpeech: item.partOfSpeech,
          definition: item.definition,
          exampleSentence: item.exampleSentence,
          exampleTranslation: item.exampleTranslation,
          audioUrl: null,
          audioSlowUrl: null,
          imageUrl: null,
          synonyms: item.synonyms,
          collocations: item.collocations,
        });
      }

      if (newCardsToInsert.length > 0) {
        await manager.save(FlashcardEntity, newCardsToInsert as FlashcardEntity[], {
          chunk: 100,
        });
      }

      return {
        deckId,
        deckTitle: deck.title,
        totalRowsProcessed: items.length,
        totalCardsCreated: newCardsToInsert.length,
        totalCardsSkipped: skipped,
      };
    });
  }

  /**
   * Phương thức đọc file trực tiếp từ đĩa (phục vụ script và test)
   */
  public async importOxfordMatrixFile(
    filePath: string,
  ): Promise<ImportMatrixResultDto> {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: `Tệp ma trận từ vựng không tồn tại tại: ${filePath}`,
      });
    }
    const buffer = fs.readFileSync(filePath);
    return await this.importOxfordMatrix(buffer);
  }
}

