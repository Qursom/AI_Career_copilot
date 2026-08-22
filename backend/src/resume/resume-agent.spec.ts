import { normalizeResumeText } from '../ai/langgraph/resume/nodes/normalize-text.node';
import { computeDeterministicAtsScore } from '../ai/langgraph/resume/nodes/ats-evaluation.node';
import { buildRecommendations } from '../ai/langgraph/resume/nodes/recommendations.node';
import {
  validateOutputNode,
  routeAfterValidation,
} from '../ai/langgraph/resume/nodes/validate-output.node';
import { createResumeAnalysisGraph } from '../ai/langgraph/resume/graph';
import { ResumeAnalysisSchema } from './resume.schema';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ResumeFileService } from './resume-file.service';
import { TypedConfigService } from '../config/typed-config.service';

const baseResume = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '',
  summary: 'Senior frontend engineer with shipped product work across teams.',
  skills: ['TypeScript', 'React', 'Node'],
  projects: ['Design system'],
  experience: ['Led frontend platform; reduced latency 30%'],
  education: ['BSc CS'],
  roast: 'Needs stronger quantified outcomes in recent roles overall.',
  strengths: ['TypeScript', 'Shipping'],
  weaknesses: ['Limited GraphQL'],
  improvements: ['Add metrics'],
  recommendations: ['Improve summary'],
  missingSkills: ['GraphQL'],
  suggestedJobRole: 'Senior Frontend Engineer',
  marketSignals: [],
  priorityGaps: [],
  citations: [],
  optimized:
    'Built design system used by 5 product teams.\nReduced latency 30%.',
  atsScore: 72,
  atsNotes: 'Solid structure with room for keyword coverage improvements.',
};

