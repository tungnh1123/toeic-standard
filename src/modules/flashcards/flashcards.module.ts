import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FlashcardDeckEntity } from './entities/flashcard-deck.entity';
import { FlashcardEntity } from './entities/flashcard.entity';
import { UserFavoriteDeckEntity } from './entities/user-favorite-deck.entity';
import { UserFlashcardProgressEntity } from './entities/user-flashcard-progress.entity';
import { UserCardBookmarkEntity } from './entities/user-card-bookmark.entity';
import { DecksService } from './services/decks.service';
import { DecksController } from './controllers/decks.controller';
import { FlashcardStudySessionService } from './services/flashcard-study-session.service';
import { FlashcardStudySessionController } from './controllers/flashcard-study-session.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlashcardDeckEntity,
      FlashcardEntity,
      UserFavoriteDeckEntity,
      UserFlashcardProgressEntity,
      UserCardBookmarkEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'toeic-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [DecksController, FlashcardStudySessionController],
  providers: [DecksService, FlashcardStudySessionService],
  exports: [DecksService, FlashcardStudySessionService],
})
export class FlashcardsModule {}
