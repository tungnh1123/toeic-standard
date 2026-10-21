import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashcardDeckEntity } from '../flashcards/entities/flashcard-deck.entity';
import { FlashcardEntity } from '../flashcards/entities/flashcard.entity';
import { FlashcardImportService } from './services/flashcard-import.service';
import { FlashcardImportController } from './controllers/flashcard-import.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlashcardDeckEntity, FlashcardEntity]),
  ],
  controllers: [FlashcardImportController],
  providers: [FlashcardImportService],
  exports: [FlashcardImportService],
})
export class FlashcardImportModule {}

