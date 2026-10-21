import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'toeic-master-super-secret-key-2026',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  exports: [JwtModule],
})
export class CommonAuthModule {}
