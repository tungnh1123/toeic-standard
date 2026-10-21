import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonAuthModule } from './common/common-auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { FlashcardImportModule } from './modules/flashcard-import/flashcard-import.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'rl_admin',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'toeic_db',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    CommonAuthModule,
    UsersModule,
    AuthModule,
    FlashcardsModule,
    FlashcardImportModule,
    GrammarModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
