import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  /** Firebase UID — the identity every feature stores rows against. */
  userId: string;
  /** MongoDB `_id`; absent under the non-production `x-user-id` fallback. */
  mongoId?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
  interviewCoins?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.userId) {
      throw new Error('CurrentUser used without AuthGuard');
    }
    return {
      userId: req.userId,
      mongoId: req.userMongoId,
      email: req.userEmail,
      name: req.userName,
      photoUrl: req.userPhotoUrl,
      interviewCoins: req.userInterviewCoins,
    };
  },
);
