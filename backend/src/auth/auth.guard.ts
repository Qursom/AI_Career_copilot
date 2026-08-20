import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TypedConfigService } from '../config/typed-config.service';
import { AuthService } from './auth.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private bypassWarned = false;

  constructor(
    private readonly auth: AuthService,
    private readonly config: TypedConfigService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.readSession(req);
    if (session) {
      req.userId = session.firebaseUid;
      req.userMongoId = session.userId;
      req.userEmail = session.email;
      req.userName = session.name;
      req.userPhotoUrl = session.photoUrl;
      req.userInterviewCoins = session.interviewCoins;
      return true;
    }

    if (!this.devBypassAllowed()) {
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
    if (!this.bypassWarned) {
      this.bypassWarned = true;
      this.logger.warn(
        'AUTH_DEV_BYPASS is enabled: requests carrying x-user-id are authenticated as that user without a session. Never enable this outside local development.',
      );
    }
    req.userId = uid;
    req.userEmail = `${uid}@local.dev`;
    req.userName = 'Local user';
    return true;
  }

  /**
   * The `x-user-id` header is an impersonation primitive — it spends the named
   * user's coins and reads their analyses. It therefore requires an explicit
   * opt-in, and is refused outright in production or when Firebase Admin can
   * mint real sessions, so no deployment can fall back into it by accident.
   */
  private devBypassAllowed(): boolean {
    if (!this.config.get('AUTH_DEV_BYPASS')) return false;
    if (this.config.isProd) return false;
    return !this.firebase.enabled;
  }
}

export { AuthGuard as SessionGuard };
