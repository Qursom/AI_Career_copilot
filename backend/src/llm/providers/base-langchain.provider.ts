import { Logger } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ZodSchema } from 'zod';
import type { GenerateStructuredArgs, LlmProvider } from '../llm.interface';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm.interface';

const JSON_INSTRUCTION =
  'Return ONLY a JSON object matching the expected shape. Use the exact key names from the instructions. No preamble, no markdown fences.';

export type StructuredOutputMethod =
  | 'jsonSchema'
  | 'jsonMode'
  | 'functionCalling';

/**
 * Shared LangChain chat path for Gemini and Groq.
 *
 * Native `withStructuredOutput` is the default. If the provider cannot bind
 * the Zod schema (transforms, unsupported json_schema, etc.) or the API
 * rejects structured-output mode, we fall back to invoke + JSON parse + Zod.
 * Rate limits, auth failures, and timeouts are not retried as a second call.
 */
export abstract class BaseLangChainProvider implements LlmProvider {
  abstract readonly name: string;
  protected abstract readonly model: BaseChatModel;
  protected abstract readonly defaultTimeoutMs: number;
  protected readonly preferNativeStructuredOutput = true;
  /** Passed to LangChain `withStructuredOutput`. Undefined = provider default. */
  protected readonly structuredOutputMethod?: StructuredOutputMethod;
  private readonly structuredLogger = new Logger(BaseLangChainProvider.name);

  async generateStructured<T>({
    system,
    prompt,
    schema,
    timeoutMs,
  }: GenerateStructuredArgs<T>): Promise<T> {
    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
    const messages = [
      new SystemMessage(`${system}\n\n${JSON_INSTRUCTION}`),
      new HumanMessage(prompt),
    ];

    const structured = this.bindStructuredOutput(schema);
    if (structured) {
      try {
        const raw = await withTimeout(
          structured.invoke(messages),
          effectiveTimeout,
        );
        const validated = schema.safeParse(raw);
        if (validated.success) return validated.data;
        throw new LlmInvalidOutputError(
          `${this.errorLabel} structured output did not match the expected schema: ` +
            formatZodIssues(validated.error),
          stringifyUnknown(raw),
        );
      } catch (err) {
        if (
          err instanceof LlmTimeoutError ||
          err instanceof LlmInvalidOutputError
        ) {
          throw err;
        }
        if (isUnsupportedStructuredOutputError(err)) {
          this.structuredLogger.warn(
            `${this.errorLabel} native structured output is unavailable; falling back to JSON parse. ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        } else {
          throw new LlmUpstreamError(
            `${this.errorLabel} call failed: ${err instanceof Error ? err.message : String(err)}`,
            err,
          );
        }
      }
    }

    let raw: string;
    try {
      const result = await withTimeout(
        this.model.invoke(messages),
        effectiveTimeout,
      );
      raw = messageContentToText(result.content);
    } catch (err) {
      if (err instanceof LlmTimeoutError) throw err;
      throw new LlmUpstreamError(
        `${this.errorLabel} call failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    return parseAndValidateJson(raw, schema, this.errorLabel);
  }

  /** Human-readable prefix used in upstream / invalid-output errors. */
  protected get errorLabel(): string {
    if (this.name === 'gemini') return 'Gemini';
    if (this.name === 'groq') return 'Groq';
    return this.name;
  }

  private bindStructuredOutput<T>(
    schema: ZodSchema<T>,
  ): { invoke: (input: unknown) => Promise<unknown> } | null {
    if (!this.preferNativeStructuredOutput) return null;
    try {
      const options = this.structuredOutputMethod
        ? { name: 'structured_output', method: this.structuredOutputMethod }
        : { name: 'structured_output' };
      return this.model.withStructuredOutput(
        schema as never,
        options as never,
      );
    } catch (err) {
      this.structuredLogger.debug(
        `${this.errorLabel} withStructuredOutput bind failed; using JSON parse. ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}

export function parseAndValidateJson<T>(
  raw: string,
  schema: ZodSchema<T>,
  label: string,
): T {
  if (!raw?.trim()) {
    throw new LlmInvalidOutputError(
      `${label} returned empty text. The response may be blocked or the model had no output.`,
      raw,
    );
  }

  const parsedJson = tryParseJson(raw);
  if (parsedJson === undefined) {
    throw new LlmInvalidOutputError(`${label} response was not valid JSON.`, raw);
  }

  const validated = schema.safeParse(parsedJson);
  if (!validated.success) {
    throw new LlmInvalidOutputError(
      `${label} output did not match the expected schema: ` +
        formatZodIssues(validated.error),
      raw,
    );
  }

  return validated.data;
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LlmTimeoutError(`LLM call exceeded ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e as Error);
      },
    );
  });
}

export function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function messageContentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  return content == null ? '' : JSON.stringify(content);
}

/** True when the API/SDK cannot do structured output, so JSON parse is valid. */
export function isUnsupportedStructuredOutputError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (/\b(401|403|429)\b/.test(message)) return false;
  if (lower.includes('rate limit') || lower.includes('quota')) return false;
  if (lower.includes('api key') || lower.includes('unauthorized')) return false;
  return (
    lower.includes('json_schema') ||
    lower.includes('json schema') ||
    lower.includes('jsonmode') ||
    lower.includes('json mode') ||
    lower.includes('response_format') ||
    lower.includes('response schema') ||
    lower.includes('structured output') ||
    (lower.includes('not supported') &&
      (lower.includes('json') ||
        lower.includes('tool') ||
        lower.includes('schema') ||
        lower.includes('function')))
  );
}

function formatZodIssues(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  return error.issues
    .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join('; ');
}

function stringifyUnknown(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
