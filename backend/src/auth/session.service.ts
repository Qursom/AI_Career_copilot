import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_KEY_PREFIX,
  sessionCookieOptions,
  type SessionPayload,
} from './session.constants';

/** 256 bits of CSPRNG entropy, url-safe so it survives a cookie round-trip. */
const SESSION_ID_BYTES = 32;

/**
 * Owns the `session:{id}` Redis records and the `session_id` cookie.
 *
 * Session ids are opaque random strings — never the Firebase UID, never a
 * Mongo id — so a leaked cookie cannot be reversed into a user identity, and
 * they are never logged.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly cache: CacheService,
    private readonly config: TypedConfigService,
  ) {}

  get ttlSeconds(): number {
    return this.config.get('SESSION_TTL_SECONDS');
  }

  /** Creates a Redis session and writes the HTTP-only cookie. */
  async createSession(payload: SessionPayload, res: Response): Promise<string> {
    const sessionId = randomBytes(SESSION_ID_BYTES).toString('base64url');
    await this.cache.setWithTtl(
      this.key(sessionId),
      JSON.stringify(payload),
      this.ttlSeconds,
    );
    res.cookie(SESSION_COOKIE_NAME, sessionId, this.cookieOptions());
    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionPayload | null> {
    const raw = await this.cache.get(this.key(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      // Corrupt entry — treat as no session rather than 500ing the request.
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.cache.del(this.key(sessionId));
  }

  /** Slides the TTL forward (and refreshes the payload) for an active user. */
  async refreshSession(
    sessionId: string,
    payload: SessionPayload,
  ): Promise<void> {
    await this.cache.setWithTtl(
      this.key(sessionId),
      JSON.stringify(payload),
      this.ttlSeconds,
    );
  }

  clearCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, this.cookieOptions());
  }

  readSessionId(req: Request): string | undefined {
    const raw: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  }

  private cookieOptions() {
    return sessionCookieOptions({
      isProd: this.config.isProd,
      sameSite: this.config.get('SESSION_COOKIE_SAMESITE'),
      ttlSeconds: this.ttlSeconds,
    });
  }

  private key(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }
}
