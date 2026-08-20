import { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LlmInvalidOutputError, LlmTimeoutError } from '../llm.interface';
import {
  BaseLangChainProvider,
  isUnsupportedStructuredOutputError,
  type StructuredOutputMethod,
} from './base-langchain.provider';

class TestProvider extends BaseLangChainProvider {
  readonly name = 'test';
  constructor(
    protected readonly model: BaseChatModel,
    protected readonly defaultTimeoutMs: number,
    protected readonly preferNativeStructuredOutput = true,
    protected readonly structuredOutputMethod?: StructuredOutputMethod,
  ) {
    super();
  }
}

const tinySchema = z.object({ reply: z.string().min(1) });

describe('BaseLangChainProvider', () => {
  it('uses native withStructuredOutput by default', async () => {
    const structuredInvoke = jest.fn().mockResolvedValue({ reply: 'native' });
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: structuredInvoke,
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'native' });
    expect(model.withStructuredOutput).toHaveBeenCalledWith(
      tinySchema,
      expect.objectContaining({ name: 'structured_output' }),
    );
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it('passes structuredOutputMethod through to withStructuredOutput', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn().mockResolvedValue({ reply: 'ok' }),
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000, true, 'jsonMode');
    await provider.generateStructured({
      system: 's',
      prompt: 'p',
      schema: tinySchema,
    });
    expect(model.withStructuredOutput).toHaveBeenCalledWith(
      tinySchema,
      expect.objectContaining({ method: 'jsonMode' }),
    );
  });

  it('falls back to invoke + JSON parse when structured output cannot bind', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockImplementation(() => {
        throw new Error('json schema conversion failed');
      }),
      invoke: jest.fn().mockResolvedValue({
        content: '```json\n{"reply":"fallback"}\n```',
      }),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'fallback' });
  });

  it('falls back to JSON parse when native invoke reports unsupported json_schema', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest
          .fn()
          .mockRejectedValue(new Error('response_format json_schema is not supported')),
      }),
      invoke: jest.fn().mockResolvedValue({ content: '{"reply":"json"}' }),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'json' });
    expect(model.invoke).toHaveBeenCalled();
  });

  it('throws LlmInvalidOutputError when structured output fails Zod', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn().mockResolvedValue({ nope: true }),
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it('does not fall back to invoke when native structured output fails upstream', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn().mockRejectedValue(new Error('429 rate limit')),
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).rejects.toMatchObject({ message: 'test call failed: 429 rate limit' });
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it('throws LlmTimeoutError when invoke hangs', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockImplementation(() => {
        throw new Error('skip');
      }),
      invoke: jest.fn().mockReturnValue(new Promise(() => undefined)),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 60_000);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
        timeoutMs: 50,
      }),
    ).rejects.toBeInstanceOf(LlmTimeoutError);
  });

  it('skips native structured output when preferNativeStructuredOutput is false', async () => {
    const model = {
      withStructuredOutput: jest.fn(),
      invoke: jest.fn().mockResolvedValue({ content: '{"reply":"plain"}' }),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000, false);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'plain' });
    expect(model.withStructuredOutput).not.toHaveBeenCalled();
  });
});

describe('isUnsupportedStructuredOutputError', () => {
  it('detects json_schema / response_format rejections', () => {
    expect(
      isUnsupportedStructuredOutputError(
        new Error('response_format json_schema is not supported'),
      ),
    ).toBe(true);
  });

  it('does not treat rate limits as unsupported structured output', () => {
    expect(
      isUnsupportedStructuredOutputError(new Error('429 rate limit')),
    ).toBe(false);
  });
});
