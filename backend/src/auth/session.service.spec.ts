import type { Request, Response } from 'express';
import type { CacheService } from '../cache/cache.service';
import type { TypedConfigService } from '../config/typed-config.service';
import { SESSION_COOKIE_NAME, type SessionPayload } from './session.constants';
import { SessionService } from './session.service';

const TTL = 604_800;

const payload: SessionPayload = {
  userId: 'mongo-1',
  firebaseUid: 'uid-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  photoUrl: 'https://example.com/ada.png',
  interviewCoins: 150,
};

function build(overrides?: { isProd?: boolean; sameSite?: string }) {
  const store = new Map<string, string>();
  const cache = {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setWithTtl: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
  const config = {
    isProd: overrides?.isProd ?? false,
    get: (key: string) =>
      key === 'SESSION_TTL_SECONDS'
        ? TTL
        : key === 'SESSION_COOKIE_SAMESITE'
          ? (overrides?.sameSite ?? 'lax')
          : undefined,
  };
  const service = new SessionService(
    cache as unknown as CacheService,
    config as unknown as TypedConfigService,
  );
  return { service, cache, store };
}

function res() {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const response = { cookie, clearCookie } as unknown as Response;
  return { response, cookie, clearCookie };
}

describe('SessionService', () => {
  it('creates a session in Redis with a TTL and sets an HTTP-only cookie', async () => {
    const { service, cache } = build();
    const { response, cookie } = res();

    const sessionId = await service.createSession(payload, response);

    expect(cache.setWithTtl).toHaveBeenCalledWith(
      `session:${sessionId}`,
      JSON.stringify(payload),
      TTL,
    );
    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      sessionId,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: TTL * 1000,
      }),
    );
  });

  it('issues unguessable session ids that are not the user identity', async () => {
    const { service } = build();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(await service.createSession(payload, res().response));
    }

    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).not.toContain(payload.firebaseUid);
      expect(id).not.toContain(payload.userId);
      // 32 random bytes → 43 base64url characters.
      expect(id).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('marks the cookie secure in production', async () => {
    const { service } = build({ isProd: true });
    const { response, cookie } = res();

    await service.createSession(payload, response);

    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

  it('forces a secure cookie when SameSite=None', async () => {
    const { service } = build({ isProd: false, sameSite: 'none' });
    const { response, cookie } = res();

    await service.createSession(payload, response);

    expect(cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ sameSite: 'none', secure: true }),
    );
  });

  it('reads a stored session back', async () => {
    const { service } = build();
    const sessionId = await service.createSession(payload, res().response);

    await expect(service.getSession(sessionId)).resolves.toEqual(payload);
  });

  it('returns null for an unknown or expired session', async () => {
    const { service } = build();
    await expect(service.getSession('does-not-exist')).resolves.toBeNull();
  });

  it('returns null instead of throwing on a corrupt session record', async () => {
    const { service, store } = build();
    store.set('session:broken', '{not json');

    await expect(service.getSession('broken')).resolves.toBeNull();
  });

  it('deletes a session so it can no longer be read', async () => {
    const { service } = build();
    const sessionId = await service.createSession(payload, res().response);

    await service.deleteSession(sessionId);

    await expect(service.getSession(sessionId)).resolves.toBeNull();
  });

  it('slides the TTL forward on refresh', async () => {
    const { service, cache } = build();
    const sessionId = await service.createSession(payload, res().response);
    cache.setWithTtl.mockClear();

    const updated = { ...payload, interviewCoins: 140 };
    await service.refreshSession(sessionId, updated);

    expect(cache.setWithTtl).toHaveBeenCalledWith(
      `session:${sessionId}`,
      JSON.stringify(updated),
      TTL,
    );
    await expect(service.getSession(sessionId)).resolves.toEqual(updated);
  });

  it('clears the cookie with the attributes it was set with', () => {
    const { service } = build({ isProd: true });
    const { response, clearCookie } = res();

    service.clearCookie(response);

    expect(clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('reads the session id from the cookie and ignores blanks', () => {
    const { service } = build();

    expect(
      service.readSessionId({ cookies: { session_id: ' abc ' } } as Request),
    ).toBe('abc');
    expect(
      service.readSessionId({ cookies: { session_id: '  ' } } as Request),
    ).toBeUndefined();
    expect(service.readSessionId({ cookies: {} } as Request)).toBeUndefined();
  });
});
