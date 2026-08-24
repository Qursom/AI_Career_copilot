import {
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';
import { InsufficientCoinsError } from '../users/users.store';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeAnalysisService } from './resume-analysis.service';
import { ResumeFileService } from './resume-file.service';
import { RESUME_STORE } from './resume.store';
import { ResumeJobClient } from '../queue/resume-job.client';

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

function validAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    ...extraFields,
    critique: 'x'.repeat(30),
    strengths: ['Strong TypeScript background', 'Shipped design systems'],
    improvements: ['Quantify mentoring impact', 'Replace weak verbs'],
    missingSkills: ['GraphQL', 'Accessibility (WCAG 2.2)'],
    marketSignals: ['Market asks for WCAG + measurable impact metrics'],
    priorityGaps: ['Accessibility (WCAG 2.2) is market-priority'],
    citations: ['ESCO framework (https://esco.ec.europa.eu/)'],
    optimized: 'y'.repeat(30),
    atsScore: 72,
    atsNotes: 'Notes that are long enough to pass validation.',
    ...overrides,
  };
}

describe('ResumeAnalysisService', () => {
  const build = async (opts?: {
    generateStructured?: jest.Mock;
    charge?: jest.Mock;
    refund?: jest.Mock;
    cacheGet?: jest.Mock;
    cacheSet?: jest.Mock;
    upsert?: jest.Mock;
    buildResumeContext?: jest.Mock;
    enqueue?: jest.Mock;
  }) => {
    const generateStructured =
      opts?.generateStructured ?? jest.fn().mockResolvedValue(validAnalysis());
    const charge =
      opts?.charge ?? jest.fn().mockResolvedValue({ interviewCoins: 90 });
    const refund =
      opts?.refund ?? jest.fn().mockResolvedValue({ interviewCoins: 100 });
    const cacheGet = opts?.cacheGet ?? jest.fn().mockResolvedValue(null);
    const cacheSet = opts?.cacheSet ?? jest.fn().mockResolvedValue(undefined);
    const upsert =
      opts?.upsert ?? jest.fn(async (_id: string, a: unknown) => a);
    const enqueue = opts?.enqueue;
    const buildResumeContext =
      opts?.buildResumeContext ??
      jest.fn().mockResolvedValue({
        promptContext: 'RAG EVIDENCE: skill expectations',
        marketSignals: ['signal'],
        priorityGaps: ['gap'],
        citations: ['citation'],
      });

    const module = await Test.createTestingModule({
      providers: [
        ResumeAnalysisService,
        {
          provide: LlmService,
          useValue: {
            providerName: 'mock',
            generateStructured,
          },
        },
        {
          provide: RagService,
          useValue: { buildResumeContext },
        },
        {
          provide: UsersService,
          useValue: {
            ensureUser: jest.fn().mockResolvedValue({ interviewCoins: 100 }),
            assertSufficientCoins: jest
              .fn()
              .mockResolvedValue({ interviewCoins: 100 }),
            chargeResumeAnalysis: charge,
            refundResumeAnalysis: refund,
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: cacheGet,
            set: cacheSet,
            setWithTtl: cacheSet,
          },
        },
        {
          provide: PdfExtractService,
          useValue: {
            extractFromPath: jest.fn(),
            unlink: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResumeFileService,
          useValue: {
            assertValidPdf: jest.fn().mockResolvedValue(undefined),
            maxBytes: () => 20 * 1024 * 1024,
          },
        },
        {
          provide: TypedConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'RESUME_ANALYSIS_MAX_RETRIES') return 2;
              return undefined;
            },
          },
        },
        {
          provide: RESUME_STORE,
          useValue: {
            upsert,
            findByUserId: jest.fn().mockResolvedValue(null),
          },
        },
        ...(enqueue
          ? [
              {
                provide: ResumeJobClient,
                useValue: { enqueue },
              },
            ]
          : []),
      ],
    }).compile();

    return {
      service: module.get(ResumeAnalysisService),
      generateStructured,
      charge,
      refund,
      cacheGet,
      cacheSet,
      upsert,
      buildResumeContext,
      enqueue,
      pdf: module.get(PdfExtractService),
    };
  };

  const resumeText =
    'Jane Doe — Senior Frontend Engineer with 5+ years of TypeScript, React, and design systems work across fintech and developer tools.';

  it('runs LangGraph analysis, persists, caches, and deducts coins after success', async () => {
    const { service, charge, upsert, cacheSet, generateStructured } =
      await build();

    const result = await service.analyzeForUser({
      userId: 'user-1',
      resumeText,
      role: 'Senior Frontend Engineer',
      requestId: 'req-1',
    });

    expect(generateStructured).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(charge).toHaveBeenCalledTimes(1);
    expect(result.interviewCoins).toBe(90);
    expect(result.atsScore).toBeGreaterThanOrEqual(0);
    expect(result.atsScore).toBeLessThanOrEqual(100);
    expect(cacheSet).toHaveBeenCalled();
  });

  it('extracts PDF text without charging coins or calling the LLM', async () => {
    const { service, charge, generateStructured, pdf } = await build();
    (pdf.extractFromPath as jest.Mock).mockResolvedValue(
      '-- 1 of 1 --\nJane Doe — Senior Frontend Engineer with 5+ years of TypeScript and React across fintech teams.',
    );

    const result = await service.extractUpload({
      path: '/tmp/temporary-resume-extract.pdf',
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 1000,
    } as Express.Multer.File);

    expect(result.text).toContain('Jane Doe');
    expect(result.text).not.toMatch(/1 of 1/);
    expect(charge).not.toHaveBeenCalled();
    expect(generateStructured).not.toHaveBeenCalled();
    expect(pdf.unlink).toHaveBeenCalledWith(
      '/tmp/temporary-resume-extract.pdf',
    );
  });

  it('unlinks the temp PDF when extractUpload fails', async () => {
    const { service, pdf } = await build();
    (pdf.extractFromPath as jest.Mock).mockRejectedValue(
      new BadRequestException({ error: 'PDF_PARSE_FAILED' }),
    );

    await expect(
      service.extractUpload({
        path: '/tmp/temporary-resume-bad.pdf',
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1000,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(pdf.unlink).toHaveBeenCalledWith('/tmp/temporary-resume-bad.pdf');
  });

  it('does not deduct coins when analysis fails', async () => {
    const { service, charge } = await build({
      generateStructured: jest.fn().mockRejectedValue(new Error('LLM down')),
    });

    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        resumeText,
        requestId: 'req-fail',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(charge).not.toHaveBeenCalled();
  });

  it('returns idempotent result without double-charging', async () => {
    const cached = {
      ...validAnalysis({ atsScore: 80 }),
      interviewCoins: 90,
    };
    const { service, charge, generateStructured } = await build({
      cacheGet: jest.fn().mockResolvedValue(JSON.stringify(cached)),
    });

    const result = await service.analyzeForUser({
      userId: 'user-1',
      resumeText,
      requestId: 'same-key',
    });

    expect(result.atsScore).toBe(80);
    expect(generateStructured).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
  });

  it('maps insufficient coins before analysis', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ResumeAnalysisService,
        {
          provide: LlmService,
          useValue: { providerName: 'mock', generateStructured: jest.fn() },
        },
        {
          provide: RagService,
          useValue: { buildResumeContext: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: {
            ensureUser: jest.fn().mockResolvedValue({ interviewCoins: 0 }),
            assertSufficientCoins: jest
              .fn()
              .mockRejectedValue(new InsufficientCoinsError(0, 10)),
            chargeResumeAnalysis: jest.fn(),
            refundResumeAnalysis: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            setWithTtl: jest.fn(),
          },
        },
        {
          provide: PdfExtractService,
          useValue: { extractFromPath: jest.fn(), unlink: jest.fn() },
        },
        {
          provide: ResumeFileService,
          useValue: { assertValidPdf: jest.fn() },
        },
        {
          provide: TypedConfigService,
          useValue: { get: () => 2 },
        },
        {
          provide: RESUME_STORE,
          useValue: { upsert: jest.fn(), findByUserId: jest.fn() },
        },
      ],
    }).compile();

    const service = module.get(ResumeAnalysisService);
    await expect(
      service.analyzeForUser({
        userId: 'broke',
        resumeText,
        requestId: 'req-coins',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('treats empty resume as BadRequest', async () => {
    const { service, charge } = await build();
    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        resumeText: 'too short',
        requestId: 'req-empty',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(charge).not.toHaveBeenCalled();
  });

  it('deletes temp PDF in finally even when analysis fails', async () => {
    const { service, pdf, generateStructured } = await build({
      generateStructured: jest.fn().mockRejectedValue(new Error('fail')),
    });
    (pdf.extractFromPath as jest.Mock).mockResolvedValue(resumeText);

    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        resumeText: undefined,
        requestId: 'req-pdf',
        file: {
          path: '/tmp/temporary-resume-test.pdf',
          originalname: 'resume.pdf',
          mimetype: 'application/pdf',
          size: 1000,
        } as Express.Multer.File,
      }),
    ).rejects.toBeDefined();

    expect(pdf.unlink).toHaveBeenCalledWith('/tmp/temporary-resume-test.pdf');
    expect(generateStructured).toHaveBeenCalled();
  });

  it('queries RAG with the text extracted from an uploaded PDF', async () => {
    const { service, buildResumeContext, pdf } = await build();
    const extracted =
      'Priya Raman — Staff Data Engineer building Airflow, dbt, and Snowflake pipelines for retail analytics teams.';
    (pdf.extractFromPath as jest.Mock).mockResolvedValue(extracted);

    await service.analyzeForUser({
      userId: 'user-1',
      requestId: 'req-pdf-rag',
      role: 'Data Engineer',
      file: {
        path: '/tmp/temporary-resume-rag.pdf',
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: 1000,
      } as Express.Multer.File,
    });

    expect(buildResumeContext).toHaveBeenCalledTimes(1);
    const query = buildResumeContext.mock.calls[0][0] as { resume: string };
    expect(query.resume).toContain('Snowflake');
  });

  it('charges before persisting so a 402 cannot leave a free analysis', async () => {
    const order: string[] = [];
    const charge = jest.fn(async () => {
      order.push('charge');
      return { interviewCoins: 90 };
    });
    const upsert = jest.fn(async (_id: string, a: unknown) => {
      order.push('upsert');
      return a;
    });
    const { service } = await build({ charge, upsert });

    await service.analyzeForUser({
      userId: 'user-1',
      resumeText,
      requestId: 'req-order',
    });

    expect(order).toEqual(['charge', 'upsert']);
  });

  it('refunds the charge when persistence fails', async () => {
    const { service, refund, charge } = await build({
      upsert: jest.fn().mockRejectedValue(new Error('mongo down')),
    });

    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        resumeText,
        requestId: 'req-refund',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(charge).toHaveBeenCalledTimes(1);
    expect(refund).toHaveBeenCalledWith('user-1');
  });

  it('does not persist when the charge is rejected', async () => {
    const { service, upsert } = await build({
      charge: jest.fn().mockRejectedValue(new InsufficientCoinsError(5, 10)),
    });

    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        resumeText,
        requestId: 'req-broke-late',
      }),
    ).rejects.toBeInstanceOf(HttpException);

    expect(upsert).not.toHaveBeenCalled();
  });

  it('survives Redis cache write failures after Mongo persist', async () => {
    const { service, charge, upsert } = await build({
      cacheSet: jest.fn().mockRejectedValue(new Error('redis down')),
    });

    const result = await service.analyzeForUser({
      userId: 'user-1',
      resumeText,
      requestId: 'req-cache',
    });

    expect(upsert).toHaveBeenCalled();
    expect(charge).toHaveBeenCalled();
    expect('interviewCoins' in result && result.interviewCoins).toBe(90);
  });

  it('enqueues on BullMQ and does not run LangGraph when a job client is present', async () => {
    const enqueue = jest.fn().mockResolvedValue({
      jobId: 'user-1__req-q',
      status: 'queued',
    });
    const { service, generateStructured, charge } = await build({ enqueue });

    const result = await service.analyzeForUser({
      userId: 'user-1',
      resumeText,
      requestId: 'req-q',
    });

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        requestId: 'req-q',
        rawText: resumeText,
      }),
    );
    expect(generateStructured).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
    expect(result).toEqual({ jobId: 'user-1__req-q', status: 'queued' });
  });

  it('deletes the temp PDF when enqueue fails', async () => {
    const enqueue = jest.fn().mockRejectedValue(
      new ServiceUnavailableException({
        message: 'queue down',
        error: 'QUEUE_UNAVAILABLE',
      }),
    );
    const { service, pdf } = await build({ enqueue });

    await expect(
      service.analyzeForUser({
        userId: 'user-1',
        requestId: 'req-q-fail',
        file: {
          path: '/tmp/temporary-resume-queue.pdf',
          originalname: 'resume.pdf',
          mimetype: 'application/pdf',
          size: 1000,
        } as Express.Multer.File,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(pdf.unlink).toHaveBeenCalledWith('/tmp/temporary-resume-queue.pdf');
  });
});
