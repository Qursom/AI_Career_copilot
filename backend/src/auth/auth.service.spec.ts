import { AuthService } from './auth.service';
import type { CacheService } from '../cache/cache.service';
import type { TypedConfigService } from '../config/typed-config.service';
import type { UsersService } from '../users/users.service';
import type { FirebaseAdminService } from './firebase-admin.service';
import type { Response } from 'express';

describe('AuthService', () => {
  const firebase = {
    verifyIdToken: jest.fn(),
  };
  const users = {
    findOrCreate: jest.fn(),
    getMe: jest.fn(),
  };
  const cache = {
    setWithTtl: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    isProd: false,
    get: (key: string) => (key === 'SESSION_TTL_SECONDS' ? 604800 : undefined),
  };

  const service = new AuthService(
    firebase as unknown as FirebaseAdminService,
    users as unknown as UsersService,
    cache as unknown as CacheService,
    config as unknown as TypedConfigService,
  );

  it('creates a user session cookie after verifying the Firebase token', async () => {
    firebase.verifyIdToken.mockResolvedValue({
      uid: 'uid-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
    });
    users.findOrCreate.mockResolvedValue({
      id: 'mongo-1',
      firebaseUid: 'uid-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      photoUrl: 'https://example.com/ada.png',
      interviewCoins: 150,
    });
    const res = { cookie: jest.fn() } as unknown as Response;

    const out = await service.loginWithIdToken('firebase-id-token-value', res);

    expect(out.user.email).toBe('ada@example.com');
    expect(out.user.interviewCoins).toBe(150);
    expect(cache.setWithTtl).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'session_id',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });
});
