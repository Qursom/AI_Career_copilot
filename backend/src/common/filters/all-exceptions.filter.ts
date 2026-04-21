import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    /** Optional structured field-level errors (validation, etc). */
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
  };
}

/**
 * Global exception filter. Produces a consistent error envelope and logs
 * server errors with full stack. Client (4xx) errors are logged at warn level
 * without a stack to keep logs clean.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(String(exception));
      return;
    }

    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { status, code, message, details } = this.normalize(exception);

    const body: ApiErrorBody = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: {
        requestId: req.requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    };

    const logLine = `${req.method} ${req.originalUrl} ${status} ${code}: ${message} rid=${req.requestId ?? '-'}`;
    if (status >= 500) {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logLine);
    }

    res.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'VALIDATION_ERROR',
        message: 'Request body failed schema validation.',
        details: exception.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();

      if (typeof resp === 'string') {
        return {
          status,
          code: this.codeFromStatus(status),
          message: resp,
        };
      }

      if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        const message =
          (Array.isArray(r.message) && r.message.join(', ')) ||
          (typeof r.message === 'string' ? r.message : exception.message);
        return {
          status,
          code:
            (typeof r.error === 'string' ? r.error : undefined) ??
            this.codeFromStatus(status),
          message: message || 'Request failed.',
          details: Array.isArray(r.message) ? r.message : undefined,
        };
      }

      return {
        status,
        code: this.codeFromStatus(status),
        message: exception.message,
      };
    }

    // Unknown / programmer errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message:
        exception instanceof Error ? exception.message : 'Unexpected error.',
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return map[status] ?? 'ERROR';
  }
}
