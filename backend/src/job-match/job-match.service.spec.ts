import {
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmTimeoutError } from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';
import { InsufficientCoinsError } from '../users/users.store';
import { jobMatchContentHash } from './content-hash';
import { JobMatchService } from './job-match.service';
import { JOB_MATCH_STORE } from './job-match.store';

const USER_ID = 'firebase-uid-1';

const fakeMatch = {
  score: 80,
  strengths: ['ts and react'],
  gaps: ['no a11y'],
  marketSignals: ['React and accessibility are current market priorities'],
  priorityGaps: ['Accessibility coverage is a top market gap'],
  citations: ['ESCO framework (https://esco.ec.europa.eu/)'],
  suggestions: ['add wcag bullet'],
};

describe('JobMatchService', () => {
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let store: {
    upsert: jest.Mock;
    findByUserAndHash: jest.Mock;
    findLatestByUserId: jest.Mock;
    listByUserId: jest.Mock;
  };
  let users: {
    ensureUser: jest.Mock;
    getMe: jest.Mock;
    assertSufficientCoins: jest.Mock;
    chargeJobMatch: jest.Mock;
    refundJobMatch: jest.Mock;
  };

  beforeEach(() => {
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    store = {
      upsert: jest.fn(async (row: unknown) => row),
      findByUserAndHash: jest.fn().mockResolvedValue(null),
      findLatestByUserId: jest.fn().mockResolvedValue(null),
      listByUserId: jest.fn().mockResolvedValue([]),
    };
    users = {
      ensureUser: jest.fn().mockResolvedValue({ interviewCoins: 150 }),
      getMe: jest.fn().mockResolvedValue({ interviewCoins: 150 }),
      assertSufficientCoins: jest.fn().mockResolvedValue({ interviewCoins: 150 }),
      chargeJobMatch: jest.fn().mockResolvedValue({ interviewCoins: 140 }),
      refundJobMatch: jest.fn().mockResolvedValue({ interviewCoins: 150 }),
    };
  });

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
        { provide: CacheService, useValue: cache },
        { provide: UsersService, useValue: users },
        {
          provide: TypedConfigService,
          useValue: { get: (key: string) => (key === 'JOB_MATCH_COIN_COST' ? 10 : undefined) },
        },
        { provide: JOB_MATCH_STORE, useValue: store },
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

  const ragMerged = {
    marketSignals: ['signal'],
    priorityGaps: ['gap'],
    citations: ['citation'],
  };

  it('returns validated match result on success and charges once', async () => {
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
      return Promise.resolve(fakeMatch);
    });
    const svc = await buildService(generateStructured);
    await expect(svc.score(USER_ID, input)).resolves.toEqual({
      ...fakeMatch,
      ...ragMerged,
      cached: false,
      interviewCoins: 140,
    });
    expect(generateStructured).toHaveBeenCalled();
    expect(capturedPrompt).toContain('RAG EVIDENCE');
    expect(users.chargeJobMatch).toHaveBeenCalledTimes(1);
    expect(store.upsert).toHaveBeenCalledTimes(1);
  });

  it('associates the scored match with the authenticated user', async () => {
    const svc = await buildService(jest.fn().mockResolvedValue(fakeMatch));
    await svc.score(USER_ID, input);

    expect(cache.set).toHaveBeenCalledWith(
      `job-match:last:${USER_ID}`,
      expect.any(String),
    );
    const hash = jobMatchContentHash(input.jobDescription, input.resume);
    expect(cache.set).toHaveBeenCalledWith(
      `job-match:hash:${USER_ID}:${hash}`,
      expect.any(String),
    );
  });

  it('serves an identical JD+resume from cache without charging or calling the LLM', async () => {
    cache.get.mockResolvedValue(JSON.stringify(fakeMatch));
    const generateStructured = jest.fn();
    const svc = await buildService(generateStructured);

    await expect(svc.score(USER_ID, input)).resolves.toEqual({
      ...fakeMatch,
      cached: true,
      interviewCoins: 150,
    });
    expect(generateStructured).not.toHaveBeenCalled();
    expect(users.chargeJobMatch).not.toHaveBeenCalled();
    expect(store.upsert).toHaveBeenCalled();
  });

  it('treats a store hit as a cache hit when Redis is empty', async () => {
    store.findByUserAndHash.mockResolvedValue({
      userId: USER_ID,
      contentHash: 'abc',
      result: fakeMatch,
      jobPreview: 'Senior Frontend',
      jobDescription: '',
      resume: '',
      createdAt: new Date(),
    });
    const generateStructured = jest.fn();
    const svc = await buildService(generateStructured);

    await expect(svc.score(USER_ID, input)).resolves.toMatchObject({
      cached: true,
      score: 80,
    });
    expect(generateStructured).not.toHaveBeenCalled();
    expect(users.chargeJobMatch).not.toHaveBeenCalled();
  });

  it('returns the stored match for the user', async () => {
    store.findLatestByUserId.mockResolvedValue({
      result: fakeMatch,
    });
    const svc = await buildService(jest.fn());

    await expect(svc.getMine(USER_ID)).resolves.toEqual(fakeMatch);
  });

  it('falls back to the last-match cache when the store is empty', async () => {
    cache.get.mockResolvedValue(JSON.stringify(fakeMatch));
    const svc = await buildService(jest.fn());

    await expect(svc.getMine(USER_ID)).resolves.toEqual(fakeMatch);
    expect(cache.get).toHaveBeenCalledWith(`job-match:last:${USER_ID}`);
  });

  it('404s when the user has never scored a match', async () => {
    const svc = await buildService(jest.fn());
    await expect(svc.getMine(USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('still returns the score when the cache write fails', async () => {
    cache.set.mockRejectedValue(new Error('redis down'));
    const svc = await buildService(jest.fn().mockResolvedValue(fakeMatch));

    await expect(svc.score(USER_ID, input)).resolves.toMatchObject({
      score: 80,
      cached: false,
    });
  });

  it('refunds coins when persist fails', async () => {
    store.upsert.mockRejectedValue(new Error('mongo down'));
    const svc = await buildService(jest.fn().mockResolvedValue(fakeMatch));

    await expect(svc.score(USER_ID, input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(users.refundJobMatch).toHaveBeenCalledTimes(1);
  });

  it('returns 402 before calling the LLM when the user is short of coins', async () => {
    users.assertSufficientCoins.mockRejectedValue(
      new InsufficientCoinsError(0, 10),
    );
    const generateStructured = jest.fn();
    const svc = await buildService(generateStructured);

    await expect(svc.score(USER_ID, input)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(generateStructured).not.toHaveBeenCalled();
    expect(users.chargeJobMatch).not.toHaveBeenCalled();
  });

  it('when provider is gemini, prefers LLM RAG fields over stub', async () => {
    const fake = {
      ...fakeMatch,
      marketSignals: ['from LLM'],
      priorityGaps: ['from LLM'],
      citations: ['from LLM'],
    };
    const svc = await buildService(jest.fn().mockResolvedValue(fake), {
      providerName: 'gemini',
    });
    await expect(svc.score(USER_ID, input)).resolves.toMatchObject(fake);
  });

  it('when mock and RAG empty, keeps LLM RAG fields', async () => {
    const fake = {
      ...fakeMatch,
      marketSignals: ['mock m'],
      priorityGaps: ['mock p'],
      citations: ['mock c'],
    };
    const svc = await buildService(jest.fn().mockResolvedValue(fake), {
      rag: {
        promptContext: '',
        marketSignals: [],
        priorityGaps: [],
        citations: [],
      },
    });
    await expect(svc.score(USER_ID, input)).resolves.toMatchObject(fake);
  });

  it('converts LLM errors to 503', async () => {
    const svc = await buildService(
      jest.fn().mockRejectedValue(new LlmTimeoutError('slow')),
    );
    await expect(svc.score(USER_ID, input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(users.chargeJobMatch).not.toHaveBeenCalled();
  });

  it('lists stored history newest first', async () => {
    store.listByUserId.mockResolvedValue([
      {
        contentHash: 'h1',
        result: { ...fakeMatch, score: 90 },
        jobPreview: 'Senior Frontend',
        jobDescription:
          'About the job\n\nJob title: Senior Frontend Engineer\n\nBuild UI.',
        resume: 'cv',
        createdAt: new Date('2026-08-20T12:00:00.000Z'),
      },
    ]);
    const svc = await buildService(jest.fn());
    await expect(svc.listHistory(USER_ID)).resolves.toEqual([
      {
        contentHash: 'h1',
        score: 90,
        jobPreview: 'Senior Frontend Engineer',
        createdAt: '2026-08-20T12:00:00.000Z',
      },
    ]);
  });
});
