import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CacheService } from '../cache/cache.service';
import type { TypedConfigService } from '../config/typed-config.service';
import type { UsersService } from '../users/users.service';
import type { UserRecord } from '../users/users.store';
import { AuthService } from './auth.service';
import type { FirebaseAdminService } from './firebase-admin.service';
import { SessionService } from './session.service';

const TTL = 604_800;

const IDENTITY = {
  uid: 'uid-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  picture: 'https://example.com/ada.png',
};

const NEW_USER: UserRecord = {
  id: 'mongo-1',
  firebaseUid: 'uid-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  photoUrl: 'https://example.com/ada.png',
  interviewCoins: 150,
};

/** Same identity, mid-way through spending coins. */
const RETURNING_USER: UserRecord = { ...NEW_USER, interviewCoins: 40 };

function build() {
  const firebase = { verifyIdToken: jest.fn() };
  const users = { findOrCreate: jest.fn(), getMe: jest.fn() };
  const redis = new Map<string, string>();
  const cache = {
    get: jest.fn((key: string) => Promise.resolve(redis.get(key) ?? null)),
    setWithTtl: jest.fn((key: string, value: string) => {
      redis.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      redis.delete(key);
      return Promise.resolve();
    }),
  };
  const config = {
    isProd: false,
    get: (key: string) =>
      key === 'SESSION_TTL_SECONDS'
        ? TTL
        : key === 'SESSION_COOKIE_SAMESITE'
          ? 'lax'
          : undefined,
  } as unknown as TypedConfigService;

  const sessions = new SessionService(cache as unknown as CacheService, config);
  const service = new AuthService(
    firebase as unknown as FirebaseAdminService,
    users as unknown as UsersService,
    sessions,
    config,
  );
  return { service, firebase, users, cache, redis, sessions };
}

type CookieCall = [name: string, value: string, options: unknown];

function res() {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const response = { cookie, clearCookie } as unknown as Response;
  return { response, cookie, clearCookie };
}

function firstCookieCall(cookie: jest.Mock): CookieCall {
  return (cookie.mock.calls as CookieCall[])[0];
}

/** Builds the request the browser would send back with the session cookie. */
function reqWithCookie(cookie: jest.Mock): Request {
  const [name, value] = firstCookieCall(cookie);
  return { cookies: { [name]: value } } as Request;
}

describe('AuthService', () => {
  describe('login', () => {
    it('registers a new user with the starting coin balance and opens a session', async () => {
      const { service, firebase, users, cache } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);
      const { response, cookie } = res();

      const out = await service.loginWithIdToken('firebase-id-token', response);

      expect(out.user).toEqual({
        id: 'mongo-1',
        firebaseUid: 'uid-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        photoUrl: 'https://example.com/ada.png',
        interviewCoins: 150,
      });
      expect(cache.setWithTtl).toHaveBeenCalled();
      expect(cookie).toHaveBeenCalledWith(
        'session_id',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });

    it('takes the identity from the verified token, never from the caller', async () => {
      const { service, firebase, users } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);

      await service.loginWithIdToken('firebase-id-token', res().response);

      expect(users.findOrCreate).toHaveBeenCalledWith({
        firebaseUid: IDENTITY.uid,
        email: IDENTITY.email,
        name: IDENTITY.name,
        photoUrl: IDENTITY.picture,
      });
    });

    it('reuses the existing user on a repeat login and does not reset coins', async () => {
      const { service, firebase, users } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(RETURNING_USER);

      const out = await service.loginWithIdToken(
        'firebase-id-token',
        res().response,
      );

      expect(out.user.id).toBe('mongo-1');
      expect(out.user.interviewCoins).toBe(40);
    });

    it('issues a fresh session id for every login', async () => {
      const { service, firebase, users } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);

      const first = res();
      const second = res();
      await service.loginWithIdToken('token', first.response);
      await service.loginWithIdToken('token', second.response);

      expect(firstCookieCall(first.cookie)[1]).not.toBe(
        firstCookieCall(second.cookie)[1],
      );
    });

    it('rejects an invalid Firebase ID token with 401 and no session', async () => {
      const { service, firebase, cache } = build();
      firebase.verifyIdToken.mockRejectedValue(new Error('token expired'));
      const { response, cookie } = res();

      await expect(
        service.loginWithIdToken('bad-token', response),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(cache.setWithTtl).not.toHaveBeenCalled();
      expect(cookie).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns the MongoDB user and slides the session TTL', async () => {
      const { service, firebase, users, cache } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);
      const { response, cookie } = res();
      await service.loginWithIdToken('token', response);
      const request = reqWithCookie(cookie);

      users.getMe.mockResolvedValue(RETURNING_USER);
      cache.setWithTtl.mockClear();

      const out = await service.me(request, 'uid-1');

      expect(out.user.interviewCoins).toBe(40);
      expect(cache.setWithTtl).toHaveBeenCalledWith(
        expect.stringContaining('session:'),
        expect.any(String),
        TTL,
      );
    });

    it('401s when the session points at a user that no longer exists', async () => {
      const { service, users } = build();
      users.getMe.mockResolvedValue(null);

      await expect(
        service.me({ cookies: {} } as Request, 'uid-1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('readSession', () => {
    it('resolves the session stored for the cookie', async () => {
      const { service, firebase, users } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);
      const { response, cookie } = res();
      await service.loginWithIdToken('token', response);

      await expect(service.readSession(reqWithCookie(cookie))).resolves.toEqual(
        {
          userId: 'mongo-1',
          firebaseUid: 'uid-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          photoUrl: 'https://example.com/ada.png',
          interviewCoins: 150,
        },
      );
    });

    it('resolves null without a cookie', async () => {
      const { service } = build();
      await expect(
        service.readSession({ cookies: {} } as Request),
      ).resolves.toBeNull();
    });

    it('resolves null for a session id that is not in Redis', async () => {
      const { service } = build();
      await expect(
        service.readSession({ cookies: { session_id: 'forged' } } as Request),
      ).resolves.toBeNull();
    });
  });

  describe('logout', () => {
    it('deletes the Redis session and clears the cookie', async () => {
      const { service, firebase, users, redis } = build();
      firebase.verifyIdToken.mockResolvedValue(IDENTITY);
      users.findOrCreate.mockResolvedValue(NEW_USER);
      const loginRes = res();
      await service.loginWithIdToken('token', loginRes.response);
      const request = reqWithCookie(loginRes.cookie);
      expect(redis.size).toBe(1);

      const logoutRes = res();
      await expect(
        service.logout(request, logoutRes.response),
      ).resolves.toEqual({
        ok: true,
      });

      expect(redis.size).toBe(0);
      expect(logoutRes.clearCookie).toHaveBeenCalledWith(
        'session_id',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      await expect(service.readSession(request)).resolves.toBeNull();
    });

    it('still clears the cookie when there is no session to delete', async () => {
      const { service } = build();
      const { response, clearCookie } = res();

      await expect(
        service.logout({ cookies: {} } as Request, response),
      ).resolves.toEqual({ ok: true });
      expect(clearCookie).toHaveBeenCalled();
    });
  });
});
