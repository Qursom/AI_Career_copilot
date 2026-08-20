/** True when a real Mongo connection string is configured. */
export function isMongoConfigured(
  uri: string | undefined | null = process.env.MONGODB_URI,
): boolean {
  const value = uri?.trim().toLowerCase();
  if (!value || value === 'none' || value === 'disabled') {
    return false;
  }
  return true;
}
