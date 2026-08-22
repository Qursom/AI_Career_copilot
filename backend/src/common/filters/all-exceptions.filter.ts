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
import { captureException } from '../logging/sentry';
import { TypedConfigService } from '../../config/typed-config.service';

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

  constructor(private readonly config: TypedConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(String(exception));
      return;
    }

    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { status, code, message, details, logMessage } =
      this.normalize(exception);

    const body: ApiErrorBody = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: {
        requestId: req.requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    };

    const logLine = `${req.method} ${req.originalUrl} ${status} ${code}: ${logMessage ?? message} rid=${req.requestId ?? '-'}`;
    if (status >= 500) {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : undefined,
      );
      void captureException(exception);
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
    /** Detail kept for the log when the client-facing message is redacted. */
    logMessage?: string;
  } {
    if (isMulterFileTooLarge(exception)) {
      return this.fileTooLarge();
    }

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
        if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
          return this.fileTooLarge(resp);
        }
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
        if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
          return this.fileTooLarge(
            typeof message === 'string' ? message : undefined,
          );
        }
        return {
          status,
          code:
            (typeof r.error === 'string' ? r.error : undefined) ??
            this.codeFromStatus(status),
          message: message || 'Request failed.',
          details: Array.isArray(r.message) ? r.message : undefined,
        };
      }

      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        return this.fileTooLarge(exception.message);
      }

      return {
        status,
        code: this.codeFromStatus(status),
        message: exception.message,
      };
    }

    // Unknown / programmer errors. Their messages routinely carry connection
    // strings, file paths, and upstream payloads, so outside development the
    // client gets a generic line and the detail stays in the log.
    const detail =
      exception instanceof Error ? exception.message : 'Unexpected error.';
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: this.config.isProd
        ? 'Something went wrong. Please try again.'
        : detail,
      logMessage: detail,
    };
  }

  private fileTooLarge(message?: string): {
    status: number;
    code: string;
    message: string;
  } {
    const generic =
      !message ||
      message === 'Payload Too Large' ||
      /payload too large/i.test(message);
    const limitMb = this.config.get('RESUME_MAX_FILE_SIZE_MB');
    return {
      status: HttpStatus.PAYLOAD_TOO_LARGE,
      code: 'FILE_TOO_LARGE',
      message: generic
        ? `File exceeds the ${limitMb} MB limit.`
        : message,
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      402: 'INSUFFICIENT_COINS',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'FILE_TOO_LARGE',
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

function isMulterFileTooLarge(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;
  const err = exception as { name?: unknown; code?: unknown };
  return err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE';
}
