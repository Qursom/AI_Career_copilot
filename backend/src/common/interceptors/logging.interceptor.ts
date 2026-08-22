import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, res, start),
        error: () => this.log(req, res, start),
      }),
    );
  }

  private log(req: Request, res: Response, start: bigint): void {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms rid=${req.requestId ?? '-'}`;
    if (process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production') {
      const payload = JSON.stringify({
        ts: new Date().toISOString(),
        type: 'http',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Number(ms.toFixed(1)),
        requestId: req.requestId ?? '-',
      });
      if (res.statusCode >= 500) this.logger.error(payload);
      else if (res.statusCode >= 400) this.logger.warn(payload);
      else this.logger.log(payload);
      return;
    }
    if (res.statusCode >= 500) this.logger.error(line);
    else if (res.statusCode >= 400) this.logger.warn(line);
    else this.logger.log(line);
  }
}
