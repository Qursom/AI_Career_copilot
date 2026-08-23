# AICareerCopilot

**Roast weak bullets. Rewrite for ATS. Match any job description.** Then apply with a score you can stand behind.

AICareerCopilot is a SaaS workspace for job seekers: one account, coin-based usage, and AI that stays on your resume and the job you are targeting — not a generic chatbot.

| | |
|---|---|
| **Product** | [ai-career-copilot-hazel.vercel.app](https://ai-career-copilot-hazel.vercel.app) |
| **API** | [ai-career-copilot-7iee.onrender.com](https://ai-career-copilot-7iee.onrender.com) |
| **Contact** | [wandertech58@gmail.com](mailto:wandertech58@gmail.com) · in-app [/contact](https://ai-career-copilot-hazel.vercel.app/contact) |

---

## Who it is for

People who already have a resume and a role in mind — engineers, PMs, designers, and career switchers who want **specific** feedback, not “add more action verbs.”

---

## Product

### Resume analysis

Upload a PDF or paste text. Optionally set a target role. One run returns:

- ATS score and parser-facing notes  
- Roast (specific, not generic)  
- Strengths, gaps, and improvements  
- Optimized rewrite direction  
- Skills, experience, education, and suggested role  

**10 coins** per successful analysis. Failed runs are not charged.

### Job match

Paste any job description with your resume. You get a match score, missing requirements, and bullets that close the gaps. Same coin model: **charged only when the run succeeds.**

### Account and coins

| | |
|---|---|
| Sign-up bonus | **20 coins** for new users |
| Analysis | **10 coins** per successful resume or job-match run |
| Failures | **0 coins** |
| Identity | One Firebase user = one app user = one coin balance |

Google and email/password can both be on the **same** account after you sign in with the existing method and link the other in **Account settings**. We never merge two accounts just because the email matches.

---

## How customers use it

```text
Sign in (Google or email)
        │
        ▼
   Dashboard — coins, resume, job match
        │
        ├─ Analyze resume  →  roast + ATS + rewrite
        └─ Match a job     →  score + gaps + tailored bullets
        │
        ▼
   Copy what you need and apply
```

Password reset uses Firebase’s email link (set the new password on that page, then sign in here). Email verification is available after a password is on the account.

---

## Trust and privacy

- Your resume is used to generate **your** analysis, not to train public models in this product.  
- Auth is Firebase. The API trusts **verified Firebase ID tokens**, then looks up MongoDB by **Firebase UID** only.  
- Sessions live in an **HTTP-only cookie**. The browser never stores a session id in `localStorage`.  
- Passwords are stored by Firebase, never in our database.

---

## Pricing model (SaaS)

Usage is **coin-metered**, not a monthly seat (today):

1. New account starts with a free coin grant.  
2. Each successful AI run deducts coins server-side **after** the result is saved.  
3. The same request with the same idempotency key is not billed twice.  
4. Coin packs / Stripe checkout can be enabled when billing is connected; until then, starting coins and any admin credits are the path to usage.

---

## Architecture (short)

```text
  Browser (Next.js, Vercel)
           │  Firebase sign-in
           │  ID token → POST /auth/login
           ▼
  API (NestJS, Render Docker)
           │  verifyIdToken → firebaseUid
           ▼
  MongoDB (users, analyses)     Upstash Redis (sessions, cache)
           │
           ▼
  LLM (Gemini / Groq) + optional market RAG
```

| Layer | Role |
|--------|------|
| **Frontend** | Next.js UI, Firebase client auth, provider linking |
| **API** | NestJS, session cookie, coins, resume + job-match pipelines |
| **Auth** | Firebase (Google + email/password); Admin SDK on the API |
| **Data** | MongoDB by `firebaseUid`; Redis/Upstash for sessions |
| **AI** | LangGraph-style resume graph; job match with requirement evidence |

Production: **UI on Vercel**, **API on Render**. Local: Next + Nest + Docker Mongo/Redis (optional).

---

## Local development

**Need:** Node.js 20+ (22 recommended), npm 10+, Docker Desktop for local Mongo/Redis, a Firebase project (Google + Email/Password enabled).

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

docker compose up -d
npm run dev
```

| App | URL |
|-----|-----|
| App | http://localhost:3000 |
| API | http://localhost:3001 (health: `/` and `/api/v1/health`) |

Frontend local API: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`  
Backend local CORS: `CORS_ORIGIN=http://localhost:3000`

Templates: [backend/.env.example](backend/.env.example), [frontend/.env.example](frontend/.env.example). **Never commit** `.env`, `.env.local`, or `firebase-adminsdk.json`.

---

## Production checklist

**Firebase**

- Email/Password and Google enabled  
- Authorized domains: `localhost` and your Vercel host  
- One account per email (prevent duplicate Firebase users)  
- Admin credentials on Render as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (not a JSON file in Docker)

**Render (API)**

- `NODE_ENV=production`  
- `CORS_ORIGIN` and `FRONTEND_URL` = exact Vercel origin (`https`, no trailing slash)  
- `SESSION_COOKIE_SAMESITE=none` (cross-site cookie)  
- MongoDB Atlas + Upstash REST URL/token  
- `USER_STARTING_COINS=20` if you override the default  

**Vercel (UI)**

- Framework: static export as configured (`output: "export"`)  
- `NEXT_PUBLIC_API_URL=https://<your-api>/api/v1`  
- Matching `NEXT_PUBLIC_FIREBASE_*`  

---

## API surface (authenticated unless noted)

Base: `/api/v1`

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/auth/login` | Body: `{ idToken }` only. Identity from Firebase Admin. |
| `GET` | `/auth/me` | Current user + coins |
| `POST` | `/auth/logout` | Clears session cookie |
| `GET` | `/health` | Public liveness |
| `POST` | `/resume/analyze` or upload | 10 coins on success |
| `POST` | `/job-match/...` | Match vs job description |

Users are loaded with `findOne({ firebaseUid })`. Email is stored, not used as the primary key.

---

## Repo layout

```text
AI_career_copilot/
├── frontend/     Next.js app (Vercel)
├── backend/      NestJS API (Render Docker)
├── render.yaml
└── README.md     This product guide
```

---

## Support

Questions, billing, or account issues: **wandertech58@gmail.com** or the in-app Contact page.

For engineers extending the API, see [backend/README.md](backend/README.md).
