/**
 * Typed client for the AI Career Copilot backend.
 *
 * The backend always returns one of two envelopes:
 *
 *   Success: { success: true,  data: <T>, meta: { requestId, timestamp } }
 *   Error:   { success: false, error: { code, message, details? }, meta: { requestId, timestamp, path } }
 *
 * This module unwraps both shapes so callers get a typed value or a typed
 * `ApiError` — never a raw response.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// ---------- Envelope types ----------

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta: { requestId: string; timestamp: string };
}

interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: { requestId: string; timestamp: string; path: string };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

// ---------- Domain types (match backend DTOs) ----------

export interface HealthStatus {
  status: "ok";
  env: string;
  version: string;
  uptime: number;
  timestamp: string;
  llmProvider: string;
  llmProviderEnv: string;
  ragEnabled: boolean;
}

export interface ResumeAnalysis {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  projects: string[];
  experience: string[];
  education: string[];
  roast: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  recommendations: string[];
  missingSkills: string[];
  suggestedJobRole: string;
  marketSignals: string[];
  priorityGaps: string[];
  citations: string[];
  optimized: string;
  atsScore: number;
  atsNotes: string;
  interviewCoins?: number;
}

export interface ResumeJobAccepted {
  jobId: string;
  status: "queued" | "active";
}

export interface ResumeJobStatus {
  jobId: string;
  status: "queued" | "active" | "completed" | "failed";
  progress?: { step: string; percent: number };
  result?: ResumeAnalysis;
  error?: { code: string; message: string };
}

export function isResumeJobAccepted(
  value: unknown,
): value is ResumeJobAccepted {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.jobId === "string" &&
    typeof v.status === "string" &&
    !("atsScore" in v)
  );
}

export interface AnalyzeResumeInput {
  resume: string;
  role?: string;
}

export interface MatchResult {
  score: number;
  strengths: string[];
  gaps: string[];
  marketSignals: string[];
  priorityGaps: string[];
  citations: string[];
  suggestions: string[];
  interviewCoins?: number;
  cached?: boolean;
}

export interface JobMatchHistoryItem {
  contentHash: string;
  score: number;
  jobPreview: string;
  createdAt: string;
}

export interface ScoreMatchInput {
  jobDescription: string;
  resume: string;
}

// ---------- Error type ----------

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly details?: unknown;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
    this.details = args.details;
  }

  /** Convenience helpers used by the UI for tailored copy. */
  get isValidation(): boolean {
    return this.status === 422;
  }
  get isRateLimit(): boolean {
    return this.status === 429;
  }
  get isUpstream(): boolean {
    return this.status === 503;
  }
}

// ---------- Core request function ----------

export interface UserProfile {
  id?: string;
  userId: string;
  name?: string;
  email: string;
  photoUrl?: string;
  interviewCoins: number;
  resumeCoinCost?: number;
  jobMatchCoinCost?: number;
}

export interface AuthUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  photoUrl: string;
  interviewCoins: number;
}

export type AuthHeaders = {
  token?: string;
  userId?: string;
  idempotencyKey?: string;
};

// ---------- Session expiry notification ----------

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Notifies subscribers when a *protected* endpoint rejects the session cookie,
 * so the auth provider can drop its cached user instead of rendering a
 * signed-in UI backed by a dead session. `/auth/*` is excluded: a 401 there is
 * the normal "not signed in yet" answer, not an expiry.
 */
export function onSessionExpired(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifySessionExpired(path: string): void {
  if (path.startsWith("/auth/")) return;
  for (const listener of unauthorizedListeners) listener();
}

async function request<T>(
  path: string,
  init?: RequestInit,
  auth?: AuthHeaders,
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (!isForm) {
    headers["Content-Type"] = "application/json";
  }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  if (auth?.userId) {
    headers["x-user-id"] = auth.userId;
  }
  if (auth?.idempotencyKey) {
    headers["Idempotency-Key"] = auth.idempotencyKey;
  }
  const extra = init?.headers;
  if (extra && extra instanceof Headers) {
    extra.forEach((v, k) => {
      headers[k] = v;
    });
  } else if (extra && !Array.isArray(extra)) {
    Object.assign(headers, extra);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError({
      status: 0,
      code: "NETWORK",
      message:
        err instanceof Error
          ? `Cannot reach the API at ${API_BASE_URL} (${err.message}). Start the backend with npm run dev or npm --prefix backend run start:dev.`
          : `Cannot reach the API at ${API_BASE_URL}. Start the backend with npm run dev.`,
      requestId: "offline",
    });
  }

  const requestIdHeader = res.headers.get("X-Request-Id") ?? "unknown";

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response — treat as generic error.
  }

  if (!res.ok || !body || body.success === false) {
    if (res.status === 401) {
      notifySessionExpired(path);
    }
    if (body && body.success === false) {
      throw new ApiError({
        status: res.status,
        code: body.error.code,
        message: body.error.message,
        requestId: body.meta.requestId ?? requestIdHeader,
        details: body.error.details,
      });
    }
    throw new ApiError({
      status: res.status,
      code: "HTTP_ERROR",
      message: `Request failed: ${res.status} ${res.statusText}`,
      requestId: requestIdHeader,
    });
  }

  return body.data;
}

