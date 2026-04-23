# AI Career Copilot

AI Career Copilot is a full-stack app that helps candidates improve resumes and check fit for specific job descriptions.

It ships with:
- A polished **Next.js frontend** for resume analysis and job matching workflows.
- A **NestJS backend API** with validation, structured error handling, request IDs, throttling, and Swagger docs.
- A **RAG pipeline** (Pinecone) with **OpenAI** or **Gemini** embeddings, plus a seeded corpus: public O*NET-style role skills + a **comparison** resume/JD/skill text set. Run `rag:ingest` to upsert vectors (see [Environment variables](#environment-variables)).
- Pluggable **chat** LLM providers (`LLM_PROVIDER`):
  - `mock` (default in `.env.example`): deterministic offline JSON for local development.
  - `openai`: resume + job-match when `OPENAI_API_KEY` is set.
  - `gemini`: when `GEMINI_API_KEY` is set.
- **Embeddings** for RAG are separate (`RAG_EMBEDDING_PROVIDER`): use `openai` with `text-embedding-3-*` or `gemini` with the configured `GEMINI_EMBEDDING_*` models. Index **dimensions** in Pinecone must match `OPENAI_EMBEDDING_DIMENSIONS` or `GEMINI_EMBEDDING_DIMENSIONS`.

## What It Does

### 1) Resume Analysis
From the `/resume` page, users can paste/upload resume text and optionally set a target role.

The app returns:
- AI roast (direct feedback)
- strengths
- improvements
- missing skills
- market signals (RAG-grounded)
- priority gaps (market-aware)
- citations for retrieved role evidence
- optimized rewrite
- ATS score + ATS notes

### 2) Job Match Scoring
From the `/job-match` page, users paste a job description and resume.

The app returns:
- match score
- strengths
- gaps
- market signals (RAG-grounded)
- priority gaps (market-aware)
- citations for retrieved role evidence
- suggested edits

## How It Works (Request Flow)

1. User interacts with UI (`frontend`).
2. Frontend calls typed API client in `frontend/src/lib/api.ts`.
3. Requests hit NestJS endpoints under `/api/v1`.
4. Backend validates input DTOs and applies global middleware/interceptors/filters.
5. `RagService` embeds query text, retrieves top matches from Pinecone, and builds evidence context.
6. `LlmService` delegates to the selected provider (`mock`, `openai`, or `gemini`) with retrieved context injected into prompts.
7. Response is returned in a standard envelope, and frontend renders cards/charts.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** NestJS 11, TypeScript, Zod config validation, Swagger
- **AI:** OpenAI and Google Generative AI via pluggable LLM and embedding providers
- **Retrieval:** Pinecone with seeded vectors (O*NET-style + comparison corpus); CLI ingestion via `npm --prefix backend run rag:ingest`
- **Quality/ops:** ESLint, Jest (backend), throttling, helmet, compression, request tracing

## Project Structure

```text
AI_career_copilot/
├── frontend/   # Next.js app (UI + typed API client)
├── backend/    # NestJS API (modules: resume, job-match, health, llm)
└── package.json # monorepo scripts
```

## Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+

## Setup

Install dependencies for root, frontend, and backend:

```bash
npm run install:all
```

Copy environment files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.local.example frontend\.env.local
```

## Run Locally

Start both apps in development mode:

```bash
npm run dev
```

Default URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api/v1`
- Swagger (non-production): `http://localhost:3001/api/docs`

## Environment Variables

The canonical template is [`backend/.env.example`](backend/.env.example). Copy it to `backend/.env` and fill in keys.

### Backend (`backend/.env`) — important pairs

| Concern | Variables |
|--------|-----------|
| **Chat (resume / job match JSON)** | `LLM_PROVIDER`, `OPENAI_API_KEY` (if `openai`), `OPENAI_MODEL`, optional `OPENAI_MAX_COMPLETION_TOKENS` |
| **RAG embeddings** | `RAG_EMBEDDING_PROVIDER` (`openai` \| `gemini`), matching `OPENAI_*` or `GEMINI_EMBEDDING_*` + `OPENAI_API_KEY` or `GEMINI_API_KEY` |
| **Pinecone** | `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_NAMESPACE`, optional `PINECONE_HOST` (serverless), `PINECONE_MIN_SCORE` (default `0.45` in schema if unset; lower e.g. `0.35` if nothing retrieves) |

Notes:

- `OPENAI_API_KEY` is used both for `LLM_PROVIDER=openai` and for `RAG_EMBEDDING_PROVIDER=openai` (same key is fine). If the key is empty while RAG expects OpenAI embeddings, retrieval uses noop embeddings and **ingest** skips vectors.
- Create a Pinecone index whose **vector dimension** matches your embedding model (e.g. **3072** for `text-embedding-3-large` with `OPENAI_EMBEDDING_DIMENSIONS=3072`).
- **Ingestion is manual:** after keys and index match, run:

```bash
npm --prefix backend run rag:ingest
```

You should see a log like `RAG ingestion complete: processed=31, upserted=31` (counts depend on the seed). If you see `429` / quota from OpenAI, add billing or use `RAG_EMBEDDING_PROVIDER=gemini` with a valid `GEMINI_API_KEY` and a **768**-dim index to match `GEMINI_EMBEDDING_DIMENSIONS`.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

- `GET /` - Root API message
- `GET /health` - Health payload (status, uptime, env, provider)
- `POST /resume/analyze` - Resume analysis
- `POST /job-match/score` - Resume vs JD scoring

## Available Scripts

From the repository root:

- `npm run install:all` - install dependencies for all packages
- `npm run dev` - run backend + frontend in watch mode
- `npm run dev:backend` - run only NestJS backend
- `npm run dev:frontend` - run only Next.js frontend
- `npm run build` - build backend and frontend
- `npm start` - run both apps in production mode
- `npm run lint` - lint frontend and backend
- `npm test` - run backend tests
- `npm --prefix backend run rag:ingest` - embed + upsert public role-skill corpus into Pinecone

## Production Notes

- Backend enables:
  - secure headers (`helmet`)
  - compression
  - CORS allowlist
  - global validation pipe (`422` on validation failures)
  - rate limiting
  - request ID middleware and structured response envelope
- Swagger UI is available only outside production.

## Current Scope

This repository currently focuses on:
- resume analysis and rewrite guidance
- job description match scoring
- API reliability and strong local-dev ergonomics

Potential next steps:
- authentication and user accounts
- persistent storage for sessions/history
- export/share flows for generated outputs
