import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthenticatedRequest,
  ROLES_KEY,
  UserRole,
} from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Bạn không có quyền truy cập vào tài nguyên này.',
      });
    }

    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      throw new ForbiddenException({
        errorCode: 'ERR_AUTH_003',
        message: 'Truy cập bị từ chối. Vai trò của bạn không đủ đặc quyền.',
      });
    }

    return true;
  }
}

