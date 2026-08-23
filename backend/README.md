# Backend (NestJS)

Local development is unchanged: `npm ci`, `npm run start:dev`, `PORT=3001`.

## Docker (Render)

This package builds a production image with `backend/Dockerfile` (Node 22 Alpine, `dist/main.js`). `.env` is not copied into the image.

### Build and run locally

```bash
cd backend
npm ci
npm run build

docker build -t ai-career-copilot-api .

# Map the port Nest actually reads from your env file (default 3001).
docker run --env-file .env -e NODE_ENV=production -p 3001:3001 ai-career-copilot-api
```

Liveness (unauthenticated):

```text
GET http://localhost:3001/api/v1/health
```

Resume analysis (auth required in production):

```text
POST http://localhost:3001/api/v1/resume/analyze
```

### Render Web Service

| Setting | Value |
|---|---|
| Service type | Web Service |
| Runtime | Docker |
| Root directory | `backend` |
| Dockerfile path | `./Dockerfile` (relative to root directory) or repo path `./backend/Dockerfile` |
| Plan | Free |
| Health check path | `/api/v1/health` |

Do not set `PORT` in the dashboard. Render injects it; the process binds `0.0.0.0`.

### Render environment variables

Paste values in the dashboard. Do not commit secrets.

**Required in production** (boot fails without them):

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash → REST API URL (`https://….upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Matching REST token |
| `REDIS_URL` | Optional. Only for BullMQ (`RESUME_QUEUE_ENABLED=true`). Leave unset on Render if you only use REST. |
| `FIREBASE_PROJECT_ID` | Service account |
| `FIREBASE_CLIENT_EMAIL` | Service account |
| `FIREBASE_PRIVATE_KEY` | PEM with `\n` sequences |
| `LLM_PROVIDER` | `groq` or `gemini` |
| `GROQ_API_KEY` or `GEMINI_API_KEY` | Matches `LLM_PROVIDER` |
| `CORS_ORIGIN` | Exact frontend origin, e.g. `https://your-app.vercel.app` |
| `FRONTEND_URL` | Same origin (Stripe return URLs) |
| `SESSION_COOKIE_SAMESITE` | `none` if UI and API are on different hosts (HTTPS) |

**Typical extras:**

| Variable | Notes |
|---|---|
| `LOG_FORMAT` | `json` |
| `RAG_ENABLED` | `false` until Qdrant is ready |
| `QDRANT_URL` / `QDRANT_API_KEY` | Optional RAG |
| `RAG_EMBEDDING_PROVIDER` | Must match how you ingested |
| `RESUME_QUEUE_ENABLED` | Keep `false` on a single Render instance |
| `SENTRY_DSN` | Optional |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_COIN_PACKS` | Optional billing |

`AUTH_DEV_BYPASS` must stay `false`. `LLM_PROVIDER=mock` requires `ALLOW_MOCK_LLM=true` (staging only).
