import { isAllowedBrowserOrigin, parseCorsOrigins } from './cors-origins';

describe('parseCorsOrigins', () => {
  it('includes FRONTEND_URL and strips trailing slashes', () => {
    expect(
      parseCorsOrigins(
        'https://app.vercel.app/',
        'https://app.vercel.app',
      ),
    ).toEqual(['https://app.vercel.app']);
  });
});

describe('isAllowedBrowserOrigin', () => {
  it('allows Vercel preview hosts', () => {
    expect(
      isAllowedBrowserOrigin('https://career-git-main-user.vercel.app', []),
    ).toBe(true);
  });
});
