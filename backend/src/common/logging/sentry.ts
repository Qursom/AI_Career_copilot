import { Logger } from '@nestjs/common';

export async function initSentry(dsn: string | undefined): Promise<void> {
  if (!dsn) return;
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
  new Logger('Sentry').log('Sentry error reporting enabled');
}

export async function captureException(err: unknown): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // Reporting must never break the request path.
  }
}
