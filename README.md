# AI Career Copilot

AI Career Copilot is a full-stack app that helps candidates improve resumes and check fit for specific job descriptions.

It ships with:
- A polished **Next.js frontend** for resume analysis and job matching workflows.
- A **NestJS backend API** with validation, structured error handling, request IDs, throttling, and Swagger docs.
- A **RAG layer** (interfaces kept; retrieval currently returns empty context until a vector store is wired). Seed corpora remain in-repo for a future ingest.
- Pluggable **chat** LLM providers (`LLM_PROVIDER`):
  - `mock` (default in `.env.example`): deterministic offline JSON for local development.
  - `gemini`: when `GEMINI_API_KEY` is set.
- **Embeddings** providers exist (`RAG_EMBEDDING_PROVIDER=gemini`) but are not queried until a vector store is added.

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
5. `RagService` currently returns empty RAG context (no vector store configured).
6. `LlmService` delegates to the selected provider (`mock` or `gemini`) with retrieved context injected into prompts.
7. Response is returned in a standard envelope, and frontend renders cards/charts.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** NestJS 11, TypeScript, Zod config validation, Swagger
- **AI:** Google Gemini via pluggable LLM providers (`mock` for local/dev)
- **Retrieval:** RAG interfaces + seed corpus; no vector DB wired (empty context / ingest skip)
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
| **Chat (resume / job match JSON)** | `LLM_PROVIDER` (`mock` \| `gemini`), `GEMINI_API_KEY` (if `gemini`), `GEMINI_MODEL` |
| **RAG** | `RAG_ENABLED` (empty context when `false` or when no vector store is configured) |

Notes:

- Market-signal / citation fields may be empty until a vector store is wired.
- `npm --prefix backend run rag:ingest` logs a skip message and does not error.

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
- `npm --prefix backend run rag:ingest` - no-op until a vector store is configured (logs skip)

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
