import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { LLM_PROVIDER } from '../llm/llm.tokens';
import { MockLlmProvider } from '../llm/providers/mock.provider';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeService } from './resume.service';
import { RESUME_STORE } from './resume.store';

const extraFields = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '',
  summary: 'Senior frontend engineer with shipped product work.',
  skills: ['TypeScript', 'React'],
  projects: ['Design system'],
  experience: ['5+ years frontend'],
  education: ['BSc CS'],
  weaknesses: ['Limited GraphQL'],
  recommendations: ['Quantify mentoring impact'],
  suggestedJobRole: 'Senior Frontend Engineer',
};

describe('ResumeService', () => {
  const buildService = async (
    generateStructured: jest.Mock,
    options?: { providerName?: string },
  ): Promise<{
    service: ResumeService;
    llm: { providerName: string; generateStructured: jest.Mock };
  }> => {
    const llmMock = {
      providerName: options?.providerName ?? 'mock',
      generateStructured,
    };
    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: LLM_PROVIDER, useClass: MockLlmProvider },
        LlmService,
        {
          provide: RagService,
          useValue: {
            buildResumeContext: jest.fn().mockResolvedValue({
              promptContext:
                'RAG EVIDENCE: skill expectations from public datasets',
              marketSignals: ['signal'],
              priorityGaps: ['gap'],
              citations: ['citation'],
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            ensureUser: jest.fn().mockResolvedValue({ interviewCoins: 100 }),
            chargeResumeAnalysis: jest
              .fn()
              .mockResolvedValue({ interviewCoins: 90 }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PdfExtractService,
          useValue: {
            extractText: jest.fn(),
            unlink: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RESUME_STORE,
          useValue: {
            upsert: jest.fn(async (_id: string, a: unknown) => a),
            findByUserId: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    })
      .overrideProvider(LlmService)
      .useValue(llmMock)
      .compile();

    return { service: module.get(ResumeService), llm: llmMock };
  };

  const validInput = {
    resume:
      'Jane Doe — Senior Frontend Engineer with 5+ years of TypeScript, React, and design systems work across fintech and developer tools.',
    role: 'Senior Frontend Engineer',
  };

  it('returns a validated analysis on success', async () => {
    const fake = {
      ...extraFields,
      roast: 'x'.repeat(30),
      strengths: ['Strong TypeScript background', 'Shipped design systems'],
      improvements: ['Quantify mentoring impact', 'Replace weak verbs'],
      missingSkills: ['GraphQL', 'Accessibility (WCAG 2.2)'],
      marketSignals: ['Market asks for WCAG + measurable impact metrics'],
      priorityGaps: ['Accessibility (WCAG 2.2) is market-priority'],
      citations: ['ESCO framework (https://esco.ec.europa.eu/)'],
      optimized: 'y'.repeat(30),
      atsScore: 72,
      atsNotes: 'Notes that are long enough to pass validation.',
    };
    let capturedPrompt = '';
    const llmCall = jest.fn().mockImplementation((args: unknown) => {
      if (
        args &&
        typeof args === 'object' &&
        'prompt' in args &&
        typeof (args as { prompt?: unknown }).prompt === 'string'
      ) {
        capturedPrompt = (args as { prompt: string }).prompt;
      }
      return Promise.resolve(fake);
    });
    const { service, llm } = await buildService(llmCall);

    await expect(service.analyze(validInput)).resolves.toEqual({
      ...fake,
      marketSignals: ['signal'],
      priorityGaps: ['gap'],
      citations: ['citation'],
    });
    expect(llm.generateStructured).toHaveBeenCalled();
    expect(capturedPrompt).toContain('RAG EVIDENCE');
  });

  it('when provider is gemini, prefers LLM marketSignals, priorityGaps, citations', async () => {
    const fake = {
      ...extraFields,
      roast: 'x'.repeat(30),
      strengths: ['a'],
      improvements: ['b'],
      missingSkills: ['c'],
      marketSignals: ['from LLM'],
      priorityGaps: ['from LLM gap'],
      citations: ['from LLM cite'],
      optimized: 'y'.repeat(30),
      atsScore: 72,
      atsNotes: 'Notes that are long enough to pass validation.',
    };
    const llmCall = jest.fn().mockResolvedValue(fake);
    const { service } = await buildService(llmCall, { providerName: 'gemini' });
    await expect(service.analyze(validInput)).resolves.toEqual(fake);
  });

  it('when mock and RAG empty, keeps LLM RAG fields', async () => {
    const fake = {
      ...extraFields,
      roast: 'x'.repeat(30),
      strengths: ['a'],
      improvements: ['b'],
      missingSkills: ['c'],
      marketSignals: ['mock market'],
      priorityGaps: ['mock gap'],
      citations: ['mock cite'],
      optimized: 'y'.repeat(30),
      atsScore: 72,
      atsNotes: 'Notes that are long enough to pass validation.',
    };
    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: LLM_PROVIDER, useClass: MockLlmProvider },
        LlmService,
        {
          provide: RagService,
          useValue: {
            buildResumeContext: jest.fn().mockResolvedValue({
              promptContext: '',
              marketSignals: [],
              priorityGaps: [],
              citations: [],
            }),
          },
        },
        { provide: UsersService, useValue: {} },
        { provide: CacheService, useValue: {} },
        { provide: PdfExtractService, useValue: {} },
        { provide: RESUME_STORE, useValue: {} },
      ],
    })
      .overrideProvider(LlmService)
      .useValue({
        providerName: 'mock',
        generateStructured: jest.fn().mockResolvedValue(fake),
      })
      .compile();
    const service = module.get(ResumeService);
    await expect(service.analyze(validInput)).resolves.toEqual(fake);
  });

  it('maps LlmTimeoutError to ServiceUnavailableException', async () => {
    const { service } = await buildService(
      jest.fn().mockRejectedValue(new LlmTimeoutError('too slow')),
    );
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps LlmInvalidOutputError to ServiceUnavailableException', async () => {
    const { service } = await buildService(
      jest.fn().mockRejectedValue(new LlmInvalidOutputError('bad shape')),
    );
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps LlmUpstreamError to ServiceUnavailableException', async () => {
    const { service } = await buildService(
      jest.fn().mockRejectedValue(new LlmUpstreamError('upstream boom')),
    );
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rethrows unknown errors untouched', async () => {
    const { service } = await buildService(
      jest.fn().mockRejectedValue(new Error('boom')),
    );
    await expect(service.analyze(validInput)).rejects.toThrow('boom');
  });
});
