import {
  HttpStatus,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { JsonLogger } from './common/logging/json.logger';
import { initSentry } from './common/logging/sentry';
import { AppModule } from './app.module';
import { TypedConfigService } from './config/typed-config.service';
import { LlmService } from './llm/llm.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const config = app.get(TypedConfigService);
  await initSentry(config.get('SENTRY_DSN'));

  if (config.get('LOG_FORMAT') === 'json' || config.isProd) {
    app.useLogger(new JsonLogger());
  } else {
    app.useLogger(
      ['error', 'warn', 'log', 'debug', 'verbose'].filter(
        (l) => levelIndex(l) <= levelIndex(config.get('LOG_LEVEL')),
      ) as ('error' | 'warn' | 'log' | 'debug' | 'verbose')[],
    );
  }

  app.set('trust proxy', 1);
  app.set('x-powered-by', false);

  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.setGlobalPrefix(config.get('API_PREFIX'), {
    exclude: [],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Credentialed CORS cannot use a wildcard origin — browsers reject the
  // response outright, which would silently break the session cookie.
  const corsOrigins = config.corsOrigins.filter((o) => o !== '*');
  if (corsOrigins.length !== config.corsOrigins.length) {
    logger.error(
      'CORS_ORIGIN contains "*", which is invalid alongside credentialed requests. Ignoring it — list the frontend origin explicitly.',
    );
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'x-user-id',
      'Idempotency-Key',
      'X-Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.enableShutdownHooks();

  if (!config.isProd) {
    const swaggerDoc = new DocumentBuilder()
      .setTitle('Smart careerCopilot API')
      .setDescription(
        'Resume analysis, job match scoring, and health endpoints. LLM: mock, gemini, or groq (LangChain ChatGroq). RAG uses Qdrant when QDRANT_URL is set.',
      )
      .setVersion('1.0')
      .addServer(`/${config.get('API_PREFIX')}`)
      .addBearerAuth()
      .addTag('auth')
      .addTag('resume')
      .addTag('job-match')
      .addTag('users')
      .addTag('billing')
      .addTag('health')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerDoc);
    SwaggerModule.setup(`${config.get('API_PREFIX')}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(
      `📚 Swagger UI at http://localhost:${config.get('PORT')}/${config.get('API_PREFIX')}/docs`,
    );
  }

  const port = config.get('PORT');
  await app.listen(port);

  const llm = app.get(LlmService);
  const llmEnv = config.get('LLM_PROVIDER');
  logger.log(
    `🚀 ${config.get('NODE_ENV')} API ready at http://localhost:${port}/${config.get('API_PREFIX')}/v1 (llm=${llm.providerName}, LLM_PROVIDER=${llmEnv})`,
  );
}

function levelIndex(level: string): number {
  const order = ['error', 'warn', 'log', 'debug', 'verbose'];
  const i = order.indexOf(level);
  return i < 0 ? order.length - 1 : i;
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