export type ResumeJobProgressHandler = (progress: {
  step: string;
  percent: number;
}) => void;

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 180_000;

async function submitResumeAnalysis(
  path: string,
  init: RequestInit,
  auth?: AuthHeaders,
  onProgress?: ResumeJobProgressHandler,
): Promise<ResumeAnalysis> {
  const data = await request<ResumeAnalysis | ResumeJobAccepted>(
    path,
    init,
    auth,
  );
  if (!isResumeJobAccepted(data)) return data;
  onProgress?.({ step: data.status, percent: data.status === "active" ? 10 : 0 });
  return pollResumeJob(data.jobId, auth, onProgress);
}

async function pollResumeJob(
  jobId: string,
  auth?: AuthHeaders,
  onProgress?: ResumeJobProgressHandler,
): Promise<ResumeAnalysis> {
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const status = await request<ResumeJobStatus>(
      `/resume/status/${encodeURIComponent(jobId)}`,
      undefined,
      auth,
    );
    if (status.progress) onProgress?.(status.progress);
    if (status.status === "completed" && status.result) {
      return status.result;
    }
    if (status.status === "failed") {
      throw new ApiError({
        status: 503,
        code: status.error?.code ?? "LLM_ERROR",
        message:
          status.error?.message ??
          "Resume analysis failed. Please try again.",
        requestId: jobId,
      });
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new ApiError({
    status: 504,
    code: "LLM_TIMEOUT",
    message: "Resume analysis is taking too long. Check back from this page, or retry.",
    requestId: jobId,
  });
}

// ---------- Public API surface ----------

export const api = {
  getRoot: (auth?: AuthHeaders) =>
    request<{ message: string }>("/", undefined, auth),
  getHealth: (auth?: AuthHeaders) => request<HealthStatus>("/health", undefined, auth),

  loginWithIdToken: (idToken: string) =>
    request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  authMe: () => request<{ user: AuthUser }>("/auth/me"),

  logout: () =>
    request<{ ok: true }>("/auth/logout", {
      method: "POST",
    }),

  getMe: (auth?: AuthHeaders) =>
    request<UserProfile>("/users/me", undefined, auth),

  getMyResume: (auth?: AuthHeaders) =>
    request<ResumeAnalysis>("/resume/me", undefined, auth),

  getResumeJob: (jobId: string, auth?: AuthHeaders) =>
    request<ResumeJobStatus>(
      `/resume/status/${encodeURIComponent(jobId)}`,
      undefined,
      auth,
    ),

  analyzeResume: (
    input: AnalyzeResumeInput,
    auth?: AuthHeaders,
    onProgress?: ResumeJobProgressHandler,
  ) =>
    submitResumeAnalysis(
      "/resume/analyze",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      auth,
      onProgress,
    ),

  analyzeResumePdf: (
    file: File,
    role: string | undefined,
    auth?: AuthHeaders,
    onProgress?: ResumeJobProgressHandler,
  ) => {
    const body = new FormData();
    body.append("resume", file);
    if (role) body.append("role", role);
    return submitResumeAnalysis(
      "/resume/upload",
      { method: "POST", body },
      auth,
      onProgress,
    );
  },

  /** Parse a PDF into plain text. No analysis and no coin charge. */
  extractResumePdf: (file: File, auth?: AuthHeaders) => {
    const body = new FormData();
    body.append("resume", file);
    return request<{ text: string }>(
      "/resume/extract",
      { method: "POST", body },
      auth,
    );
  },

  /** @deprecated Prefer analyzeResumePdf — kept for compatibility with field name "file". */
  analyzeResumePdfLegacy: (
    file: File,
    role: string | undefined,
    auth?: AuthHeaders,
    onProgress?: ResumeJobProgressHandler,
  ) => {
    const body = new FormData();
    body.append("file", file);
    if (role) body.append("role", role);
    return submitResumeAnalysis(
      "/resume/analyze",
      { method: "POST", body },
      auth,
      onProgress,
    );
  },

  scoreJobMatch: (input: ScoreMatchInput, auth?: AuthHeaders) =>
    request<MatchResult>(
      "/job-match/score",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      auth,
    ),

  getMyJobMatch: (auth?: AuthHeaders) =>
    request<MatchResult>("/job-match/me", undefined, auth),

  getMyJobMatchHistory: (auth?: AuthHeaders) =>
    request<JobMatchHistoryItem[]>("/job-match/history", undefined, auth),
};
