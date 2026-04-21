import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LlmTimeoutError } from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { JobMatchService } from './job-match.service';

describe('JobMatchService', () => {
  const buildService = async (
    generateStructured: jest.Mock,
  ): Promise<JobMatchService> => {
    const module = await Test.createTestingModule({
      providers: [
        JobMatchService,
        {
          provide: LlmService,
          useValue: { providerName: 'mock', generateStructured },
        },
      ],
    }).compile();
    return module.get(JobMatchService);
  };

  const input = {
    jobDescription:
      'Senior Frontend Engineer — TypeScript, React, design systems, WCAG, mentor juniors.',
    resume:
      'Jane Doe. 5 years React + TypeScript. Built and owned a design system used by six teams.',
  };

  it('returns validated match result on success', async () => {
    const fake = {
      score: 80,
      strengths: ['ts and react'],
      gaps: ['no a11y'],
      suggestions: ['add wcag bullet'],
    };
    const svc = await buildService(jest.fn().mockResolvedValue(fake));
    await expect(svc.score(input)).resolves.toEqual(fake);
  });

  it('converts LLM errors to 503', async () => {
    const svc = await buildService(
      jest.fn().mockRejectedValue(new LlmTimeoutError('slow')),
    );
    await expect(svc.score(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
