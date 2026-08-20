import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { LlmInvalidOutputError, LlmTimeoutError } from '../llm.interface';
import { GroqLangChainProvider } from './groq.provider';

const mockInvoke = jest.fn<Promise<unknown>, [unknown?]>();
const mockWithStructuredOutput = jest.fn();

jest.mock('@langchain/groq', () => ({
  ChatGroq: jest.fn().mockImplementation(() => ({
    withStructuredOutput: (...args: unknown[]) => mockWithStructuredOutput(...args),
    invoke: (req: unknown) => mockInvoke(req),
  })),
}));

describe('GroqLangChainProvider (unit, mocked API)', () => {
  const tinySchema = z.object({ reply: z.string().min(1) });

  beforeEach(() => {
    mockInvoke.mockReset();
    mockWithStructuredOutput.mockReset();
    mockWithStructuredOutput.mockImplementation(() => {
      throw new Error('unit-test: skip native structured output');
    });
  });

  it('constructs LangChain ChatGroq', () => {
    new GroqLangChainProvider({
      apiKey: 'test-key',
      model: 'openai/gpt-oss-20b',
      defaultTimeoutMs: 30_000,
    });
    expect(ChatGroq).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-20b',
      }),
    );
  });

  it('binds jsonMode structured output', async () => {
    mockWithStructuredOutput.mockReturnValue({
      invoke: jest.fn().mockResolvedValue({ reply: 'native' }),
    });

    const provider = new GroqLangChainProvider({
      apiKey: 'k',
      model: 'm',
      defaultTimeoutMs: 30_000,
    });
    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).resolves.toEqual({ reply: 'native' });
    expect(mockWithStructuredOutput).toHaveBeenCalledWith(
      tinySchema,
      expect.objectContaining({ method: 'jsonMode' }),
    );
  });

  it('returns data when Groq returns valid JSON for the schema', async () => {
    mockInvoke.mockResolvedValue({ content: '{"reply": "ok"}' });

    const provider = new GroqLangChainProvider({
      apiKey: 'test-key',
      model: 'openai/gpt-oss-20b',
      defaultTimeoutMs: 30_000,
    });

    const out = await provider.generateStructured({
      system: 'You output JSON only.',
      prompt: 'Ping.',
      schema: tinySchema,
    });

    expect(out).toEqual({ reply: 'ok' });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('throws LlmInvalidOutputError when response is not JSON', async () => {
    mockInvoke.mockResolvedValue({ content: 'not json' });

    const provider = new GroqLangChainProvider({
      apiKey: 'k',
      model: 'm',
      defaultTimeoutMs: 30_000,
    });

    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });

  it('throws LlmUpstreamError when ChatGroq invoke fails', async () => {
    mockInvoke.mockRejectedValue(new Error('API boom'));

    const provider = new GroqLangChainProvider({
      apiKey: 'k',
      model: 'm',
      defaultTimeoutMs: 30_000,
    });

    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
      }),
    ).rejects.toMatchObject({
      message: 'Groq call failed: API boom',
    });
  });

  it('throws LlmTimeoutError when the call exceeds timeoutMs', async () => {
    mockInvoke.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const provider = new GroqLangChainProvider({
      apiKey: 'k',
      model: 'm',
      defaultTimeoutMs: 60_000,
    });

    await expect(
      provider.generateStructured({
        system: 's',
        prompt: 'p',
        schema: tinySchema,
        timeoutMs: 80,
      }),
    ).rejects.toBeInstanceOf(LlmTimeoutError);
  });
});
