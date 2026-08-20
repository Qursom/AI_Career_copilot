# AI Career Copilot

AI Career Copilot is a full-stack app that helps candidates improve resumes, check fit for specific job descriptions, and manage interview preparation — all behind a secure Google-authenticated session.

**Stack at a glance:** Next.js frontend · NestJS API · LangGraph Resume Agent · Firebase auth · MongoDB · Redis · optional Qdrant RAG · Groq / Gemini / Mock LLM.

---

## Overview

### Resume Analysis (LangGraph Resume Agent)

From `/resume`, authenticated users paste resume text or upload a PDF (up to 20 MB) and optionally set a target role.

| Endpoint | Input |
|----------|--------|
| `POST /api/v1/resume/upload` | Multipart field `resume` (PDF) |
| `POST /api/v1/resume/analyze` | JSON `resume` text or multipart field `file` |

Both use the same LangGraph pipeline. Successful analysis costs **10 interview coins** (charged only after MongoDB persistence). Duplicate requests with the same `Idempotency-Key` are not double-charged.

**Returns:** extracted profile, skills, experience, education, projects, roast, strengths/weaknesses, improvements, recommendations, missing skills, suggested role, market signals (RAG), ATS score + notes, remaining coins.

### Job Match Scoring

From `/job-match`, users paste a job description and either upload a resume (PDF/TXT/MD, parsed to text) or paste resume text. Scoring still uses the existing JSON `POST /job-match/score` body. Returns match score, strengths, gaps, market signals, priority gaps, citations, and suggestions.

---

## How It Works

```text
                    AI CAREER COPILOT
                           |
                 ┌─────────┴─────────┐
                 │                   │
            NEXT.JS UI          NESTJS API
            (localhost:3000)  (localhost:3001)
                                     |
                              Resume Module
                                     |
                              ResumeAnalysisService
                                     |
                                  LangGraph
                                     |
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
              Extract              Analyze             Validate
                 │                   │                   │
                 │              LLM (Groq/Gemini/Mock) │
                 │                   │                   │
                 └───────────────────┼───────────────────┘
                                     |
                                ATS Evaluation
                                     |
                                Recommendations
                                     |
                              Structured Result
                              /               \
                             /                 \
                        MongoDB               Redis
                     (source of truth)    (cache + sessions)
```

### Resume analysis pipeline

```text
Next.js /resume
   │  PDF (field: resume) or JSON text + Idempotency-Key
   ▼
AuthGuard → ResumeController → ResumeAnalysisService
   │
   ├─ Soft coin check (no charge yet)
   ├─ Idempotency cache hit? → return early
   ├─ Temp PDF → uploads/temporary-resume-<uuid>.pdf
   ├─ LangGraph: extractText → normalizeText → analyzeResume
   │              → validateOutput (retry if invalid)
   │              → atsEvaluation → generateRecommendations
   ├─ MongoDB upsert (one resume per userId)
   ├─ Redis cache (failure does not fail the request)
   ├─ Deduct 10 Interview Coins
   └─ finally: delete temporary PDF
   ▼
Next.js dashboard (ATS score, skills, experience, …)
```

| Layer | Responsibility |
|-------|----------------|
| **Next.js** | Upload UI, loading states, results — never calls Groq directly |
| **ResumeAnalysisService** | Coins, LangGraph invoke, Mongo, Redis, file cleanup |
| **LangGraph** | Extract → normalize → analyze → validate/retry → ATS → recommendations |
| **LlmService** | Provider abstraction (`mock` / `gemini` / `groq`) |
| **MongoDB** | Users, one resume analysis per user |
| **Redis** | Sessions, resume cache, idempotency keys |

### LangGraph nodes (`backend/src/ai/langgraph/resume/`)

| Node | What it does |
|------|----------------|
| `extractText` | Reads temp PDF via `pdf-parse` (or pasted text) |
| `normalizeText` | Cleans PDF artifacts without destroying structure |
| `analyzeResume` | ATS prompt + structured LLM output (Zod schema) |
| `validateOutput` | Zod validation; retry on failure |
| `atsEvaluation` | Deterministic checks blended with LLM score (0–100) |
| `generateRecommendations` | Actionable tips from extracted gaps |
| `fail` | User-safe errors (`EMPTY_RESUME`, `MAX_RETRIES_EXCEEDED`, …) |

### Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Firebase Client SDK
- **Backend:** NestJS 11, Zod, Swagger, Multer, pdf-parse
- **Resume Agent:** LangGraph + LangChain (`ChatGroq` / `ChatGoogleGenerativeAI`) / Mock
- **Auth:** Firebase + HTTP-only session cookies (Redis-backed)
- **Data:** MongoDB (Mongoose), Redis (ioredis), Qdrant (optional RAG)
- **Infra:** Docker Compose (Mongo, Redis, Qdrant)

