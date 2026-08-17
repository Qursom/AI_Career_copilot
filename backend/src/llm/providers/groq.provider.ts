import { Logger } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { GenerateStructuredArgs, LlmProvider } from '../llm.interface';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm.interface';

export interface GroqProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

export class GroqLangChainProvider implements LlmProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqLangChainProvider.name);
  private readonly model: ChatGroq;

  constructor(private readonly opts: GroqProviderOptions) {
    this.model = new ChatGroq({
      apiKey: opts.apiKey,
      model: opts.model,
      temperature: 0.4,
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
      `groq.generateStructured model=${this.opts.model} timeout=${effectiveTimeout}ms`,
    );

    const call = this.model.invoke([
      new SystemMessage(
        `${system}\n\nReturn ONLY a JSON object matching the expected shape. No markdown fences.`,
      ),
      new HumanMessage(prompt),
    ]);

    let raw: string;
    try {
      const result = await withTimeout(call, effectiveTimeout);
      raw = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    } catch (err) {
      if (err instanceof LlmTimeoutError) throw err;
      throw new LlmUpstreamError(
        `Groq call failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!raw?.trim()) {
      throw new LlmInvalidOutputError('Groq returned empty text.', raw);
    }

    const parsedJson = tryParseJson(raw);
    if (parsedJson === undefined) {
      throw new LlmInvalidOutputError('Groq response was not valid JSON.', raw);
    }

    const validated = schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new LlmInvalidOutputError(
        'Groq output did not match the expected schema: ' +
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
