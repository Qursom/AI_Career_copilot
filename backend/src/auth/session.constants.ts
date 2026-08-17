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

export function sessionCookieOptions(isProd: boolean) {
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
