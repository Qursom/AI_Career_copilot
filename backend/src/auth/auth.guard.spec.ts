import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

function ctx(args: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const req = {
    header: (name: string) => args.headers?.[name.toLowerCase()],
    cookies: args.cookies ?? {},
    userId: undefined as string | undefined,
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

  it('attaches the Redis session user', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue({
      userId: 'mongo-1',
      firebaseUid: 'abc',
      name: 'Ada',
      email: 'a@b.c',
      photoUrl: '',
      interviewCoins: 100,
    });
    const guard = new AuthGuard(authService, {
      isProd: false,
      isTest: false,
    } as TypedConfigService);
    const context = ctx({ cookies: { session_id: 'sid' } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.req.userId).toBe('abc');
  });

  it('rejects in production when the session is missing', async () => {
    (authService.readSession as jest.Mock).mockResolvedValue(null);
    const guard = new AuthGuard(authService, {
      isProd: true,
      isTest: false,
    } as TypedConfigService);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
