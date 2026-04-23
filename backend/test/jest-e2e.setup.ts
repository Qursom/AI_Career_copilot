/**
 * Must run before the e2e test file imports `AppModule`. `ConfigModule.forRoot`
 * executes on import, so `beforeAll` in the spec is too late for env overrides.
 */
process.env.NODE_ENV = 'test';
process.env.LLM_PROVIDER = 'mock';
