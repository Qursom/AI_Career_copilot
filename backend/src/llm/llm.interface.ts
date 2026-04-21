import type { ZodSchema } from 'zod';

export interface GenerateStructuredArgs<T> {
  /** High-level instruction for the model (system prompt). */
  system: string;
  /** The user-provided content to act on. */
  prompt: string;
  /** Zod schema the model's JSON output must conform to. */
  schema: ZodSchema<T>;
  /** Override the default timeout for this call. */
  timeoutMs?: number;
}

export interface LlmProvider {
  readonly name: string;
  /**
   * Asks the model to return JSON matching the given zod schema.
   * Throws `LlmTimeoutError`, `LlmInvalidOutputError`, or `LlmUpstreamError`.
   */
  generateStructured<T>(args: GenerateStructuredArgs<T>): Promise<T>;
}

export class LlmTimeoutError extends Error {
  readonly code = 'LLM_TIMEOUT' as const;
}

export class LlmInvalidOutputError extends Error {
  readonly code = 'LLM_INVALID_OUTPUT' as const;
  constructor(
    message: string,
    public readonly raw?: string,
  ) {
    super(message);
  }
}

export class LlmUpstreamError extends Error {
  readonly code = 'LLM_UPSTREAM' as const;
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
