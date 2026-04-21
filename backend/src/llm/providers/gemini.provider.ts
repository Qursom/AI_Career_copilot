import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  GenerateStructuredArgs,
  LlmProvider,
} from '../llm.interface';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm.interface';

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

/**
 * Gemini provider that forces JSON output (`responseMimeType`) and validates
 * against the caller-supplied zod schema. Timeouts are enforced client-side.
 */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly model: GenerativeModel;

  constructor(private readonly opts: GeminiProviderOptions) {
    const client = new GoogleGenerativeAI(opts.apiKey);
    this.model = client.getGenerativeModel({
      model: opts.model,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });
  }

  async generateStructured<T>({
    system,
    prompt,
    schema,
    timeoutMs,
  }: GenerateStructuredArgs<T>): Promise<T> {
    const effectiveTimeout = timeoutMs ?? this.opts.defaultTimeoutMs;
    this.logger.debug(
      `gemini.generateStructured model=${this.opts.model} timeout=${effectiveTimeout}ms input=${prompt.length} chars`,
    );

    const call = this.model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `SYSTEM INSTRUCTIONS:\n${system}\n\n` +
                `Return ONLY a JSON object matching the expected shape. ` +
                `No preamble, no markdown fences.\n\n` +
                `USER INPUT:\n${prompt}`,
            },
          ],
        },
      ],
    });

    let raw: string;
    try {
      const result = await withTimeout(call, effectiveTimeout);
      raw = result.response.text();
    } catch (err) {
      if (err instanceof LlmTimeoutError) throw err;
      throw new LlmUpstreamError(
        `Gemini call failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const parsedJson = tryParseJson(raw);
    if (parsedJson === undefined) {
      throw new LlmInvalidOutputError(
        'Gemini response was not valid JSON.',
        raw,
      );
    }

    const validated = schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new LlmInvalidOutputError(
        'Gemini output did not match the expected schema: ' +
          validated.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        raw,
      );
    }

    return validated.data;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
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

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}