### Project structure

```text
AI_career_copilot/
├── frontend/                     # Next.js UI
│   ├── src/app/login/            # Google sign-in screen
│   ├── src/app/dashboard/        # Authenticated home (coins, quick actions)
│   ├── src/app/resume/           # Resume Agent page
│   ├── src/components/RequireAuth.tsx  # Route protection
│   ├── src/lib/auth-context.tsx  # Auth state (user, login, logout, refresh)
│   ├── src/lib/api.ts            # Typed API client (credentials: include)
│   └── .env.local.example
├── backend/                      # NestJS API
│   ├── src/ai/langgraph/resume/  # LangGraph agent
│   ├── src/resume/               # Upload, analysis, PDF
│   ├── src/auth/                 # Firebase + sessions
│   ├── src/llm/                  # LLM providers
│   └── .env.example
├── docker-compose.yml            # Mongo, Redis, Qdrant
├── firebase-adminsdk.json        # Service account (gitignored)
└── package.json                  # Monorepo scripts
```

---

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm** 10+
- **Docker Desktop** — required for local MongoDB, Redis, and Qdrant
- **Firebase** project with Authentication enabled (Google sign-in)

---

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Copy environment templates

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit both files. **Do not commit** `.env` or `.env.local`.

### 3. Start Docker (required for local databases)

**Docker Desktop must be running** before the next step.

```bash
docker compose up -d
docker compose ps
```

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | `27017` | Users, resume storage |
| Redis | `6379` | Sessions, resume cache |
| Qdrant | `6333` | Vector search (RAG) |

Set these in `backend/.env` for local Docker:

```env
MONGODB_URI=mongodb://localhost:27017/career_copilot
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
LLM_PROVIDER=mock
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` in `frontend/.env.local`.

### 4. Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** → **Google** sign-in; confirm `localhost` is an authorized domain.
3. Register a **Web app**; copy config into `frontend/.env.local`.
4. Download the **service account JSON** → save as `firebase-adminsdk.json` in the repo root.
5. In `backend/.env`, set `FIREBASE_SERVICE_ACCOUNT_PATH=../firebase-adminsdk.json`.

