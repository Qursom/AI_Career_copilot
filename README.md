# AI Career Copilot

Monorepo with a **Next.js** frontend and a **NestJS** backend.

```
AI_career_copilot/
├── frontend/   # Next.js 15 (App Router, TypeScript, Tailwind CSS)
└── backend/    # NestJS 11 (TypeScript)
```

## Prerequisites

- Node.js 20+ (tested on 22)
- npm 10+

## Quick start

Install dependencies for the root, frontend and backend in one go:

```bash
npm run install:all
```

Copy the example env files:

```bash
# Windows PowerShell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.local.example frontend\.env.local
```

Start both apps together (backend on `:3001`, frontend on `:3000`):

```bash
npm run dev
```

Open http://localhost:3000 — the page will call the NestJS API and display the health status.

## Scripts

| Command                   | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Run frontend + backend concurrently in watch mode    |
| `npm run dev:frontend`    | Only the Next.js dev server                          |
| `npm run dev:backend`     | Only the NestJS dev server                           |
| `npm run build`           | Build both apps for production                       |
| `npm start`               | Run both apps in production mode                     |
| `npm run lint`            | Lint both apps                                       |
| `npm test`                | Run the backend test suite                           |

## Backend (NestJS)

- URL: `http://localhost:3001/api`
- Endpoints:
  - `GET /api` → greeting message
  - `GET /api/health` → `{ status, uptime, timestamp }`
- CORS is enabled for the origin defined in `CORS_ORIGIN` (defaults to `http://localhost:3000`).

Env vars (`backend/.env`):

```
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Frontend (Next.js)

- URL: `http://localhost:3000`
- API base URL is read from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`).
- API helper lives in `frontend/src/lib/api.ts`.

Env vars (`frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Next steps

- Add auth (e.g. NextAuth on the frontend, Passport/JWT guards on the backend).
- Add a database via a NestJS module (Prisma, TypeORM, Drizzle, etc.).
- Create domain modules in `backend/src/` (e.g. `resumes`, `interviews`, `coach`).
- Split `frontend/src/lib/api.ts` into per-resource clients as the API grows.
