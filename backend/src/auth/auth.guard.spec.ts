import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { FirebaseAdminService } from './firebase-admin.service';

function ctx(args: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const req = {
    header: (name: string) => args.headers?.[name.toLowerCase()],
    cookies: args.cookies ?? {},
    userId: undefined as string | undefined,
    userMongoId: undefined as string | undefined,
    userEmail: undefined as string | undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    req,
  } as unknown as ExecutionContext & { req: typeof req };
}

describe('AuthGuard (session)', () => {
  const authService = {
    readSession: jest.fn(),
  } as unknown as AuthService;

  const guardFor = (opts: {
    isProd?: boolean;
    isTest?: boolean;
    devBypass?: boolean;
    firebaseEnabled?: boolean;
  }) => {
    const config = {
      isProd: opts.isProd ?? false,
      isTest: opts.isTest ?? false,
      get: (key: string) =>
        key === 'AUTH_DEV_BYPASS' ? (opts.devBypass ?? false) : undefined,
    } as unknown as TypedConfigService;
    const firebase = {
      enabled: opts.firebaseEnabled ?? false,
    } as FirebaseAdminService;
    return new AuthGuard(authService, config, firebase);
  };

  beforeEach(() => {
    (authService.readSession as jest.Mock).mockReset();
  });

  it('attaches the Redis session user', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue({
      userId: 'mongo-1',
      firebaseUid: 'abc',
      name: 'Ada',
      email: 'a@b.c',
      photoUrl: '',
      interviewCoins: 150,
    });
    const context = ctx({ cookies: { session_id: 'sid' } });

    await expect(guardFor({}).canActivate(context)).resolves.toBe(true);
    expect(context.req.userId).toBe('abc');
    expect(context.req.userMongoId).toBe('mongo-1');
  });

  it('rejects in production when the session is missing', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);

    await expect(
      guardFor({ isProd: true }).canActivate(ctx({})),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects in production even when the bypass is switched on', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);

    await expect(
      guardFor({ isProd: true, devBypass: true }).canActivate(
        ctx({ headers: { 'x-user-id': 'attacker' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects x-user-id outside production while the bypass is off', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);

    await expect(
      guardFor({ devBypass: false }).canActivate(
        ctx({ headers: { 'x-user-id': 'attacker' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects x-user-id when Firebase Admin can issue real sessions', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);

    await expect(
      guardFor({ devBypass: true, firebaseEnabled: true }).canActivate(
        ctx({ headers: { 'x-user-id': 'attacker' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired or forged session cookie outside production', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);

    await expect(
      guardFor({ devBypass: true }).canActivate(
        ctx({ cookies: { session_id: 'expired' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('honours x-user-id once the bypass is explicitly enabled', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);
    const context = ctx({ headers: { 'x-user-id': 'local-dev-user' } });

    await expect(
      guardFor({ devBypass: true }).canActivate(context),
    ).resolves.toBe(true);
    expect(context.req.userId).toBe('local-dev-user');
    expect(context.req.userMongoId).toBeUndefined();
  });

  it('falls back to a fixed test user under NODE_ENV=test with the bypass on', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);
    const context = ctx({});

    await expect(
      guardFor({ isTest: true, devBypass: true }).canActivate(context),
    ).resolves.toBe(true);
    expect(context.req.userId).toBe('test-user');
  });
});