See [Firebase setup](#firebase-setup-details) for full steps.

### 5. Run the app

```bash
npm run dev
```

| App | URL |
|-----|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |

### 6. Verify

```bash
curl http://localhost:3001/api/v1/health
```

Expected: `"status":"ok"`.

### 7. (Optional) Ingest RAG data

```bash
npm --prefix backend run rag:ingest
```

---

## Firebase Setup (details)

### Create project and enable auth

1. [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Authentication** → **Get started** → **Sign-in method** → enable **Google**.
3. **Settings** → **Authorized domains** → include `localhost`.

### Frontend config

Project settings → **General** → **Your apps** → **Web** → copy values into `frontend/.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Backend service account

Project settings → **Service accounts** → **Generate new private key** → save as `firebase-adminsdk.json` at repo root (gitignored).

Alternatively set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `backend/.env`.

---

## Database and Cache

### MongoDB

**Option A — Local Docker (recommended for dev)**

```env
MONGODB_URI=mongodb://localhost:27017/career_copilot
```

Requires `docker compose up -d`.

**Option B — MongoDB Atlas**

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a DB user and **whitelist your current IP** under **Network Access**.
3. Set `MONGODB_URI` to your `mongodb+srv://…` connection string.

The backend uses Google DNS (`8.8.8.8`, `1.1.1.1`) for Atlas SRV lookups on Windows.

| Collection | Purpose |
|------------|---------|
| `users` | Firebase UID (unique), email (indexed), profile, interview coins (default 150) |
| `resumes` | One analysis per user (upserted on each run) |
| `job_matches` | One row per user + JD/resume hash (history + content-addressed cache) |

### Redis

**Docker (local):** `REDIS_URL=redis://localhost:6379`

**Fallback:** If unset, in-memory cache is used (sessions/cache lost on restart).

| Key pattern | Purpose | TTL |
|-------------|---------|-----|
| `session:{random}` | User session (256-bit random id) | 7 days |
| `resume:analysis:{userId}` | Cached analysis | 24 hours |
| `resume:idem:{userId}:{requestId}` | Idempotency | 1 hour |
| `job-match:last:{userId}` | Most recent job match | 24 hours |
| `job-match:hash:{userId}:{sha256}` | Content-addressed job match | 24 hours |

### Qdrant (optional RAG)

Set `QDRANT_URL=http://localhost:6333` when using Docker. Qdrant Cloud also needs `QDRANT_API_KEY`; without it, describe/search return 403 and RAG degrades to empty context. If `QDRANT_URL` is unset, RAG returns empty context (resume analysis still works).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Failed to fetch` at `:3001` | Backend not listening | Check terminal for TypeScript or boot errors; ensure Mongo connects |
| Backend hangs on start | MongoDB Atlas IP not whitelisted | Atlas → **Network Access** → **Add Current IP Address**, or use local Docker Mongo |
| `docker compose` fails | Docker Desktop not running | Start Docker Desktop, wait until ready, retry |
| Mongo `ECONNREFUSED` | Docker Mongo not up | `docker compose up -d` and `docker compose ps` |
| Redis errors in logs | Redis container down | Same as above; or unset `REDIS_URL` for in-memory fallback |
| Resume works in curl but not browser | CORS / cookie / auth | Sign in via `/login`; ensure `CORS_ORIGIN` includes `http://localhost:3000` |
| `INSUFFICIENT_COINS` | Balance below 10 | New users get 100 coins on first login; use a fresh test user |

**Quick smoke test without Firebase (dev only):**

```bash
curl -H "x-user-id: test-user" http://localhost:3001/api/v1/health
```

---

## Environment Variables

Templates: `backend/.env.example`, `frontend/.env.local.example`. Never commit secrets.

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes* | — | Mongo connection string (*or use Docker local URI) |
| `REDIS_URL` | No | — | Redis URL for cache and sessions; in-memory if unset |
| `RESUME_QUEUE_ENABLED` | No | `false` | Set `true` to enqueue resume analysis on BullMQ (202 + poll). Default is inline 200 |
| `LLM_PROVIDER` | No | `mock` | `mock`, `gemini`, or `groq` |
| `GROQ_API_KEY` | If `groq` | — | Groq API key |
| `GEMINI_API_KEY` | If `gemini` | — | Gemini API key |
| `PORT` | No | `3001` | API port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed origins |
| `QDRANT_URL` | No | — | Qdrant for RAG |
| `QDRANT_API_KEY` | Cloud | — | Qdrant Cloud API key (not needed for local Docker) |
| `RAG_ENABLED` | No | `true` | Enable RAG retrieval |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Recommended | — | Path to service account JSON |
| `RESUME_COIN_COST` | No | `10` | Coins per successful resume analysis |
| `JOB_MATCH_COIN_COST` | No | `10` | Coins per new job-match score (cache hits are free) |
| `USER_STARTING_COINS` | No | `150` | New user balance (never reset on later logins) |
| `RESUME_MAX_FILE_SIZE_MB` | No | `20` | Max PDF size |
| `RESUME_ANALYSIS_MAX_RETRIES` | No | `2` | LangGraph retry limit |
| `REDIS_CACHE_TTL_SECONDS` | No | `86400` | Resume cache TTL |
| `SESSION_TTL_SECONDS` | No | `604800` | Session TTL (7 days) |
| `SESSION_COOKIE_SAMESITE` | No | `lax` | `lax`, `strict`, or `none` (`none` forces a secure cookie) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | e.g. `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase web app config (see template) |

---

## Testing the App

### 1. Health check

```bash
curl http://localhost:3001/api/v1/health
```

### 2. UI flow (full stack)

1. Open http://localhost:3000 → **Continue with Google** (or go to `/login`).
2. You land on http://localhost:3000/dashboard with your name, email, and coins.
3. Go to http://localhost:3000/resume.
4. Upload a text-based PDF or paste resume text (50+ chars).
5. Optional: set target role → **Analyze resume**.
6. Confirm the results show ATS score, skills, experience, recommendations.
7. Refresh page → cached result loads via `GET /resume/me`.
8. Sign out from the navbar avatar menu → you return to the landing page.

### 3. API — text analyze (dev, no login)

In development, `AuthGuard` accepts `x-user-id`:

```bash
curl -X POST http://localhost:3001/api/v1/resume/analyze \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -H "Idempotency-Key: test-run-1" \
  -d "{\"resume\":\"Jane Doe is a software engineer with five years of TypeScript, NestJS, React, MongoDB, and AWS experience.\",\"role\":\"Senior Backend Engineer\"}"
```

Expect JSON with `atsScore`, `skills`, `interviewCoins`.

### 4. API — PDF upload

```bash
curl -X POST http://localhost:3001/api/v1/resume/upload \
  -H "x-user-id: test-user" \
  -H "Idempotency-Key: pdf-run-1" \
  -F "resume=@/path/to/resume.pdf;type=application/pdf" \
  -F "role=Senior Backend Engineer"
```

Multipart field must be named `resume`.

### 5. Validation checks

| Test | Expected |
|------|----------|
| Upload non-PDF | `INVALID_FILE_TYPE` |
| PDF > 20 MB | `FILE_TOO_LARGE` |
| Empty/scanned PDF | `EMPTY_RESUME` or `PDF_EXTRACTION_FAILED`; no coin charge |
| Repeat same `Idempotency-Key` | Same response; no double coin deduction |
| Failed analysis | Coins not deducted |

### 6. Automated tests

```bash
npm test                              # backend unit tests
npm --prefix backend run test:e2e     # API e2e
npm --prefix frontend test            # frontend component tests (Vitest)
npm --prefix frontend run typecheck   # tsc --noEmit
npm run build                         # build backend + frontend
```

### 7. Groq (real LLM)

In `backend/.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

Restart `npm run dev` and re-run analyze/upload. Never put API keys in frontend env vars.

---

## Authentication Flow

```text
Browser → Firebase signInWithPopup → getIdToken()
       → POST /auth/login { idToken }
       → Firebase Admin verifyIdToken   (identity comes only from here)
       → MongoDB findOrCreate user (150 coins on sign-up, never reset)
       → Redis session:{32 random bytes} + HTTP-only session_id cookie
       → Subsequent requests use cookie (not Firebase per request)
```

The **HTTP-only cookie + Redis session is the authority**, not Firebase's client
state. The browser never sees the session id from JavaScript, and it is never
stored in `localStorage`, `sessionStorage`, or React state.

**Session restore:** the frontend calls `GET /auth/me` on startup; that call also
slides the Redis TTL forward for active users.

**Dev fallback:** `x-user-id` header when no session cookie (non-production only).

**Logout:** `POST /api/v1/auth/logout` clears Redis session and cookie.

---

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | None | Exchange Firebase ID token for session |
| `GET` | `/auth/me` | Cookie | Current session user |
| `POST` | `/auth/logout` | Cookie | Clear session |
| `GET` | `/users/me` | Cookie | Profile + coin balance |
| `GET` | `/resume/me` | Cookie | Cached/stored resume analysis |
| `POST` | `/resume/upload` | Cookie | PDF analysis (field `resume`) |
| `POST` | `/resume/analyze` | Cookie | Text or legacy PDF (field `file`) |
| `POST` | `/resume/extract` | Cookie | PDF → plain text only (no coins) |
| `POST` | `/job-match/score` | Cookie | Job vs resume match score (coins; cache hit is free) |
| `GET` | `/job-match/me` | Cookie | Most recent job match for the user |
| `GET` | `/job-match/history` | Cookie | Recent scored matches for the user |
| `GET` | `/health` | None | Health check |

All success responses: `{ success: true, data: …, meta: { requestId, timestamp } }`.

---

## Scripts Reference

### Monorepo (root)

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install root + frontend + backend deps |
| `npm run dev` | Backend + frontend (watch mode) |
| `npm run dev:backend` | NestJS only |
| `npm run dev:frontend` | Next.js only |
| `npm run build` | Production build both apps |
| `npm start` | Run production builds |
| `npm run lint` | Lint frontend and backend |
| `npm test` | Backend unit tests |

### Backend only

| Command | Description |
|---------|-------------|
| `npm --prefix backend run start:dev` | Nest watch mode |
| `npm --prefix backend run start:prod` | Run compiled `dist/main.js` |
| `npm --prefix backend run build` | Compile TypeScript |
| `npm --prefix backend test` | Jest unit tests |
| `npm --prefix backend run test:e2e` | Supertest e2e |
| `npm --prefix backend run test:cov` | Coverage report |
| `npm --prefix backend run rag:ingest` | Seed Qdrant with public datasets |

### Docker

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start Mongo, Redis, Qdrant |
| `docker compose ps` | Check container status |
| `docker compose down` | Stop containers |

---

## Production and Security

- Helmet, compression, CORS allowlist, rate limiting, request IDs, global validation (`422` on bad input).
- Swagger UI disabled in production.
- Session cookies: `httpOnly`, `sameSite: lax`, `secure` in production.
- **Never commit:** `.env`, `.env.local`, `firebase-adminsdk.json`, API keys.
- **Interview coins:** Deducted server-side only after successful Mongo persistence; idempotency keys prevent double charges.
- **`NEXT_PUBLIC_*`:** Public Firebase client config only; backend verifies all auth.

---

## Coins and Idempotency

1. Balance checked **before** LLM run.
2. **10 coins** deducted **only after** successful MongoDB write.
3. Failed analysis does **not** charge.
4. Same `Idempotency-Key` → cached result, no second charge.

Read path: `GET /resume/me` → Redis → on miss, MongoDB → warm Redis.
