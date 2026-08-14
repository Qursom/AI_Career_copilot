"use client";
import { useState } from "react";
import { api, ApiError, type ResumeEvaluationResult } from "@/lib/api";

const box = "w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-white outline-none focus:border-indigo-400/50";

export default function ApplicationReviewPage() {
  const [targetRole,setTargetRole]=useState(""); const [resume,setResume]=useState(""); const [job,setJob]=useState(""); const [cover,setCover]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [result,setResult]=useState<ResumeEvaluationResult|null>(null);
  const submit=async()=>{setError("");setLoading(true);try{setResult(await api.evaluateResume({resume,jobDescription:job,coverLetter:cover.trim()||undefined,targetRole:targetRole.trim()||undefined}));}catch(e){setError(e instanceof ApiError?e.message:String(e));}finally{setLoading(false);}};
  return <main className="max-w-6xl mx-auto px-6 py-10">
    <div className="mb-8"><span className="chip glass text-white/70">AI Application Review</span><h1 className="mt-4 text-4xl font-semibold">Should you apply? <span className="text-gradient">Know before you send.</span></h1><p className="mt-3 text-white/60 max-w-2xl">Evaluate your resume and optional cover letter against the actual job description using deterministic matching, ATS analysis, RAG market evidence and a LangGraph workflow.</p></div>
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="card p-6 space-y-5"><label className="block"><span className="text-sm text-white/60">Target role (optional)</span><input className={box+" mt-2"} value={targetRole} onChange={e=>setTargetRole(e.target.value)} placeholder="Senior Node.js Engineer" /></label>
      <label className="block"><span className="text-sm text-white/60">Job description *</span><textarea className={box+" mt-2 min-h-56"} value={job} onChange={e=>setJob(e.target.value)} placeholder="Paste the complete job description..." /></label>
      <label className="block"><span className="text-sm text-white/60">Resume *</span><textarea className={box+" mt-2 min-h-56"} value={resume} onChange={e=>setResume(e.target.value)} placeholder="Paste extracted resume text, or use the existing PDF extraction flow on the Resume page." /></label>
      <label className="block"><span className="text-sm text-white/60">Cover letter (optional)</span><textarea className={box+" mt-2 min-h-36"} value={cover} onChange={e=>setCover(e.target.value)} placeholder="Paste your cover letter..." /></label>
      {error&&<div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      <button disabled={loading||resume.length<50||job.length<50} onClick={submit} className="w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold disabled:opacity-40">{loading?"Evaluating application…":"Evaluate application"}</button></section>
      <Results result={result}/>
    </div>
  </main>;
}

function Results({result}:{result:ResumeEvaluationResult|null}){if(!result)return <div className="card flex min-h-[500px] items-center justify-center text-center text-white/50">Your recruiter-grade evaluation will appear here.</div>;
const tone=result.verdict==="SHORTLIST"?"text-emerald-300":result.verdict==="MAYBE"?"text-amber-300":"text-red-300";
return <section className="space-y-4"><div className="card p-6"><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-widest text-white/40">Verdict</div><div className={`mt-2 text-3xl font-bold ${tone}`}>{result.verdict}</div></div><div className="text-right"><div className="text-xs text-white/40">Overall</div><div className="text-4xl font-semibold">{result.overallScore}</div><div className="text-xs text-white/40">confidence {Math.round(result.confidence*100)}%</div></div></div><p className="mt-5 text-white/70">{result.summary}</p></div>
<Card title="Resume & ATS"><div className="grid grid-cols-2 gap-3 mb-4"><Metric label="Resume" value={result.resume.score}/><Metric label="ATS" value={result.resume.atsScore}/><Metric label="Keywords" value={result.match.keywordCoverage}/><Metric label="Experience" value={result.match.experienceAlignment}/></div><Lists groups={[['Strengths',result.resume.strengths],['Weaknesses',result.resume.weaknesses],['Missing skills',result.resume.missingSkills],['Missing keywords',result.resume.missingKeywords],['ATS issues',result.resume.atsIssues]]}/></Card>
<Card title="Required skills"><Lists groups={[['Matched',result.match.requiredSkillsMatched],['Missing',result.match.requiredSkillsMissing],['Preferred matched',result.match.preferredSkillsMatched]]}/></Card>
{result.coverLetter&&<Card title={`Cover letter — ${result.coverLetter.score}/100`}><Lists groups={[["Strengths",result.coverLetter.strengths],["Weaknesses",result.coverLetter.weaknesses],["Issues",result.coverLetter.issues]]}/></Card>}
<Card title="Market signals & priority gaps"><Lists groups={[["Market signals",result.marketSignals],["Priority gaps",result.priorityGaps]]}/></Card><Card title="Recruiter perspective"><p className="text-white/70">{result.recruiterPerspective}</p></Card>
<Card title="Quick fixes">{result.quickFixes.map((f,i)=><div key={i} className="border-b border-white/10 py-4 last:border-0"><div className="flex gap-2 text-xs uppercase tracking-wider"><span>{f.priority}</span><span className="text-white/40">{f.section}</span></div><div className="mt-1 font-medium">{f.recommendation}</div>{f.before&&<div className="mt-2 text-sm text-red-200/70">Before: {f.before}</div>}{f.after&&<div className="mt-1 text-sm text-emerald-200/80">After: {f.after}</div>}<div className="mt-1 text-xs text-white/40">{f.reason}</div></div>)}</Card>
{result.citations.length>0&&<Card title="Evidence sources"><Lists groups={[["Sources",result.citations.map(c=>c.url?`${c.title} — ${c.url}`:c.title)]]}/></Card>}</section>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <div className="card p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></div>}
function Metric({label,value}:{label:string;value:number}){return <div className="rounded-lg border border-white/10 p-3"><div className="text-xs text-white/40">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>}
function Lists({groups}:{groups:[string,string[]][]}){return <div className="space-y-4">{groups.map(([title,items])=><div key={title}><div className="text-xs uppercase tracking-wider text-white/40">{title}</div>{items.length?<ul className="mt-2 space-y-1">{items.map((x,i)=><li key={i} className="text-sm text-white/70">• {x}</li>)}</ul>:<div className="mt-1 text-sm text-white/30">None</div>}</div>)}</div>}
