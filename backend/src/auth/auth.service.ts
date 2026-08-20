import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TypedConfigService } from '../config/typed-config.service';
import { UsersService } from '../users/users.service';
import type { UserRecord } from '../users/users.store';
import { FirebaseAdminService } from './firebase-admin.service';
import { SessionService } from './session.service';
import type { SessionPayload } from './session.constants';

export interface AuthUserDto {
  id: string;
  firebaseUid: string;
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
    private readonly sessions: SessionService,
    private readonly config: TypedConfigService,
  ) {}

  /**
   * Exchanges a Firebase ID token for a server session.
   *
   * Identity comes exclusively from `verifyIdToken` — the request body only
   * ever carries the token itself, never uid/email/name.
   */
  async loginWithIdToken(
    idToken: string,
    res: Response,
  ): Promise<{ user: AuthUserDto }> {
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

    await this.sessions.createSession(this.toSession(record), res);
    return { user: this.toDto(record) };
  }

  /**
   * Reads the authoritative user from MongoDB and slides the session TTL so an
   * actively used session does not expire mid-visit.
   */
  async me(req: Request, firebaseUid: string): Promise<{ user: AuthUserDto }> {
    const record = await this.users.getMe(firebaseUid);
    if (!record) {
      throw new UnauthorizedException({
        message: 'Session user was not found.',
        error: 'UNAUTHORIZED',
      });
    }

    const sessionId = this.sessions.readSessionId(req);
    if (sessionId) {
      await this.sessions.refreshSession(sessionId, this.toSession(record));
    }

    return { user: this.toDto(record) };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const sessionId = this.sessions.readSessionId(req);
    if (sessionId) {
      await this.sessions.deleteSession(sessionId);
    }
    this.sessions.clearCookie(res);
    return { ok: true };
  }

  async readSession(req: Request): Promise<SessionPayload | null> {
    const sessionId = this.sessions.readSessionId(req);
    if (!sessionId) return null;
    return this.sessions.getSession(sessionId);
  }

  private toSession(record: UserRecord): SessionPayload {
    return {
      userId: record.id,
      firebaseUid: record.firebaseUid,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl,
      interviewCoins: record.interviewCoins,
    };
  }

  private toDto(record: UserRecord): AuthUserDto {
    return {
      id: record.id,
      firebaseUid: record.firebaseUid,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl,
      interviewCoins: record.interviewCoins,
    };
  }
}
