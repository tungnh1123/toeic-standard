import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FlashcardDeckEntity } from './entities/flashcard-deck.entity';
import { FlashcardEntity } from './entities/flashcard.entity';
import { UserFavoriteDeckEntity } from './entities/user-favorite-deck.entity';
import { UserFlashcardProgressEntity } from './entities/user-flashcard-progress.entity';
import { UserCardBookmarkEntity } from './entities/user-card-bookmark.entity';
import { FlashcardStudyLogEntity } from './entities/flashcard-study-log.entity';
import { UserStreakEntity } from '../analytics/entities/user-streak.entity';
import { DecksService } from './services/decks.service';
import { DecksController } from './controllers/decks.controller';
import { FlashcardStudySessionService } from './services/flashcard-study-session.service';
import { FlashcardStudySessionController } from './controllers/flashcard-study-session.controller';
import { Sm2EngineService } from './services/sm2-engine.service';
import { FlashcardSrsService } from './services/flashcard-srs.service';
import { FlashcardSrsController } from './controllers/flashcard-srs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlashcardDeckEntity,
      FlashcardEntity,
      UserFavoriteDeckEntity,
      UserFlashcardProgressEntity,
      UserCardBookmarkEntity,
      FlashcardStudyLogEntity,
      UserStreakEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'toeic-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [
    DecksController,
    FlashcardStudySessionController,
    FlashcardSrsController,
  ],
  providers: [
    DecksService,
    FlashcardStudySessionService,
    Sm2EngineService,
    FlashcardSrsService,
  ],
  exports: [
    DecksService,
    FlashcardStudySessionService,
    Sm2EngineService,
    FlashcardSrsService,
  ],
})
export class FlashcardsModule {}
