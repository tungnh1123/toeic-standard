import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedRequest,
  IS_PUBLIC_KEY,
  JwtUserPayload,
} from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (isPublic && !token) {
      return true;
    }

    if (!token) {
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_001',
        message: 'Vui lòng đăng nhập để tiếp tục (Thiếu Bearer Access Token).',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUserPayload>(token);
      request.user = payload;
      return true;
    } catch {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException({
        errorCode: 'ERR_AUTH_002',
        message: 'Phiên đăng nhập đã hết hạn hoặc Access Token không hợp lệ.',
      });
    }
  }

  private extractTokenFromHeader(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}

