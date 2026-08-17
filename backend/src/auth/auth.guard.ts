import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TypedConfigService } from '../config/typed-config.service';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly config: TypedConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.readSession(req);
    if (session) {
      req.userId = session.firebaseUid;
      req.userEmail = session.email;
      req.userName = session.name;
      req.userPhotoUrl = session.photoUrl;
      req.userInterviewCoins = session.interviewCoins;
      return true;
    }

    if (this.config.isProd) {
      throw new UnauthorizedException({
        message: 'Missing or expired session.',
        error: 'UNAUTHORIZED',
      });
    }

    const headerUserId = req.header('x-user-id')?.trim();
    const uid = headerUserId || (this.config.isTest ? 'test-user' : '');
    if (!uid) {
      throw new UnauthorizedException({
        message: 'Missing session_id cookie.',
        error: 'UNAUTHORIZED',
      });
    }
    req.userId = uid;
    req.userEmail = `${uid}@local.dev`;
    req.userName = 'Local user';
    return true;
  }
}

export { AuthGuard as SessionGuard };

