import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { LLM_PROVIDER } from '../llm/llm.tokens';
import { MockLlmProvider } from '../llm/providers/mock.provider';
import { ResumeService } from './resume.service';

describe('ResumeService', () => {
  const buildService = async (
    override?: Partial<LlmService>,
  ): Promise<ResumeService> => {
    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: LLM_PROVIDER, useClass: MockLlmProvider },
        LlmService,
      ],
    })
      .overrideProvider(LlmService)
      .useValue({
        providerName: 'mock',
        generateStructured: jest.fn(),
        ...override,
      })
      .compile();

    return module.get(ResumeService);
  };

  const validInput = {
    resume:
      'Jane Doe — Senior Frontend Engineer with 5+ years of TypeScript, React, and design systems work across fintech and developer tools.',
    role: 'Senior Frontend Engineer',
  };

  it('returns a validated analysis on success', async () => {
    const fake = {
      roast: 'x'.repeat(30),
      strengths: ['Strong TypeScript background', 'Shipped design systems'],
      improvements: ['Quantify mentoring impact', 'Replace weak verbs'],
      missingSkills: ['GraphQL', 'Accessibility (WCAG 2.2)'],
      optimized: 'y'.repeat(30),
      atsScore: 72,
      atsNotes: 'Notes that are long enough to pass validation.',
    };
    const service = await buildService({
      generateStructured: jest.fn().mockResolvedValue(fake),
    });

    await expect(service.analyze(validInput)).resolves.toEqual(fake);
  });

  it('maps LlmTimeoutError to ServiceUnavailableException', async () => {
    const service = await buildService({
      generateStructured: jest
        .fn()
        .mockRejectedValue(new LlmTimeoutError('too slow')),
    });
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps LlmInvalidOutputError to ServiceUnavailableException', async () => {
    const service = await buildService({
      generateStructured: jest
        .fn()
        .mockRejectedValue(new LlmInvalidOutputError('bad shape')),
    });
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps LlmUpstreamError to ServiceUnavailableException', async () => {
    const service = await buildService({
      generateStructured: jest
        .fn()
        .mockRejectedValue(new LlmUpstreamError('upstream boom')),
    });
    await expect(service.analyze(validInput)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rethrows unknown errors untouched', async () => {
    const service = await buildService({
      generateStructured: jest.fn().mockRejectedValue(new Error('boom')),
    });
    await expect(service.analyze(validInput)).rejects.toThrow('boom');
  });
});
