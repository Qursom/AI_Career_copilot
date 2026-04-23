import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Wraps every successful controller response in a standard envelope:
 *
 *   { success: true, data: <handlerReturn>, meta: { requestId, timestamp } }
 *
 * Errors are formatted separately by `AllExceptionsFilter`.
 * Raw responses (e.g. streams, redirects) are passed through unchanged.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T> | T
> {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T> | T> {
    if (ctx.getType() !== 'http') return next.handle();

    const req = ctx.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        // If a handler already returned the envelope shape, don't double-wrap.
        if (
          data &&
          typeof data === 'object' &&
          'success' in (data as object) &&
          'data' in (data as object)
        ) {
          return data;
        }
        return {
          success: true as const,
          data,
          meta: {
            requestId: req.requestId ?? 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
