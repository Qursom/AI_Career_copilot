# AI Career Copilot

AI Career Copilot is a full-stack app that helps candidates improve resumes and check fit for specific job descriptions.

It ships with:
- A polished **Next.js frontend** for resume analysis and job matching workflows.
- A **NestJS backend API** with validation, structured error handling, request IDs, throttling, and Swagger docs.
- Pluggable LLM providers:
  - `mock` (default): deterministic offline responses for fast local development.
  - `gemini`: live responses via Google Gemini when `GEMINI_API_KEY` is configured.

## What It Does

### 1) Resume Analysis
From the `/resume` page, users can paste/upload resume text and optionally set a target role.

The app returns:
- AI roast (direct feedback)
- strengths
- improvements
- missing skills
- optimized rewrite
- ATS score + ATS notes

### 2) Job Match Scoring
From the `/job-match` page, users paste a job description and resume.

The app returns:
- match score
- strengths
- gaps
- suggested edits

## How It Works (Request Flow)

1. User interacts with UI (`frontend`).
2. Frontend calls typed API client in `frontend/src/lib/api.ts`.
3. Requests hit NestJS endpoints under `/api/v1`.
4. Backend validates input DTOs and applies global middleware/interceptors/filters.
5. `LlmService` delegates to selected provider (`mock` or `gemini`).
6. Response is returned in a standard envelope, and frontend renders cards/charts.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** NestJS 11, TypeScript, Zod config validation, Swagger
- **AI:** `@google/generative-ai` with provider abstraction
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

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000

THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=30
LOG_LEVEL=log

LLM_PROVIDER=mock
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
LLM_TIMEOUT_MS=30000
```

Notes:
- Keep `LLM_PROVIDER=mock` for offline deterministic behavior.
- Set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` to use live Gemini output.

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
