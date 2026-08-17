import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import { UsersService } from '../users/users.service';
import type { UserRecord } from '../users/users.store';
import { FirebaseAdminService } from './firebase-admin.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_KEY_PREFIX,
  sessionCookieOptions,
  type SessionPayload,
} from './session.constants';

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  interviewCoins: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebase: FirebaseAdminService,
    private readonly users: UsersService,
    private readonly cache: CacheService,
    private readonly config: TypedConfigService,
  ) {}

  async loginWithIdToken(idToken: string, res: Response): Promise<{ user: AuthUserDto }> {
    let identity;
    try {
      identity = await this.firebase.verifyIdToken(idToken);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Firebase token verify failed: ${reason}`);
      throw new UnauthorizedException({
        message: this.config.isProd
          ? 'Invalid Firebase ID token.'
          : `Invalid Firebase ID token. ${reason}`,
        error: 'UNAUTHORIZED',
      });
    }

    const record = await this.users.findOrCreate({
      firebaseUid: identity.uid,
      email: identity.email,
      name: identity.name,
      photoUrl: identity.picture,
    });

    await this.createSession(record, res);
    return { user: this.toDto(record) };
  }

  async me(firebaseUid: string): Promise<{ user: AuthUserDto }> {
    const record = await this.users.getMe(firebaseUid);
    if (!record) {
      throw new UnauthorizedException({
        message: 'Session user was not found.',
        error: 'UNAUTHORIZED',
      });
    }
    return { user: this.toDto(record) };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const sessionId = this.readSessionId(req);
    if (sessionId) {
      await this.cache.del(`${SESSION_KEY_PREFIX}${sessionId}`);
    }
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(this.config.isProd));
    return { ok: true };
  }

  async readSession(req: Request): Promise<SessionPayload | null> {
    const sessionId = this.readSessionId(req);
    if (!sessionId) return null;
    const raw = await this.cache.get(`${SESSION_KEY_PREFIX}${sessionId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  private async createSession(record: UserRecord, res: Response): Promise<void> {
    const sessionId = randomUUID();
    const payload: SessionPayload = {
      userId: record.id,
      firebaseUid: record.firebaseUid,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl,
      interviewCoins: record.interviewCoins,
    };
    await this.cache.setWithTtl(
      `${SESSION_KEY_PREFIX}${sessionId}`,
      JSON.stringify(payload),
      this.config.get('SESSION_TTL_SECONDS'),
    );
    res.cookie(
      SESSION_COOKIE_NAME,
      sessionId,
      sessionCookieOptions(this.config.isProd),
    );
  }

  private readSessionId(req: Request): string | undefined {
    const fromCookies = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof fromCookies === 'string' && fromCookies.trim()) {
      return fromCookies.trim();
    }
    return undefined;
  }

  private toDto(record: UserRecord): AuthUserDto {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl,
      interviewCoins: record.interviewCoins,
    };
  }
}
