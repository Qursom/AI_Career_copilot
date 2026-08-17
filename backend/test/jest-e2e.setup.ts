/**
 * Must run before the e2e test file imports `AppModule`.
 */
process.env.NODE_ENV = 'test';
process.env.LLM_PROVIDER = 'mock';
process.env.MONGODB_URI = '';
process.env.REDIS_URL = '';
process.env.QDRANT_URL = '';
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = '';
process.env.FIREBASE_PROJECT_ID = '';
process.env.FIREBASE_CLIENT_EMAIL = '';
process.env.FIREBASE_PRIVATE_KEY = '';
process.env.GROQ_API_KEY = '';
