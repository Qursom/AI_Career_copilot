import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    /** Firebase UID of the session user — the key every feature stores against. */
    userId?: string;
    /** MongoDB `_id` of the session user, when a real session is present. */
    userMongoId?: string;
    userEmail?: string;
    userName?: string;
    userPhotoUrl?: string;
    userInterviewCoins?: number;
    cookies?: Record<string, string>;
  }
}
