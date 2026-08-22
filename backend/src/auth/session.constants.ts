import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'session_id';
export const SESSION_KEY_PREFIX = 'session:';

export interface SessionPayload {
  userId: string;
  firebaseUid: string;
  name: string;
  email: string;
  photoUrl: string;
  interviewCoins: number;
}

export type SessionSameSite = 'lax' | 'strict' | 'none';

export interface SessionCookieConfig {
  isProd: boolean;
  sameSite: SessionSameSite;
  ttlSeconds: number;
  domain?: string;
}

/**
 * Single source of truth for the cookie attributes. `logout` must clear the
 * cookie with the same name/path/sameSite/secure it was set with, otherwise
 * browsers keep the stale cookie.
 */
export function sessionCookieOptions(cfg: SessionCookieConfig): CookieOptions {
  // SameSite=None is only honoured on secure cookies.
  const secure = cfg.isProd || cfg.sameSite === 'none';
  return {
    httpOnly: true,
    secure,
    sameSite: cfg.sameSite,
    maxAge: cfg.ttlSeconds * 1000,
    path: '/',
    ...(cfg.domain ? { domain: cfg.domain } : {}),
  };
}
