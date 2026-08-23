# AICareerCopilot

**SaaS for job seekers:** roast a resume, rewrite for ATS, and score fit against any job description — then apply with numbers you can defend.

This is a shipped product (and a portfolio case study of a full-stack AI SaaS): accounts, usage metering, LLM pipelines, optional market RAG, and production deploy.

| | |
|---|---|
| **App** | [ai-career-copilot-hazel.vercel.app](https://ai-career-copilot-hazel.vercel.app) |
| **API** | [ai-career-copilot-7iee.onrender.com](https://ai-career-copilot-7iee.onrender.com) |
| **Support** | [wandertech58@gmail.com](mailto:wandertech58@gmail.com) · [/contact](https://ai-career-copilot-hazel.vercel.app/contact) |

---

## Problem

Job seekers rewrite resumes in the dark: generic ChatGPT output, no ATS signal, no proof they match a specific posting. Hiring software still filters on keywords and structure. Candidates need **role-specific** feedback tied to **their** document, not a generic essay.

## Solution

AICareerCopilot is a **usage-based SaaS workspace**:

1. Sign in (Google or email).  
2. Analyze a resume (PDF or paste).  
3. Match it to a real job description.  
4. Pay in **coins** only when a run succeeds.

Identity is one Firebase user, one Mongo profile, one coin balance. Google and password can be linked on the same account; emails are never auto-merged.

---

## Product surface

| Module | What the user gets |
|--------|-------------------|
| **Dashboard** | Coins, shortcuts to resume and job match |
| **Resume analysis** | ATS notes, roast, strengths/gaps, rewrite direction, parsed profile |
| **Job match** | Fit score, missing requirements, bullets that close gaps |
| **Account** | Linked sign-in methods (Google / email-password), coins |
| **Billing** | Coin packs (Stripe when connected; otherwise starting grant) |
| **Contact** | Support mailto |

**Metering:** 20 coins on signup · 10 coins per successful analysis · 0 on failure · cached identical job-match is free.

---

## Customer journey

```text
Land → Sign in
         │
         ▼
    Dashboard (20 coins)
         │
         ├─ Resume  →  PDF/text + optional target role
         │              roast · ATS · rewrite
         │
         └─ Job match  →  JD + resume
                        score · gaps · tailored bullets
         │
         ▼
    Copy output → apply
```

Password reset and email verification are handled by Firebase (link in email, then return to the app).

---

## How the platform works

```mermaid
flowchart LR
  user[User]
  ui[Web app Vercel]
  fb[Firebase Auth]
  api[API Render]
  mongo[MongoDB]
  redis[Upstash]
  llm[Gemini or Groq]
  rag[Qdrant RAG optional]

  user --> ui
  ui --> fb
  ui -->|"session cookie"| api
  api -->|"verify ID token"| fb
  api --> mongo
  api --> redis
  api --> llm
  api -.-> rag
```

### Auth and tenancy

- Client signs in with Firebase; browser sends **ID token only**.  
- API verifies with Firebase Admin, then `findOrCreate` Mongo by **`firebaseUid`**.  
- Session is an **HTTP-only cookie** (Redis/Upstash). No session id in `localStorage`.  
- Coins live on the user document; the client cannot pick another UID.

### Resume pipeline

Extract text → normalize → **optional RAG retrieve** → LLM analyze → validate/retry → ATS → recommendations → **charge 10 coins** → persist.

### Job match pipeline

Content-hash cache (hit = free) → **optional RAG** → structured LLM → **evidence-weighted score in code** → charge → persist.

The headline match % is finalized from requirement evidence (`job-match.score.ts`), not a raw model guess.

---

## RAG (market context)

RAG is a **product capability**, not a demo stub. Labor-market snippets (skills, roles, sources) can be retrieved from Qdrant and injected into resume and job-match prompts.

**Live cloud may run with RAG off** until Qdrant is ingested. Features still return analysis; market citations are empty rather than invented.

| Mode | Behavior |
|------|----------|
| On (`RAG_ENABLED` + Qdrant + ingest) | Embed query, retrieve hits, attach market signals / gaps / citations |
| Off or misconfigured | Empty context; roast, ATS, and match still run |

Ingest: `npm run rag:ingest` (from `backend/`). Embeddings (`mock` or `gemini`) must match what was ingested.

---

## Stack (portfolio)

| Layer | Choice |
|-------|--------|
| Product UI | Next.js, static export, Vercel |
| API | NestJS, Docker, Render |
| Auth | Firebase (Google + email/password + linking) |
| Data | MongoDB Atlas (users, analyses) |
| Session / cache | Upstash Redis REST |
| AI | Gemini or Groq; LangGraph-style resume graph |
| Retrieval | Qdrant (optional) |
| Payments | Stripe coin packs (code ready; keys optional) |

This is the architecture you’d show as a **full SaaS slice**: auth, billing primitives, async-capable jobs, LLM orchestration, and graceful RAG degrade.

---

## Pricing (SaaS)

Coin-metered, not a monthly seat (current model):

| Event | Coins |
|-------|-------|
| New account | +20 |
| Successful resume or job-match run | −10 |
| Failed run | 0 |
| Repeat job match (same hash) | 0 |

Stripe packs (Starter / Plus / Pro) appear when billing keys are configured.

---

## Trust

Resumes are used to generate **that user’s** results, not to train public models in this product. Passwords never touch MongoDB. Production cookies are `SameSite=None` + HTTPS so Vercel can talk to Render.

---

## Run locally

Node 20+, Docker, Firebase project.

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up -d
npm run dev
```

App: http://localhost:3000 · API: http://localhost:3001 (`/` and `/api/v1/health`).

Templates: `backend/.env.example`, `frontend/.env.example` (local only). Do not commit secrets or `firebase-adminsdk.json`.

**Production:** Vercel (`NEXT_PUBLIC_API_URL`, Firebase public config) + Render (`CORS_ORIGIN` / `FRONTEND_URL` = exact UI origin, Mongo, Upstash, LLM keys). Set `RAG_ENABLED=true` only after Qdrant + ingest.

---

## API (authenticated unless noted)

`/api/v1` — `POST /auth/login` `{ idToken }` · `GET /auth/me` · `POST /auth/logout` · `GET /health` · resume analyze/upload/extract · `POST /job-match/score` · `GET /billing/packs`.

---

## Repo

```text
frontend/    Product UI
backend/     API, LangGraph resume, job match, RAG
render.yaml  API (and optional web) Docker
```

---

## Contact

**wandertech58@gmail.com** · in-app Contact. API notes: [backend/README.md](backend/README.md).
