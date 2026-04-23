import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LlmTimeoutError } from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { JobMatchService } from './job-match.service';

describe('JobMatchService', () => {
  const buildService = async (
    generateStructured: jest.Mock,
    options?: {
      providerName?: string;
      rag?: {
        promptContext: string;
        marketSignals: string[];
        priorityGaps: string[];
        citations: string[];
      };
    },
  ): Promise<JobMatchService> => {
    const ragStub = options?.rag ?? {
      promptContext: 'RAG EVIDENCE: market role expectations',
      marketSignals: ['signal'],
      priorityGaps: ['gap'],
      citations: ['citation'],
    };
    const module = await Test.createTestingModule({
      providers: [
        JobMatchService,
        {
          provide: RagService,
          useValue: {
            buildJobMatchContext: jest.fn().mockResolvedValue(ragStub),
          },
        },
        {
          provide: LlmService,
          useValue: {
            providerName: options?.providerName ?? 'mock',
            generateStructured,
          },
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
      marketSignals: ['React and accessibility are current market priorities'],
      priorityGaps: ['Accessibility coverage is a top market gap'],
      citations: ['ESCO framework (https://esco.ec.europa.eu/)'],
      suggestions: ['add wcag bullet'],
    };
    let capturedPrompt = '';
    const generateStructured = jest.fn().mockImplementation((args: unknown) => {
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
    const svc = await buildService(generateStructured);
    await expect(svc.score(input)).resolves.toEqual({
      ...fake,
      marketSignals: ['signal'],
      priorityGaps: ['gap'],
      citations: ['citation'],
    });
    expect(generateStructured).toHaveBeenCalled();
    expect(capturedPrompt).toContain('RAG EVIDENCE');
  });

  it('when provider is openai, prefers LLM RAG fields over stub', async () => {
    const fake = {
      score: 80,
      strengths: ['a'],
      gaps: ['b'],
      marketSignals: ['from LLM'],
      priorityGaps: ['from LLM'],
      citations: ['from LLM'],
      suggestions: ['s'],
    };
    const svc = await buildService(jest.fn().mockResolvedValue(fake), {
      providerName: 'openai',
    });
    await expect(svc.score(input)).resolves.toEqual(fake);
  });

  it('when mock and RAG empty, keeps LLM RAG fields', async () => {
    const fake = {
      score: 80,
      strengths: ['a'],
      gaps: ['b'],
      marketSignals: ['mock m'],
      priorityGaps: ['mock p'],
      citations: ['mock c'],
      suggestions: ['s'],
    };
    const svc = await buildService(jest.fn().mockResolvedValue(fake), {
      rag: {
        promptContext: '',
        marketSignals: [],
        priorityGaps: [],
        citations: [],
      },
    });
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
