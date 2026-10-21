import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrammarCategoryEntity } from './entities/grammar-category.entity';
import { GrammarLessonEntity } from './entities/grammar-lesson.entity';
import { UserGrammarProgressEntity } from './entities/user-grammar-progress.entity';
import { UserGrammarBookmarkEntity } from './entities/user-grammar-bookmark.entity';
import { UserStreakEntity } from '../analytics/entities/user-streak.entity';
import { GrammarLessonsService } from './services/grammar-lessons.service';
import { GrammarLessonsController } from './controllers/grammar-lessons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GrammarCategoryEntity,
      GrammarLessonEntity,
      UserGrammarProgressEntity,
      UserGrammarBookmarkEntity,
      UserStreakEntity,
    ]),
  ],
  controllers: [GrammarLessonsController],
  providers: [GrammarLessonsService],
  exports: [GrammarLessonsService],
})
export class GrammarModule {}
