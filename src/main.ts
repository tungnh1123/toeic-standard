import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import express, { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Prefix toàn cục /api/v1
  app.setGlobalPrefix('api/v1');

  // 2. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 3. Global Response Envelope Interceptor & Exception Filter
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 4. Bật CORS cho Web & Mobile
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 5. Phục vụ giao diện Frontend Web SPA trực tiếp từ thư mục web/dist nếu tồn tại
  const webDistPath = join(process.cwd(), 'web/dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    const server = app.getHttpAdapter().getInstance();
    server.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const indexPath = join(webDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      return next();
    });
    logger.log(`Đã nạp giao diện Web Frontend từ: ${webDistPath}`);
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  logger.log(`Ứng dụng Backend NestJS đang chạy tại: http://localhost:${port}/api/v1`);
}

bootstrap();

