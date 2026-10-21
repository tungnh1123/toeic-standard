import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonAuthModule } from './common/common-auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { FlashcardImportModule } from './modules/flashcard-import/flashcard-import.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GrammarQuestionsModule } from './modules/grammar-questions/grammar-questions.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'rl_admin',
            password: process.env.DB_PASSWORD || 'admin',
            database: process.env.DB_NAME || 'toeic_db',
          }),
      ssl:
        process.env.DB_SSL === 'true' ||
        Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'))
          ? { rejectUnauthorized: false }
          : false,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    CommonAuthModule,
    UsersModule,
    AuthModule,
    FlashcardsModule,
    FlashcardImportModule,
    GrammarModule,
    AnalyticsModule,
    GrammarQuestionsModule,
    AssignmentsModule,
    MediaModule,
    NotificationsModule,
    ClassesModule,
    SubmissionsModule,
  ],
})
export class AppModule {}