describe('Resume Zod schema', () => {
  it('accepts a valid result', () => {
    expect(ResumeAnalysisSchema.safeParse(baseResume).success).toBe(true);
  });

  it('rejects invalid ATS score', () => {
    const parsed = ResumeAnalysisSchema.safeParse({
      ...baseResume,
      atsScore: 150,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects missing required structure', () => {
    const parsed = ResumeAnalysisSchema.safeParse({
      fullName: 'x',
      atsScore: 50,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('normalizeResumeText', () => {
  it('collapses whitespace without destroying headings', () => {
    const raw = 'EXPERIENCE\r\n\r\n\r\n  Built  apps  \n\n\nEDUCATION';
    const out = normalizeResumeText(raw);
    expect(out).toContain('EXPERIENCE');
    expect(out).toContain('EDUCATION');
    expect(out).not.toMatch(/\n{3,}/);
  });

  it('strips the page markers pdf-parse injects between pages', () => {
    const raw = [
      '-- 1 of 2 --',
      'EXPERIENCE',
      'Built apps',
      '-- 2 of 2 --',
      'Page 2 of 2',
      'EDUCATION',
    ].join('\n');
    const out = normalizeResumeText(raw);
    expect(out).not.toMatch(/of 2/i);
    expect(out).toContain('EXPERIENCE');
    expect(out).toContain('EDUCATION');
  });
});

describe('ATS + recommendations', () => {
  it('computes deterministic score in 0-100', () => {
    const score = computeDeterministicAtsScore(
      baseResume,
      'Led built designed implemented improved TypeScript React AWS 40%',
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores a Node résumé lower for a C# target role than for Node.js', () => {
    const nodeText = [
      'Jane Doe',
      'Node.js NestJS TypeScript PostgreSQL Redis Docker',
      'Built NestJS APIs. Implemented Express services. npm workspaces.',
      'x'.repeat(400),
    ].join('\n');
    const nodeResume = {
      ...baseResume,
      skills: ['Node.js', 'NestJS', 'TypeScript', 'PostgreSQL'],
    };
    const forNode = computeDeterministicAtsScore(
      nodeResume,
      nodeText,
      'Node.js Backend Engineer',
    );
    const forCsharp = computeDeterministicAtsScore(
      nodeResume,
      nodeText,
      'C# .NET Engineer',
    );
    expect(forNode).toBeGreaterThan(forCsharp + 12);
    expect(forCsharp).toBeLessThan(80);
  });

  it('scores a C# résumé lower for a Node.js target role than for .NET', () => {
    const csharpText = [
      'Alex Smith',
      'C# ASP.NET Core Entity Framework Azure SQL Server',
      'Built ASP.NET APIs. EF Core. Dotnet 8.',
      'x'.repeat(400),
    ].join('\n');
    const csharpResume = {
      ...baseResume,
      skills: ['C#', 'ASP.NET', 'Entity Framework', 'Azure'],
    };
    const forCsharp = computeDeterministicAtsScore(
      csharpResume,
      csharpText,
      '.NET / C# Engineer',
    );
    const forNode = computeDeterministicAtsScore(
      csharpResume,
      csharpText,
      'Node.js Backend Engineer',
    );
    expect(forCsharp).toBeGreaterThan(forNode + 12);
    expect(forNode).toBeLessThan(80);
  });

  it('builds recommendations from resume gaps', () => {
    const recs = buildRecommendations({
      ...baseResume,
      projects: [],
      missingSkills: ['Kubernetes', 'GraphQL'],
      atsScore: 55,
    });
    expect(recs.some((r) => /project/i.test(r))).toBe(true);
    expect(recs.some((r) => /Kubernetes|missing/i.test(r))).toBe(true);
  });
});

describe('validate + retry routing', () => {
  it('marks valid resume and routes to atsEvaluation', () => {
    const updated = validateOutputNode({
      userId: 'u',
      requestId: 'r',
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
      resume: baseResume,
    } as never);
    expect(updated.validationErrors).toEqual([]);
    expect(
      routeAfterValidation(
        {
          ...updated,
          resume: baseResume,
          retryCount: 0,
          validationErrors: [],
        } as never,
        2,
      ),
    ).toBe('atsEvaluation');
  });

  it('increments retry and routes back while under max', () => {
    const updated = validateOutputNode({
      userId: 'u',
      requestId: 'r',
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
      resume: undefined,
    } as never);
    expect(updated.retryCount).toBe(1);
    expect(
      routeAfterValidation(
        {
          userId: 'u',
          requestId: 'r',
          retryCount: updated.retryCount!,
          validationErrors: updated.validationErrors!,
          recommendations: [],
        } as never,
        2,
      ),
    ).toBe('analyzeResume');
  });

  it('fails when max retries exceeded', () => {
    expect(
      routeAfterValidation(
        {
          userId: 'u',
          requestId: 'r',
          retryCount: 3,
          validationErrors: ['bad'],
          recommendations: [],
        } as never,
        2,
      ),
    ).toBe('fail');
  });
});

describe('LangGraph resume graph', () => {
  const emptyRag = () => ({
    buildResumeContext: jest.fn().mockResolvedValue({
      promptContext: '',
      marketSignals: [],
      priorityGaps: [],
      citations: [],
    }),
  });

  it('executes successfully with mock LLM', async () => {
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn() },
      llm: {
        generateStructured: jest.fn().mockResolvedValue(baseResume),
      },
      rag: emptyRag(),
      maxRetries: 2,
    });

    const result = await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      rawText: 'Jane Doe Senior Frontend Engineer TypeScript React '.repeat(5),
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.resume?.skills?.length).toBeGreaterThan(0);
    expect(result.atsScore).toBeGreaterThanOrEqual(0);
  });

  it('retrieves context using the text extracted from the PDF', async () => {
    const rag = emptyRag();
    const extracted =
      'Priya Raman — Staff Data Engineer. Airflow, dbt, Snowflake, Spark, and Kafka pipelines for retail analytics.';
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn().mockResolvedValue(extracted) },
      llm: { generateStructured: jest.fn().mockResolvedValue(baseResume) },
      rag,
      maxRetries: 2,
    });

    await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      filePath: '/tmp/temporary-resume.pdf',
      role: 'Data Engineer',
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(rag.buildResumeContext).toHaveBeenCalledTimes(1);
    const query = rag.buildResumeContext.mock.calls[0][0] as {
      role?: string;
      resume: string;
    };
    expect(query.role).toBe('Data Engineer');
    expect(query.resume).toContain('Snowflake');
    expect(query.resume).toContain('Airflow');
  });

  it('feeds retrieved evidence into the final state', async () => {
    const rag = {
      buildResumeContext: jest.fn().mockResolvedValue({
        promptContext: 'RAG EVIDENCE: dbt is expected for Data Engineer',
        marketSignals: ['dbt is expected for Data Engineer'],
        priorityGaps: ['dbt'],
        citations: ['ESCO (https://esco.ec.europa.eu/)'],
      }),
    };
    const generateStructured = jest.fn().mockResolvedValue(baseResume);
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn() },
      llm: { generateStructured },
      rag,
      maxRetries: 2,
    });

    const result = await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      rawText: 'Jane Doe Senior Frontend Engineer TypeScript React '.repeat(5),
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(result.ragMarketSignals).toEqual([
      'dbt is expected for Data Engineer',
    ]);
    expect(result.ragCitations).toHaveLength(1);
    const prompt = generateStructured.mock.calls[0][0] as { prompt: string };
    expect(prompt.prompt).toContain('RAG EVIDENCE');
  });

  it('continues the analysis when retrieval fails', async () => {
    const rag = {
      buildResumeContext: jest.fn().mockRejectedValue(new Error('qdrant down')),
    };
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn() },
      llm: { generateStructured: jest.fn().mockResolvedValue(baseResume) },
      rag,
      maxRetries: 2,
    });

    const result = await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      rawText: 'Jane Doe Senior Frontend Engineer TypeScript React '.repeat(5),
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.resume).toBeDefined();
    expect(result.ragMarketSignals).toEqual([]);
  });

  it('skips retrieval when extraction produced nothing usable', async () => {
    const rag = emptyRag();
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn() },
      llm: { generateStructured: jest.fn() },
      rag,
      maxRetries: 2,
    });

    const result = await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      rawText: 'too short',
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(result.error).toBe('EMPTY_RESUME');
    expect(rag.buildResumeContext).not.toHaveBeenCalled();
  });

  it('retries then fails when LLM always invalid', async () => {
    const llm = jest.fn().mockResolvedValue({ atsScore: 999 });
    const graph = createResumeAnalysisGraph({
      pdf: { extractFromPath: jest.fn() },
      llm: { generateStructured: llm },
      rag: emptyRag(),
      maxRetries: 1,
    });

    const result = await graph.invoke({
      userId: 'u1',
      requestId: 'r1',
      rawText: 'Jane Doe Senior Frontend Engineer TypeScript React '.repeat(5),
      retryCount: 0,
      validationErrors: [],
      recommendations: [],
    });

    expect(result.error).toBe('MAX_RETRIES_EXCEEDED');
    expect(llm.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('ResumeFileService', () => {
  const config = {
    get: (key: string) => (key === 'RESUME_MAX_FILE_SIZE_MB' ? 20 : undefined),
  } as TypedConfigService;
  const service = new ResumeFileService(config);

  it('rejects missing file', async () => {
    await expect(service.assertValidPdf(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-PDF by magic bytes', async () => {
    const path = join(tmpdir(), `not-pdf-${Date.now()}.bin`);
    await fs.writeFile(path, 'HELLO');
    await expect(
      service.assertValidPdf({
        path,
        size: 5,
        mimetype: 'application/pdf',
        originalname: 'x.pdf',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    await fs.unlink(path);
  });

  it('accepts PDF magic bytes', async () => {
    const path = join(tmpdir(), `ok-pdf-${Date.now()}.pdf`);
    await fs.writeFile(path, '%PDF-1.4 fake');
    await expect(
      service.assertValidPdf({
        path,
        size: 12,
        mimetype: 'application/pdf',
        originalname: 'resume.pdf',
      } as Express.Multer.File),
    ).resolves.toBeUndefined();
    await fs.unlink(path);
  });

  it('rejects oversized files', async () => {
    const path = join(tmpdir(), `big-pdf-${Date.now()}.pdf`);
    await fs.writeFile(path, '%PDF-1.4');
    await expect(
      service.assertValidPdf({
        path,
        size: 21 * 1024 * 1024,
        mimetype: 'application/pdf',
        originalname: 'resume.pdf',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await fs.unlink(path);
  });
});
