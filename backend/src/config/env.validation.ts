import { EnvSchema, type Env } from './env.schema';

/**
 * Used by `@nestjs/config`'s `validate` option. Runs once at boot.
 * Throws with a human-readable message if env is invalid.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.LLM_PROVIDER === 'gemini' && !parsed.data.GEMINI_API_KEY) {
    throw new Error(
      'LLM_PROVIDER=gemini requires GEMINI_API_KEY to be set.',
    );
  }

  return parsed.data;
}
