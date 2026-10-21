import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../users/entities/user.entity';
import { UserGoalEntity } from '../../users/entities/user-goal.entity';
import { UserStreakEntity } from '../../analytics/entities/user-streak.entity';
import { UserRefreshTokenEntity } from '../entities/user-refresh-token.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { UserRole, JwtUserPayload } from '../../../common/decorators/roles.decorator';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    avatarUrl: string | null;
  };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserRefreshTokenEntity)
    private readonly tokenRepo: Repository<UserRefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Đăng ký tài khoản học viên mới kèm khởi tạo UserGoal và UserStreak trong Transaction nguyên tử
   */
  public async register(dto: RegisterDto): Promise<AuthResponseData> {
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException({
        errorCode: 'ERR_VAL_DUPLICATE',
        message: 'Email này đã được đăng ký trong hệ thống.',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    return await this.dataSource.transaction(async (manager: EntityManager): Promise<AuthResponseData> => {
      // 1. Tạo User
      const user = manager.create(UserEntity, {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: UserRole.STUDENT,
      });
      const savedUser: UserEntity = await manager.save(UserEntity, user);

      // 2. Khởi tạo UserGoal mặc định (650 điểm)
      const goal = manager.create(UserGoalEntity, {
        userId: savedUser.id,
        targetScore: 650,
        startingScore: 0,
        dailyStudyMinutes: 30,
        targetExamDate: null,
      });
      await manager.save(UserGoalEntity, goal);

      // 3. Khởi tạo UserStreak (0 ngày, 2 freeze credits)
      const streak = manager.create(UserStreakEntity, {
        userId: savedUser.id,
        currentStreak: 0,
        longestStreak: 0,
        freezeCredits: 2,
      });
      await manager.save(UserStreakEntity, streak);

      // 4. Cấp cặp Access Token & Refresh Token
      const tokens = await this.generateAndStoreTokens(savedUser, manager);

      return {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          fullName: savedUser.fullName,
          role: savedUser.role,
          avatarUrl: savedUser.avatarUrl,
        },
        tokens,
      };
    });
  }

  /**
   * Đăng nhập hệ thống, kiểm tra mật khẩu và cấp cặp token mới
   */
  public async login(
    dto: LoginDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseData> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_001',
        message: 'Tài khoản hoặc mật khẩu không chính xác.',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_001',
        message: 'Tài khoản hoặc mật khẩu không chính xác.',
      });
    }

    const tokens = await this.dataSource.transaction(
      async (manager: EntityManager): Promise<AuthTokens> => {
        return await this.generateAndStoreTokens(user, manager, metadata);
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tokens,
    };
  }

  /**
   * Cơ chế Refresh Token Rotation: Đối chiếu token cũ, thu hồi và cấp cặp token mới
   */
  public async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    let payload: JwtUserPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtUserPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_002',
        message: 'Refresh Token đã hết hạn hoặc không hợp lệ.',
      });
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Người dùng không tồn tại.',
      });
    }

    // Tìm các token đang active của user
    const activeTokens = await this.tokenRepo.find({
      where: {
        userId: user.id,
        isRevoked: false,
      },
    });

    let matchedTokenRecord: UserRefreshTokenEntity | null = null;
    for (const record of activeTokens) {
      const isMatch = await bcrypt.compare(dto.refreshToken, record.tokenHash);
      if (isMatch) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord || matchedTokenRecord.expiresAt < new Date()) {
      // Phát hiện Token Reuse Attack hoặc Token đã hết hạn: vô hiệu hoá toàn bộ token của user
      await this.tokenRepo.update({ userId: user.id }, { isRevoked: true });
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_002',
        message: 'Phát hiện truy cập trái phép. Phiên đăng nhập đã bị hủy bỏ trên mọi thiết bị.',
      });
    }

    return await this.dataSource.transaction(async (manager: EntityManager): Promise<AuthTokens> => {
      // 1. Thu hồi token cũ
      await manager.update(UserRefreshTokenEntity, matchedTokenRecord.id, {
        isRevoked: true,
      });

      // 2. Cấp cặp token mới
      return await this.generateAndStoreTokens(user, manager);
    });
  }

  /**
   * Đăng xuất: Vô hiệu hóa token hiện tại
   */
  public async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      const activeTokens = await this.tokenRepo.find({
        where: { userId, isRevoked: false },
      });
      for (const record of activeTokens) {
        const isMatch = await bcrypt.compare(refreshToken, record.tokenHash);
        if (isMatch) {
          await this.tokenRepo.update(record.id, { isRevoked: true });
          return { success: true };
        }
      }
    }

    // Nếu không truyền cụ thể, thu hồi toàn bộ token active của user
    await this.tokenRepo.update({ userId, isRevoked: false }, { isRevoked: true });
    return { success: true };
  }

  private async generateAndStoreTokens(
    user: UserEntity,
    manager: EntityManager,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

    const refreshTokenRecord = manager.create(UserRefreshTokenEntity, {
      userId: user.id,
      tokenHash,
      ipAddress: metadata?.ipAddress ?? null,
      userAgent: metadata?.userAgent ?? null,
      isRevoked: false,
      expiresAt,
    });
    await manager.save(UserRefreshTokenEntity, refreshTokenRecord);

    return {
      accessToken,
      refreshToken,
    };
  }
}
