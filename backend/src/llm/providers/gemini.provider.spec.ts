import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LlmInvalidOutputError, LlmTimeoutError } from '../llm.interface';
import { GeminiProvider } from './gemini.provider';

const mockInvoke = jest.fn<Promise<unknown>, [unknown?]>();

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: () => {
      throw new Error('unit-test: skip native structured output');
    },
    invoke: (req: unknown) => mockInvoke(req),
  })),
}));

/** Opt-in: `GEMINI_LIVE_TEST=1` + `GEMINI_API_KEY` runs one real network call. */
const liveTestEnabled =
  process.env.GEMINI_LIVE_TEST === '1' && !!process.env.GEMINI_API_KEY?.trim();

const describeLive = liveTestEnabled ? describe : describe.skip;

describe('GeminiProvider (unit, mocked API)', () => {
  const tinySchema = z.object({ reply: z.string().min(1) });

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  afterEach(() => {
    mockInvoke.mockReset();
  });

  it('constructs LangChain ChatGoogleGenerativeAI', () => {
    new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-3.6-flash',
      defaultTimeoutMs: 30_000,
    });
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        model: 'gemini-3.6-flash',
        json: true,
      }),
    );
  });

  it('returns data when Gemini returns valid JSON for the schema', async () => {
    mockInvoke.mockResolvedValue({ content: '{"reply": "ok"}' });

    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-2.0-flash',
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

    const provider = new GeminiProvider({
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

  it('throws LlmInvalidOutputError when JSON does not match schema', async () => {
    mockInvoke.mockResolvedValue({ content: '{"wrong": true}' });

    const provider = new GeminiProvider({
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

  it('strips ```json fences when present', async () => {
    mockInvoke.mockResolvedValue({
      content: '```json\n{"reply":"fenced"}\n```',
    });

    const provider = new GeminiProvider({
      apiKey: 'k',
      model: 'm',
      defaultTimeoutMs: 30_000,
    });

    const out = await provider.generateStructured({
      system: 's',
      prompt: 'p',
      schema: tinySchema,
    });
    expect(out.reply).toBe('fenced');
  });

  it('throws LlmUpstreamError when generateContent fails', async () => {
    mockInvoke.mockRejectedValue(new Error('API boom'));

    const provider = new GeminiProvider({
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
      message: 'Gemini call failed: API boom',
    });
  });

  it('throws LlmTimeoutError when the call exceeds timeoutMs', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const provider = new GeminiProvider({
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

describeLive(
  'GeminiProvider (live API — set GEMINI_LIVE_TEST=1 + GEMINI_API_KEY)',
  () => {
    it('reaches the API and returns JSON matching a minimal schema', async () => {
      const schema = z.object({ hello: z.string().min(1) });
      const provider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY!,
        model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
        defaultTimeoutMs: 90_000,
      });

      const out = await provider.generateStructured({
        system:
          'Reply with a single JSON object with key "hello" and a one-word string value. No other keys.',
        prompt: 'Language: English.',
        schema,
        timeoutMs: 60_000,
      });

      expect(out.hello.length).toBeGreaterThan(0);
    });
  },
);
