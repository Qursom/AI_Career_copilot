export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
interface ApiSuccessEnvelope<T> { success: true; data: T; meta: { requestId: string; timestamp: string }; }
interface ApiErrorEnvelope { success: false; error: { code: string; message: string; details?: unknown }; meta: { requestId: string; timestamp: string; path: string }; }
type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface HealthStatus { status: "ok"; env: string; version: string; uptime: number; timestamp: string; llmProvider: string; llmProviderEnv: string; ragEnabled: boolean; }
export interface ResumeAnalysis { roast: string; strengths: string[]; improvements: string[]; missingSkills: string[]; marketSignals: string[]; priorityGaps: string[]; citations: string[]; optimized: string; atsScore: number; atsNotes: string; }
export interface AnalyzeResumeInput { resume: string; role?: string; }
export interface MatchResult { score: number; strengths: string[]; gaps: string[]; marketSignals: string[]; priorityGaps: string[]; citations: string[]; suggestions: string[]; }
export interface ScoreMatchInput { jobDescription: string; resume: string; }
export interface QuickFix { priority: "HIGH"|"MEDIUM"|"LOW"; section: "SUMMARY"|"EXPERIENCE"|"SKILLS"|"PROJECT"|"COVER_LETTER"|"ATS"; issue: string; recommendation: string; before?: string; after?: string; reason: string; }
export interface ResumeEvaluationResult { verdict: "SHORTLIST"|"MAYBE"|"REJECT"; overallScore: number; confidence: number; summary: string; resume: { score: number; atsScore: number; strengths: string[]; weaknesses: string[]; missingSkills: string[]; missingKeywords: string[]; atsIssues: string[] }; coverLetter?: { score: number; strengths: string[]; weaknesses: string[]; issues: string[] }; match: { requiredSkillsMatched: string[]; requiredSkillsMissing: string[]; preferredSkillsMatched: string[]; keywordCoverage: number; experienceAlignment: number }; marketSignals: string[]; priorityGaps: string[]; recruiterPerspective: string; quickFixes: QuickFix[]; citations: { title: string; url?: string; evidence?: string }[]; }
export interface EvaluateResumeInput { resume: string; jobDescription: string; coverLetter?: string; targetRole?: string; }

export class ApiError extends Error { readonly status: number; readonly code: string; readonly requestId: string; readonly details?: unknown; constructor(args: {status:number;code:string;message:string;requestId:string;details?:unknown}) { super(args.message); this.name="ApiError"; this.status=args.status; this.code=args.code; this.requestId=args.requestId; this.details=args.details; } get isValidation(){return this.status===422;} get isRateLimit(){return this.status===429;} get isUpstream(){return this.status===503;} }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_BASE_URL}${path}`, {...init, headers:{"Content-Type":"application/json",Accept:"application/json",...(init?.headers??{})}, cache:"no-store"}); }
  catch(err){ throw new ApiError({status:0,code:"NETWORK",message:err instanceof Error?`Cannot reach the API: ${err.message}`:"Cannot reach the API.",requestId:"offline"}); }
  const requestIdHeader=res.headers.get("X-Request-Id")??"unknown";
  let body: ApiEnvelope<T>|null=null; try{body=await res.json() as ApiEnvelope<T>;}catch{}
  if(!res.ok||!body||body.success===false){ if(body&&body.success===false) throw new ApiError({status:res.status,code:body.error.code,message:body.error.message,requestId:body.meta.requestId??requestIdHeader,details:body.error.details}); throw new ApiError({status:res.status,code:"HTTP_ERROR",message:`Request failed: ${res.status} ${res.statusText}`,requestId:requestIdHeader}); }
  return body.data;
}

export const api = {
  getRoot: () => request<{message:string}>("/"),
  getHealth: () => request<HealthStatus>("/health"),
  analyzeResume: (input: AnalyzeResumeInput) => request<ResumeAnalysis>("/resume/analyze", {method:"POST",body:JSON.stringify(input)}),
  scoreJobMatch: (input: ScoreMatchInput) => request<MatchResult>("/job-match/score", {method:"POST",body:JSON.stringify(input)}),
  evaluateResume: (input: EvaluateResumeInput) => request<ResumeEvaluationResult>("/resume/evaluate", {method:"POST",body:JSON.stringify(input)}),
};
