import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { GeminiEmbeddingProvider } from '../src/rag/embeddings/gemini-embedding.provider';
import { QdrantVectorStore } from '../src/rag/vector/qdrant-vector.store';

loadEnv({ path: resolve(__dirname, '../.env'), override: true });

function maskHost(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '(invalid QDRANT_URL)';
  }
}

async function main(): Promise<void> {
  const rawUrl = process.env.QDRANT_URL?.trim();
  const apiKey = process.env.QDRANT_API_KEY?.trim();
  const collection = process.env.QDRANT_COLLECTION || 'career_copilot_skills';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const dim = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);

  const url = rawUrl;
  console.log('qdrant host:', url ? maskHost(url) : '(unset)');
  console.log('qdrant api key:', apiKey ? `set (${apiKey.length} chars)` : 'MISSING');
  console.log('collection:', collection);
  console.log('embeddings:', process.env.RAG_EMBEDDING_PROVIDER || '(unset)', `dim=${dim}`);

  if (!url) {
    console.log('FAIL: QDRANT_URL is not set');
    process.exitCode = 1;
    return;
  }
  if (!apiKey) {
    console.log('FAIL: QDRANT_API_KEY is not set in backend/.env');
    process.exitCode = 1;
    return;
  }

  const urls = url.includes('cloud.qdrant.io') && !/:\d+$/.test(new URL(url).host)
    ? [url, `${url.replace(/\/$/, '')}:6333`]
    : [url];

  let store: QdrantVectorStore | null = null;
  let info: Awaited<ReturnType<QdrantVectorStore['describe']>> | null = null;
  let lastError = '';
  const started = Date.now();
  for (const candidate of urls) {
    console.log(`trying ${maskHost(candidate)}`);
    store = new QdrantVectorStore(candidate, collection, apiKey);
    try {
      info = await store.describe();
      console.log(`describe ok in ${Date.now() - started}ms via ${maskHost(candidate)}`);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.log(`describe failed: ${lastError.slice(0, 200)}`);
      store = null;
    }
  }
  if (!store || !info) {
    console.log(`describe FAIL in ${Date.now() - started}ms: ${lastError.slice(0, 400)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `  exists=${info.exists}  points=${info.pointCount ?? 0}  dim=${info.dimensions ?? 'unknown'}  ingestedWith=${info.embeddingProvider ?? 'unknown'}`,
  );
  if (!info.exists) {
    console.log('COLLECTION_MISSING: run npm run rag:ingest from /backend');
    process.exitCode = 2;
    return;
  }
  if (!info.pointCount) {
    console.log('COLLECTION_EMPTY: run npm run rag:ingest from /backend');
    process.exitCode = 2;
    return;
  }

  if (!geminiKey) {
    console.log('search SKIP (no GEMINI_API_KEY)');
    return;
  }

  const embeddings = new GeminiEmbeddingProvider({
    apiKey: geminiKey,
    model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    outputDimensionality: dim,
  });
  const query = 'TypeScript React design systems accessibility frontend engineer';
  const embedStarted = Date.now();
  const vector = await embeddings.embedText(query);
  console.log(`embed ok in ${Date.now() - embedStarted}ms  vector=${vector.length}`);

  const searchStarted = Date.now();
  const hits = await store.search(vector, 5);
  console.log(`search ok in ${Date.now() - searchStarted}ms  hits=${hits.length}`);
  for (const hit of hits.slice(0, 5)) {
    console.log(`  - ${hit.role} / ${hit.skill} (${hit.importance}) score=${hit.score.toFixed(3)}`);
  }
  if (!hits.length) {
    console.log('NO_HITS: collection may have been ingested with a different embedding provider/dim');
    process.exitCode = 3;
  }
}

void main();
