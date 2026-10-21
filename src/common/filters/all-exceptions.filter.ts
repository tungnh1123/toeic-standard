import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorEnvelope {
  statusCode: number;
  success: boolean;
  errorCode: string;
  message: string;
  details?: ReadonlyArray<string>;
  path: string;
  timestamp: string;
}

interface HttpExceptionResponseObject {
  statusCode?: number;
  message?: string | ReadonlyArray<string>;
  error?: string;
  errorCode?: string;
}

interface PostgresDriverError {
  code: string;
  detail?: string;
  constraint?: string;
}

function isPostgresDriverError(error: unknown): error is PostgresDriverError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'ERR_INTERNAL_SERVER';
    let message = 'Đã xảy ra lỗi hệ thống nội bộ.';
    let details: ReadonlyArray<string> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.mapStatusToDefaultErrorCode(status);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as HttpExceptionResponseObject;
        if (Array.isArray(resObj.message)) {
          message = resObj.message[0] ?? 'Dữ liệu đầu vào không hợp lệ.';
          details = resObj.message;
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = exception.message;
        }

        errorCode =
          typeof resObj.errorCode === 'string'
            ? resObj.errorCode
            : this.mapStatusToDefaultErrorCode(status);
      }
    } else if (isPostgresDriverError(exception)) {
      switch (exception.code) {
        case '23505': {
          status = HttpStatus.CONFLICT;
          errorCode = 'ERR_VAL_DUPLICATE';
          message = 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất).';
          break;
        }
        case '23503': {
          status = HttpStatus.BAD_REQUEST;
          errorCode = 'ERR_VAL_FOREIGN_KEY';
          message = 'Bản ghi tham chiếu không tồn tại hoặc đang được sử dụng.';
          break;
        }
        case '22P02': {
          status = HttpStatus.BAD_REQUEST;
          errorCode = 'ERR_VAL_INVALID_UUID';
          message = 'Định dạng định danh UUID hoặc kiểu dữ liệu không hợp lệ.';
          break;
        }
        case '23514': {
          status = HttpStatus.BAD_REQUEST;
          errorCode = 'ERR_VAL_CHECK_CONSTRAINT';
          message = 'Giá trị dữ liệu vượt ngoài biên độ cho phép của hệ thống.';
          break;
        }
        default: {
          this.logger.error(
            `Unhandled PostgreSQL error code: ${exception.code}`,
            exception.detail,
          );
          break;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const errorBody: ErrorEnvelope = {
      statusCode: status,
      success: false,
      errorCode,
      message,
      ...(details !== undefined ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorBody);
  }

  private mapStatusToDefaultErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'ERR_VAL_001';
      case HttpStatus.UNAUTHORIZED:
        return 'ERR_AUTH_001';
      case HttpStatus.FORBIDDEN:
        return 'ERR_AUTH_003';
      case HttpStatus.NOT_FOUND:
        return 'ERR_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'ERR_CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'ERR_RATE_LIMIT';
      default:
        return 'ERR_INTERNAL_SERVER';
    }
  }
}

