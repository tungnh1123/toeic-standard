import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ResponseEnvelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface PaginatedServiceResult<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

function isPaginatedServiceResult<T>(
  value: unknown,
): value is PaginatedServiceResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    ('meta' in value || 'message' in value)
  );
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const statusCode: number = response.statusCode || 200;

    return next.handle().pipe(
      map((resData: T): ResponseEnvelope<T> => {
        let payloadData: T = resData;
        let meta: PaginationMeta | undefined = undefined;
        let message = 'Thao tác thành công';

        if (isPaginatedServiceResult<T>(resData)) {
          payloadData = resData.data;
          meta = resData.meta;
          if (typeof resData.message === 'string' && resData.message.length > 0) {
            message = resData.message;
          }
        }

        return {
          statusCode,
          success: true,
          message,
          data: payloadData,
          ...(meta !== undefined ? { meta } : {}),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

