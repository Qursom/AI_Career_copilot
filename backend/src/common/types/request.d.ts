import 'express-serve-static-core';

/**
 * Merges into Express's Request (sourced from `express-serve-static-core`)
 * so `ts-node` and `tsc` both see `requestId` on `http.getRequest<Request>()`.
 */
declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Correlation ID for this request. Populated by `RequestIdMiddleware`.
     * Propagated back to the client via the `X-Request-Id` response header.
     */
    requestId?: string;
  }
}
