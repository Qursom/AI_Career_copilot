import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    userPhotoUrl?: string;
    userInterviewCoins?: number;
    cookies?: Record<string, string>;
  }
}
