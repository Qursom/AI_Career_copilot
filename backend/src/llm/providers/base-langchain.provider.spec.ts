import { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LlmInvalidOutputError, LlmTimeoutError } from '../llm.interface';
import { BaseLangChainProvider } from './base-langchain.provider';

class TestProvider extends BaseLangChainProvider {
  readonly name = 'test';
  constructor(
    protected readonly model: BaseChatModel,
    protected readonly defaultTimeoutMs: number,
    protected readonly preferNativeStructuredOutput = false,
  ) {
    super();
  }
}

const tinySchema = z.object({ reply: z.string().min(1) });

describe('BaseLangChainProvider', () => {
  it('prefers native withStructuredOutput when it returns valid data', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn().mockResolvedValue({ reply: 'native' }),
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000, true);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'native' });
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it('falls back to invoke + JSON parse when structured output is unavailable', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockImplementation(() => {
        throw new Error('not supported');
      }),
      invoke: jest.fn().mockResolvedValue({
        content: '```json\n{"reply":"fallback"}\n```',
      }),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000, true);
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'fallback' });
  });

  it('throws LlmInvalidOutputError when structured output fails Zod', async () => {
    const model = {
      withStructuredOutput: jest.fn().mockReturnValue({
        invoke: jest.fn().mockResolvedValue({ nope: true }),
      }),
      invoke: jest.fn(),
    } as unknown as BaseChatModel;

    const provider = new TestProvider(model, 5_000, true);
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

    const provider = new TestProvider(model, 5_000, true);
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
});
