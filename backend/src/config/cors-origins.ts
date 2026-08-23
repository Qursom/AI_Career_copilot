/** Strip trailing slashes so `https://app.vercel.app/` matches the browser Origin. */
export function stripOrigin(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function parseCorsOrigins(
  corsOrigin: string,
  frontendUrl?: string,
): string[] {
  const values = [...corsOrigin.split(','), frontendUrl ?? '']
    .map(stripOrigin)
    .filter((value) => value.length > 0 && value !== '*');
  return [...new Set(values)];
}

export function isAllowedBrowserOrigin(
  origin: string | undefined,
  allowlist: string[],
): boolean {
  if (!origin) return true;
  const normalized = stripOrigin(origin);
  if (allowlist.includes(normalized)) return true;
  try {
    const { hostname } = new URL(normalized);
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}
