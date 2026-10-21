import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
  CustomDecorator,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Matches PostgreSQL 16 v12.0 enum:
 * CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);

export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtUserPayload | undefined,
    ctx: ExecutionContext,
  ): JwtUserPayload | JwtUserPayload[keyof JwtUserPayload] | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);

