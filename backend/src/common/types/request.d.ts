import 'express';

declare module 'express' {
  interface Request {
    /**
     * Correlation ID for this request. Populated by `RequestIdMiddleware`.
     * Propagated back to the client via the `X-Request-Id` response header.
     */
    requestId?: string;
  }
}
