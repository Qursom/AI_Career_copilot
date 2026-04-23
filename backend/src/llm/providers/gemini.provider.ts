import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerateStructuredArgs, LlmProvider } from '../llm.interface';
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
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly opts: GeminiProviderOptions) {
    this.client = new GoogleGenerativeAI(opts.apiKey);
    this.modelName = opts.model;
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

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: system,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.45,
      },
    });

    const call = model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Return ONLY a JSON object matching the expected shape. ` +
                `Use the exact key names from the instructions. ` +
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
      try {
        raw = result.response.text();
      } catch (textErr) {
        throw new LlmUpstreamError(
          `Gemini call failed: ${textErr instanceof Error ? textErr.message : String(textErr)}`,
          textErr,
        );
      }
    } catch (err) {
      if (err instanceof LlmTimeoutError) throw err;
      if (err instanceof LlmUpstreamError) throw err;
      throw new LlmUpstreamError(
        `Gemini call failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!raw || !String(raw).trim()) {
      throw new LlmInvalidOutputError(
        'Gemini returned empty text. The response may be blocked or the model had no output.',
        raw,
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
