import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrammarCategoryEntity } from './entities/grammar-category.entity';
import { GrammarLessonEntity } from './entities/grammar-lesson.entity';
import { UserGrammarProgressEntity } from './entities/user-grammar-progress.entity';
import { UserGrammarBookmarkEntity } from './entities/user-grammar-bookmark.entity';
import { GrammarQuizQuestionEntity } from './entities/grammar-quiz-question.entity';
import { UserGrammarQuizAttemptEntity } from './entities/user-grammar-quiz-attempt.entity';
import { UserGrammarQuizAnswerEntity } from './entities/user-grammar-quiz-answer.entity';
import { UserStreakEntity } from '../analytics/entities/user-streak.entity';
import { GrammarLessonsService } from './services/grammar-lessons.service';
import { GrammarQuizService } from './services/grammar-quiz.service';
import { GrammarLessonsController } from './controllers/grammar-lessons.controller';
import { GrammarQuizController } from './controllers/grammar-quiz.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GrammarCategoryEntity,
      GrammarLessonEntity,
      UserGrammarProgressEntity,
      UserGrammarBookmarkEntity,
      GrammarQuizQuestionEntity,
      UserGrammarQuizAttemptEntity,
      UserGrammarQuizAnswerEntity,
      UserStreakEntity,
    ]),
  ],
  controllers: [GrammarLessonsController, GrammarQuizController],
  providers: [GrammarLessonsService, GrammarQuizService],
  exports: [GrammarLessonsService, GrammarQuizService],
})
export class GrammarModule {}


