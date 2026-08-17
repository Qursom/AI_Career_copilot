import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  userId: string;
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
      email: req.userEmail,
      name: req.userName,
      photoUrl: req.userPhotoUrl,
      interviewCoins: req.userInterviewCoins,
    };
  },
);
