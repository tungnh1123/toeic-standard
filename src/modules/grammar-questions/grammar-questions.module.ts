import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrammarQuizQuestionEntity } from '../grammar/entities/grammar-quiz-question.entity';
import { GrammarLessonEntity } from '../grammar/entities/grammar-lesson.entity';
import { AssignmentEntity } from '../assignments/entities/assignment.entity';
import { AssignmentQuestionEntity } from '../assignments/entities/assignment-question.entity';
import { GrammarQuestionsService } from './grammar-questions.service';
import { GrammarQuestionsController } from './grammar-questions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GrammarQuizQuestionEntity,
      GrammarLessonEntity,
      AssignmentEntity,
      AssignmentQuestionEntity,
    ]),
  ],
  controllers: [GrammarQuestionsController],
  providers: [GrammarQuestionsService],
  exports: [GrammarQuestionsService],
})
export class GrammarQuestionsModule {}

