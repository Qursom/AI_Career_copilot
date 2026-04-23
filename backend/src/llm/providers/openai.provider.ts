import { Logger } from '@nestjs/common';
import OpenAI, { APIError } from 'openai';
import type { GenerateStructuredArgs, LlmProvider } from '../llm.interface';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm.interface';

export interface OpenaiProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
  maxCompletionTokens: number;
}

/**
 * OpenAI Chat Completions with `response_format: json_object` and Zod validation.
 */
export class OpenaiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenaiProvider.name);
  private readonly client: OpenAI;

  constructor(private readonly opts: OpenaiProviderOptions) {
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      maxRetries: 0,
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
      `openai.generateStructured model=${this.opts.model} timeout=${effectiveTimeout}ms input=${prompt.length} chars`,
    );

    const userText = [
      'Return ONLY one JSON object matching the expected shape from the system instructions.',
      'No markdown fences, no commentary before or after the JSON.',
      '',
      'USER INPUT:',
      prompt,
    ].join('\n');

    const call = this.client.chat.completions.create({
      model: this.opts.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.45,
      max_completion_tokens: this.opts.maxCompletionTokens,
    });

    let raw: string;
    try {
      const completion = await withTimeout(call, effectiveTimeout);
      const content = completion.choices[0]?.message?.content;
      const refusal = (completion.choices[0]?.message as { refusal?: string })
        ?.refusal;
      if (refusal) {
        throw new LlmUpstreamError(
          `OpenAI call failed: model refused — ${refusal}`,
          completion,
        );
      }
      if (content == null || !String(content).trim()) {
        throw new LlmUpstreamError(
          'OpenAI returned empty content.',
          completion,
        );
      }
      raw = String(content);
    } catch (err) {
      if (err instanceof LlmTimeoutError) throw err;
      if (err instanceof LlmUpstreamError) throw err;
      if (err instanceof APIError) {
        throw new LlmUpstreamError(
          `OpenAI call failed: [${String(err.status)}] ${err.message}`,
          err,
        );
      }
      throw new LlmUpstreamError(
        `OpenAI call failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const parsedJson = tryParseJson(raw);
    if (parsedJson === undefined) {
      throw new LlmInvalidOutputError(
        'OpenAI response was not valid JSON.',
        raw,
      );
    }

    const validated = schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new LlmInvalidOutputError(
        'OpenAI output did not match the expected schema: ' +
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
