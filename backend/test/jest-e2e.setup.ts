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
process.env.GEMINI_API_KEY = '';
process.env.RAG_EMBEDDING_PROVIDER = 'mock';
// The suite authenticates with `x-user-id`, which now requires an explicit
// opt-in. Firebase is blanked above, so the guard will honour it.
process.env.AUTH_DEV_BYPASS = 'true';
// Keep oversized-upload coverage cheap: 1.5 MB is enough to trip multer.
process.env.RESUME_MAX_FILE_SIZE_MB = '1';
