import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FlashcardImportService } from '../modules/flashcard-import/services/flashcard-import.service';
import * as path from 'path';

async function bootstrap(): Promise<void> {
  console.log('🚀 Khởi động tiến trình Import Bộ từ vựng Oxford Matrix...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const importService = app.get(FlashcardImportService);
  const filePath = path.resolve(process.cwd(), 'oxford_vocabulary_matrix-import.xlsx');

  console.log(`📁 Đường dẫn tệp nguồn: ${filePath}`);
  const startTime = Date.now();

  try {
    const result = await importService.importOxfordMatrixFile(filePath);
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n======================================================');
    console.log('🎉 IMPORT THÀNH CÔNG MA TRẬN TỪ VỰNG OXFORD VÀO DATABASE');
    console.log('======================================================');
    console.log(`⏱️ Thời gian thực thi: ${elapsedSeconds}s`);
    console.log(`📊 Tổng số dòng xử lý: ${result.totalRowsProcessed}`);
    console.log(`✅ Tổng số thẻ mới đã tạo: ${result.totalCardsCreated}`);
    console.log(`⏭️ Tổng số thẻ trùng lặp bỏ qua: ${result.totalCardsSkipped}`);
    console.log('\n📚 CHI TIẾT THEO CÁC BỘ THẺ CEFR:');

    for (const deck of result.decksSummary) {
      console.log(
        `   • [CEFR ${deck.cefrLevel}] ${deck.deckTitle}: ${deck.cardsCount} thẻ mới (Deck ID: ${deck.deckId})`,
      );
    }
    console.log('======================================================\n');
  } catch (error: unknown) {
    console.error('❌ Lỗi trong quá trình import:', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
