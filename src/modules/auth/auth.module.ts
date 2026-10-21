import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../users/entities/user.entity';
import { UserRefreshTokenEntity } from './entities/user-refresh-token.entity';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserRefreshTokenEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'toeic-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

