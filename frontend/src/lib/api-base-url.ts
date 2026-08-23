/**
 * Vercel often has NEXT_PUBLIC_API_URL set to the Render host without /api/v1.
 * Login then posts to https://host/auth/login instead of /api/v1/auth/login.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:3001/api/v1';
  let url = (raw ?? fallback).trim();
  if (!url) url = fallback;
  url = url.replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(url)) return url;
  if (/\/api$/i.test(url)) return `${url}/v1`;
  return `${url}/api/v1`;
}
