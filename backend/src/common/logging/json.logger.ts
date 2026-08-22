import type { LoggerService } from '@nestjs/common';

/**
 * One JSON object per line for log aggregators. Used when LOG_FORMAT=json
 * (recommended in production).
 */
export class JsonLogger implements LoggerService {
  log(message: unknown, ...optional: unknown[]): void {
    this.write('info', message, optional);
  }

  error(message: unknown, ...optional: unknown[]): void {
    this.write('error', message, optional);
  }

  warn(message: unknown, ...optional: unknown[]): void {
    this.write('warn', message, optional);
  }

  debug(message: unknown, ...optional: unknown[]): void {
    this.write('debug', message, optional);
  }

  verbose(message: unknown, ...optional: unknown[]): void {
    this.write('debug', message, optional);
  }

  private write(
    level: string,
    message: unknown,
    optional: unknown[],
  ): void {
    const context =
      optional.length > 0 && typeof optional[optional.length - 1] === 'string'
        ? (optional[optional.length - 1] as string)
        : undefined;
    const extra = context ? optional.slice(0, -1) : optional;
    const stack = extra.find((e) => typeof e === 'string' && e.includes('\n'));
    process.stdout.write(
      `${JSON.stringify({
        ts: new Date().toISOString(),
        level,
        context,
        msg: typeof message === 'string' ? message : String(message),
        ...(stack ? { stack } : {}),
      })}\n`,
    );
  }
}
