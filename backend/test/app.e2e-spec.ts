import type { INestApplication } from '@nestjs/common';
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { join } from 'path';
import request from 'supertest';
import cookieParser from 'cookie-parser';
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
    app.use(cookieParser());
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
        expect(res.body.data.llmProviderEnv).toBe('mock');
        expect(typeof res.body.data.ragEnabled).toBe('boolean');
      });
  });

  it('POST /api/v1/resume/analyze validates input', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .set('x-user-id', 'e2e-user')
      .send({ resume: 'too short' })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBeDefined();
      });
  });

  it('POST /api/v1/resume/extract returns parsed text without scoring', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/extract')
      .set('x-user-id', 'e2e-extract')
      .attach('resume', join(__dirname, 'fixtures/sample-resume.pdf'), {
        contentType: 'application/pdf',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.text).toBe('string');
        expect(res.body.data.text.length).toBeGreaterThan(50);
        expect(res.body.data.text).toContain('Priya Raman');
        expect(res.body.data.atsScore).toBeUndefined();
        expect(res.body.data.interviewCoins).toBeUndefined();
      });
  });

  it('POST /api/v1/resume/analyze returns analysis envelope', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .set('x-user-id', 'e2e-user')
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

  it('POST /api/v1/auth/login rejects a body without an ID token', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(422)
      .expect((res) => {
        expect(res.body.success).toBe(false);
      });
  });

  it('POST /api/v1/auth/login rejects an unverifiable ID token', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ idToken: 'not-a-real-firebase-token' })
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
        expect(res.headers['set-cookie']).toBeUndefined();
      });
  });

  it('POST /api/v1/auth/login never trusts identity fields in the body', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        idToken: 'not-a-real-firebase-token',
        email: 'attacker@example.com',
        firebaseUid: 'someone-else',
      })
      .expect(422);
  });

  it('GET /api/v1/auth/me without a real session does not return a user', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
      });
  });

  it('POST /api/v1/auth/logout clears the session cookie', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual({ ok: true });
        expect(String(res.headers['set-cookie'])).toContain('session_id=');
      });
  });

  it('GET /api/v1/job-match/me 404s before anything is scored', () => {
    return request(app.getHttpServer())
      .get('/api/v1/job-match/me')
      .set('x-user-id', 'e2e-job-match-empty')
      .expect(404);
  });

  it('POST /api/v1/job-match/score returns result envelope', () => {
    return request(app.getHttpServer())
      .post('/api/v1/job-match/score')
      .set('x-user-id', 'e2e-user')
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

  it('GET /api/v1/job-match/me returns the match scored for that user', () => {
    return request(app.getHttpServer())
      .get('/api/v1/job-match/me')
      .set('x-user-id', 'e2e-user')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.score).toBe('number');
      });
  });

  it('POST /api/v1/job-match/score serves an identical pair from cache without charging again', async () => {
    const uid = 'e2e-job-match-cache';
    const payload = {
      jobDescription:
        'Senior Frontend Engineer. Must have TypeScript, React, design systems, accessibility, mentoring.',
      resume:
        'Jane Doe. 5 years React + TypeScript. Built a design system used by six teams. Mentored three engineers.',
    };

    const first = await request(app.getHttpServer())
      .post('/api/v1/job-match/score')
      .set('x-user-id', uid)
      .send(payload)
      .expect(200);

    expect(first.body.data.cached).toBe(false);
    const coinsAfterFirst = first.body.data.interviewCoins as number;

    const second = await request(app.getHttpServer())
      .post('/api/v1/job-match/score')
      .set('x-user-id', uid)
      .send(payload)
      .expect(200);

    expect(second.body.data.cached).toBe(true);
    expect(second.body.data.interviewCoins).toBe(coinsAfterFirst);
    expect(second.body.data.score).toBe(first.body.data.score);

    const history = await request(app.getHttpServer())
      .get('/api/v1/job-match/history')
      .set('x-user-id', uid)
      .expect(200);

    expect(Array.isArray(history.body.data)).toBe(true);
    expect(history.body.data.length).toBeGreaterThanOrEqual(1);
    expect(typeof history.body.data[0].score).toBe('number');
  });

  it('rejects extra fields (forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/resume/analyze')
      .set('x-user-id', 'e2e-user')
      .send({
        resume: 'x'.repeat(200),
        evil: 'yes',
      })
      .expect(422);
  });

  it('rejects an oversized PDF at the multer boundary', async () => {
    const oversized = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(1.5 * 1024 * 1024, 0),
    ]);

    const res = await request(app.getHttpServer())
      .post('/api/v1/resume/upload')
      .set('x-user-id', 'e2e-user')
      .attach('resume', oversized, {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
