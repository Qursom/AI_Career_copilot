import type { INestApplication } from '@nestjs/common';
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LLM_PROVIDER = 'mock';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 returns greeting envelope', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual({ message: 'AI Career Copilot API' });
        expect(res.body.meta.requestId).toBeDefined();
      });
  });

  it('GET /api/v1/health includes llm provider', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.llmProvider).toBe('mock');
      });
  });

  it('POST /api/v1/resume/analyze validates input', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .send({ resume: 'too short' })
      .expect(422)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBeDefined();
      });
  });

  it('POST /api/v1/resume/analyze returns analysis envelope', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .send({
        resume:
          'Jane Doe. 5+ years of TypeScript and React. Shipped a design system used by six teams, owned a checkout rewrite, mentored three engineers.',
        role: 'Senior Frontend Engineer',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        const d = res.body.data;
        expect(typeof d.atsScore).toBe('number');
        expect(typeof d.roast).toBe('string');
        expect(Array.isArray(d.strengths)).toBe(true);
        expect(d.strengths.length).toBeGreaterThan(0);
        expect(Array.isArray(d.improvements)).toBe(true);
        expect(d.improvements.length).toBeGreaterThan(0);
        expect(Array.isArray(d.missingSkills)).toBe(true);
      });
  });

  it('POST /api/v1/job-match/score returns result envelope', () => {
    return request(app.getHttpServer())
      .post('/api/v1/job-match/score')
      .send({
        jobDescription:
          'Senior Frontend Engineer. Must have TypeScript, React, design systems, accessibility, mentoring.',
        resume:
          'Jane Doe. 5 years React + TypeScript. Built a design system used by six teams. Mentored three engineers.',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.score).toBe('number');
        expect(Array.isArray(res.body.data.strengths)).toBe(true);
      });
  });

  it('rejects extra fields (forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .send({
        resume: 'x'.repeat(200),
        evil: 'yes',
      })
      .expect(422);
  });
});
