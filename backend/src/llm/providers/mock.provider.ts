import { Logger } from '@nestjs/common';
import type { GenerateStructuredArgs, LlmProvider } from '../llm.interface';
import { LlmInvalidOutputError } from '../llm.interface';

/**
 * Deterministic, offline provider used when LLM_PROVIDER=mock (or for tests).
 *
 * The provider is role-aware: it parses the `TARGET ROLE:` hint from the
 * prompt (or the JD for job-match), classifies it into an archetype, and
 * emits strengths / missing skills / rewritten bullets / ATS notes that are
 * appropriate for that archetype. This keeps the UX believable without a
 * real LLM and prevents the old behaviour where every role got the same
 * frontend-flavoured suggestions.
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockLlmProvider.name);

  async generateStructured<T>({
    system,
    prompt,
    schema,
  }: GenerateStructuredArgs<T>): Promise<T> {
    this.logger.debug(
      `mock.generateStructured system="${system.slice(0, 40)}…" input=${prompt.length} chars`,
    );

    await new Promise((r) => setTimeout(r, 120));

    const ctx = parsePrompt(prompt);
    const profile = pickProfile(ctx);
    const candidate = buildResponse(ctx, profile);

    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      throw new LlmInvalidOutputError(
        'Mock provider produced output that did not match requested schema. ' +
          'Update MockLlmProvider to cover the new schema.',
        JSON.stringify(candidate),
      );
    }
    return parsed.data;
  }
}

// ---------------------------------------------------------------------------
// Prompt parsing
// ---------------------------------------------------------------------------

interface PromptCtx {
  resume: string;
  role: string;
  /** Job description text (only present for job-match prompts). */
  jd: string;
  /** Lowercased haystack used for skill / role detection. */
  hay: string;
}

function parsePrompt(prompt: string): PromptCtx {
  const roleMatch = prompt.match(/TARGET ROLE:\s*(.+)/i);
  const role = roleMatch ? roleMatch[1].trim() : '';

  const resumeMatch = prompt.match(
    /RESUME:\s*([\s\S]*?)(?:\n\s*TARGET ROLE:|$)/i,
  );
  const resume = resumeMatch ? resumeMatch[1].trim() : prompt;

  const jdMatch = prompt.match(
    /JOB DESCRIPTION:\s*([\s\S]*?)(?:\n\s*RESUME:|$)/i,
  );
  const jd = jdMatch ? jdMatch[1].trim() : '';

  const hay = `${role}\n${jd}\n${resume}`.toLowerCase();
  return { resume, role, jd, hay };
}

// ---------------------------------------------------------------------------
// Skill catalog
// ---------------------------------------------------------------------------

interface SkillDef {
  label: string;
  match: RegExp;
}

const SKILL: Record<string, SkillDef> = {
  // Backend / platform
  node: { label: 'Node.js', match: /\bnode(?:\.?js)?\b/i },
  ts: { label: 'TypeScript', match: /\btype\s?script\b|\btsx?\b/i },
  js: { label: 'JavaScript', match: /\bjavascript\b|\bes(?:6|2015|next)\b/i },
  express: {
    label: 'Express / NestJS / Fastify',
    match: /\b(express|nest\.?js|fastify|koa|hapi)\b/i,
  },
  rest: { label: 'REST API design', match: /\brest(?:ful)?\b|\bapis?\b/i },
  graphql: {
    label: 'GraphQL / gRPC',
    match: /\b(graphql|grpc|trpc|apollo)\b/i,
  },
  sql: {
    label: 'PostgreSQL / MySQL',
    match: /\b(postgres(?:ql)?|mysql|mariadb|mssql|sql\s?server)\b/i,
  },
  nosql: {
    label: 'MongoDB / DynamoDB',
    match: /\b(mongo(?:db)?|dynamodb|couchdb|firestore)\b/i,
  },
  redis: {
    label: 'Redis & caching strategy',
    match: /\b(redis|memcached|in-memory cache)\b/i,
  },
  queue: {
    label: 'Kafka / RabbitMQ / SQS',
    match: /\b(kafka|rabbit\s?mq|sqs|pub[\s/-]?sub|nats|event\s?bridge)\b/i,
  },
  docker: { label: 'Docker', match: /\bdocker\b|\bcontainerizat/i },
  k8s: {
    label: 'Kubernetes',
    match: /\b(kubernetes|k8s|eks|gke|aks|helm)\b/i,
  },
  aws: {
    label: 'AWS (ECS / Lambda / RDS / S3)',
    match:
      /\b(aws|ecs|lambda|rds|s3|dynamodb|cloudfront|cloudwatch|sns|sqs)\b/i,
  },
  gcp: {
    label: 'GCP (GKE / Cloud Run / BigQuery)',
    match: /\b(gcp|google cloud|gke|cloud run|bigquery|pub\s?sub)\b/i,
  },
  observability: {
    label: 'Observability (OpenTelemetry / Datadog)',
    match:
      /\b(opentelemetry|otel|datadog|new\s?relic|prometheus|grafana|sentry)\b/i,
  },
  cicd: {
    label: 'CI/CD pipelines',
    match:
      /\bci\/?cd\b|\b(github\s?actions|jenkins|circle\s?ci|argo\s?cd|gitlab\s?ci)\b/i,
  },
  testing: {
    label: 'Unit & integration testing',
    match: /\b(jest|vitest|mocha|supertest|pytest|junit|testng)\b/i,
  },
  security: {
    label: 'OWASP / auth hardening (OAuth2, JWT)',
    match: /\b(owasp|oauth\s?2?|oidc|saml|jwt|csrf|xss|rbac)\b/i,
  },
  microservices: {
    label: 'Microservices & service design',
    match: /\b(micro\s?services?|service\s?mesh|ddd|bounded\s?context)\b/i,
  },
  // Frontend
  react: { label: 'React', match: /\breact\b/i },
  next: { label: 'Next.js', match: /\bnext\.?js\b/i },
  vue: { label: 'Vue / Nuxt', match: /\b(vue|nuxt)\b/i },
  angular: { label: 'Angular', match: /\bangular\b/i },
  svelte: { label: 'Svelte / SvelteKit', match: /\bsvelte(?:kit)?\b/i },
  css: {
    label: 'Modern CSS / Tailwind',
    match:
      /\b(tailwind|css\s?modules|styled[- ]components|emotion|sass|less)\b/i,
  },
  a11y: {
    label: 'Accessibility (WCAG 2.2)',
    match: /\b(wcag|aria|a11y|accessibility|screen\s?reader)\b/i,
  },
  cwv: {
    label: 'Core Web Vitals & performance',
    match: /\b(core\s?web\s?vitals|lcp|cls|inp|lighthouse|web\s?vitals)\b/i,
  },
  ftTest: {
    label: 'Frontend testing (RTL / Playwright)',
    match: /\b(react\s?testing\s?library|\brtl\b|playwright|cypress)\b/i,
  },
  designSystem: {
    label: 'Design systems',
    match:
      /\b(design\s?system|storybook|figma\s?tokens|component\s?library)\b/i,
  },
  state: {
    label: 'State management (Redux / Zustand / TanStack Query)',
    match:
      /\b(redux|zustand|jotai|recoil|tanstack\s?query|react\s?query|rtk)\b/i,
  },
  // Data / ML
  python: { label: 'Python', match: /\bpython\b/i },
  spark: { label: 'Spark', match: /\bspark\b|\bdatabricks\b/i },
  airflow: {
    label: 'Airflow / Dagster',
    match: /\b(airflow|dagster|prefect)\b/i,
  },
  dbt: { label: 'dbt', match: /\bdbt\b/i },
  warehouse: {
    label: 'Snowflake / BigQuery / Redshift',
    match: /\b(snowflake|bigquery|redshift|synapse)\b/i,
  },
  ml: {
    label: 'ML frameworks (PyTorch / TensorFlow)',
    match: /\b(pytorch|tensorflow|scikit[- ]learn|xgboost|hugging\s?face)\b/i,
  },
  mlops: {
    label: 'MLOps (MLflow / SageMaker / Vertex)',
    match: /\b(mlflow|sagemaker|vertex\s?ai|kubeflow)\b/i,
  },
  experiment: {
    label: 'Experimentation & A/B testing',
    match:
      /\b(a\/?b\s?test|experiment|statistical\s?significance|p[- ]value)\b/i,
  },
  // Mobile
  ios: {
    label: 'iOS / Swift / SwiftUI',
    match: /\b(ios|swift(?:ui)?|xcode)\b/i,
  },
  android: {
    label: 'Android / Kotlin / Jetpack Compose',
    match: /\b(android|kotlin|jetpack\s?compose)\b/i,
  },
  rn: { label: 'React Native', match: /\breact\s?native\b/i },
  flutter: { label: 'Flutter / Dart', match: /\b(flutter|dart)\b/i },
  // DevOps / SRE
  terraform: {
    label: 'Terraform / IaC',
    match: /\b(terraform|pulumi|cloudformation|iac)\b/i,
  },
  slo: {
    label: 'SLOs / SLIs / error budgets',
    match: /\b(slo|sli|error\s?budget|on[- ]call|mttr|rto|rpo)\b/i,
  },
  // Other common language stacks
  java: {
    label: 'Java / Spring Boot',
    match: /\b(java|spring\s?boot|hibernate)\b/i,
  },
  go: {
    label: 'Go / Golang',
    match: /\b(golang|\bgo\s?1\.\d+)\b|\bgo programming\b/i,
  },
  dotnet: { label: '.NET / C#', match: /\b(\.net|c#|asp\.?net)\b/i },
  ruby: { label: 'Ruby on Rails', match: /\b(ruby|rails)\b/i },
  rust: { label: 'Rust', match: /\brust\b/i },
  php: { label: 'PHP / Laravel', match: /\b(php|laravel|symfony)\b/i },
};

function detectSkills(hay: string, skills: SkillDef[]): SkillDef[] {
  return skills.filter((s) => s.match.test(hay));
}

function missingSkills(hay: string, skills: SkillDef[]): SkillDef[] {
  return skills.filter((s) => !s.match.test(hay));
}

// ---------------------------------------------------------------------------
// Role profiles
// ---------------------------------------------------------------------------

interface RoleProfile {
  id: string;
  label: string;
  hintPatterns: RegExp[];
  contentPatterns: RegExp[];
  coreSkills: SkillDef[];
  roastHook: string;
  improvements: string[];
  bullets: string[];
  atsNotes: string;
}

const BACKEND_NODE: RoleProfile = {
  id: 'backend-node',
  label: 'Node.js Backend Engineer',
  hintPatterns: [
    /\bback[- ]?end\b[\s\S]{0,40}\bnode/i,
    /\bnode(?:\.?js)?[\s\S]{0,40}\bback[- ]?end\b/i,
    /\bnode(?:\.?js)?\s+(developer|engineer)/i,
    /\bnest\.?js\b/i,
    /\bexpress\s+(developer|engineer)/i,
  ],
  contentPatterns: [/\b(node\.?js|nestjs|express|fastify)\b/i],
  coreSkills: [
    SKILL.node,
    SKILL.ts,
    SKILL.express,
    SKILL.rest,
    SKILL.graphql,
    SKILL.sql,
    SKILL.redis,
    SKILL.queue,
    SKILL.docker,
    SKILL.k8s,
    SKILL.aws,
    SKILL.observability,
    SKILL.cicd,
    SKILL.testing,
    SKILL.security,
    SKILL.microservices,
  ],
  roastHook:
    'This reads like a frontend résumé wearing a backend hoodie. I want to see queues, SQL plans, and on-call incident numbers — not CSS wins.',
  improvements: [
    'Quantify service performance with p50/p95/p99 latency, RPS, and error rate.',
    'Surface data-layer impact: schema design, query plans, indexing, connection pooling.',
    'Show reliability work: SLOs, on-call rotations, MTTR, incident counts.',
    'Mention async / queue workloads (Kafka, SQS, RabbitMQ) with throughput numbers.',
    'Call out security posture: OWASP fixes, OAuth2/JWT hardening, secret rotation.',
    'Move your stack into a single-column Skills block ATS can parse.',
  ],
  bullets: [
    '• Designed a Node.js/TypeScript ingestion service (NestJS + PostgreSQL) handling 12k RPS at p95 < 90ms on 4 ECS tasks.',
    '• Cut DB CPU 38% on the orders API by replacing N+1 calls with a Prisma `include` tree and adding a composite index on (tenant_id, created_at).',
    '• Built a Kafka consumer processing 8M events/day with at-least-once delivery and idempotent handlers; 0 data-loss incidents over 9 months.',
    '• Rolled out OpenTelemetry tracing + Datadog SLOs across 6 services; MTTR dropped from 42m to 11m.',
    '• Hardened auth (OAuth2 + short-lived JWTs, refresh-token rotation); closed 3 OWASP A07 findings and passed SOC 2 Type II audit.',
    '• Containerized the payments service (Docker → EKS) with HPA on CPU + RPS; saved $18k/month vs. over-provisioned EC2 baseline.',
  ],
  atsNotes:
    'For a Node.js backend role, recruiters and ATS parse for: Node.js, TypeScript, NestJS/Express, PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS, CI/CD, OpenTelemetry. Keep a single-column Skills block, and mention the core stack in at least two bullets, not only in a Skills list.',
};

const BACKEND_GENERIC: RoleProfile = {
  id: 'backend-generic',
  label: 'Backend Engineer',
  hintPatterns: [
    /\bback[- ]?end\b/i,
    /\bserver[- ]?side\b/i,
    /\b(java|spring|go|golang|python|rails|\.net|c#|rust)\s+(developer|engineer)/i,
    /\bmicroservices?\b/i,
  ],
  contentPatterns: [
    /\b(spring|django|flask|fastapi|rails|gin|actix|asp\.?net)\b/i,
  ],
  coreSkills: [
    SKILL.rest,
    SKILL.graphql,
    SKILL.sql,
    SKILL.redis,
    SKILL.queue,
    SKILL.docker,
    SKILL.k8s,
    SKILL.aws,
    SKILL.observability,
    SKILL.cicd,
    SKILL.testing,
    SKILL.security,
    SKILL.microservices,
  ],
  roastHook:
    'Lots of adjectives, not enough throughput. Backend hiring managers skim for latency, RPS, and incident numbers — give them something to circle.',
  improvements: [
    'Quantify service performance (p95/p99 latency, RPS, error rate) on at least two bullets.',
    'Show schema / query work: indexes added, query plan wins, connection pooling.',
    'Include SLOs, on-call rotations, and MTTR — signals production maturity.',
    'Add event-driven / queue experience (Kafka, RabbitMQ, SQS) with throughput.',
    'Call out security & compliance: OWASP, OAuth2/JWT, SOC 2, PII handling.',
  ],
  bullets: [
    '• Led a monolith → microservices split (5 bounded contexts) on Kubernetes; deploy cadence 1/wk → 14/wk, change-failure rate down 40%.',
    '• Rewrote the pricing service in <stack>; p95 latency 420ms → 120ms at 3× traffic.',
    '• Built a Kafka pipeline processing 20M events/day with exactly-once semantics and dead-letter queues.',
    '• Stood up Prometheus + Grafana SLO dashboards across 8 services; on-call pages cut 62% QoQ.',
    '• Closed 5 OWASP findings (A01, A03, A07) and rotated all long-lived secrets into Vault.',
  ],
  atsNotes:
    'For a backend role, prioritize these ATS keywords: REST/gRPC/GraphQL, PostgreSQL/MySQL, Redis, Kafka/RabbitMQ, Docker, Kubernetes, AWS/GCP, CI/CD, OpenTelemetry/Datadog, OWASP/OAuth2. Keep layout single-column for older ATS parsers (Taleo, iCIMS).',
};

const FRONTEND: RoleProfile = {
  id: 'frontend',
  label: 'Frontend Engineer',
  hintPatterns: [
    /\bfront[- ]?end\b/i,
    /\bui\s+(developer|engineer)/i,
    /\bweb\s+(developer|engineer)/i,
    /\b(react|next\.?js|vue|svelte|angular)\s+(developer|engineer)/i,
  ],
  contentPatterns: [/\b(react|next\.?js|vue|svelte|angular)\b/i],
  coreSkills: [
    SKILL.ts,
    SKILL.react,
    SKILL.next,
    SKILL.css,
    SKILL.state,
    SKILL.a11y,
    SKILL.cwv,
    SKILL.ftTest,
    SKILL.designSystem,
    SKILL.graphql,
  ],
  roastHook:
    'Your resume reads like a component library README — heavy on tools, light on user outcomes. Lead with the number a PM would brag about.',
  improvements: [
    'Replace "responsible for" bullets with action verbs + measured outcomes.',
    'Quantify performance wins with Core Web Vitals (LCP, INP, CLS) and Lighthouse deltas.',
    'Surface accessibility work (WCAG 2.2 AA, axe-core, keyboard nav) — it is a keyword gate at big shops.',
    'Mention design-system contributions and Storybook / tokens ownership.',
    'Add frontend testing coverage (React Testing Library, Playwright) with flake metrics.',
  ],
  bullets: [
    '• Shipped a Next.js checkout rewrite; LCP 3.8s → 1.4s, INP p75 450ms → 120ms, conversion +14% QoQ ($2.1M ARR).',
    '• Migrated 220 screens from class components to React 19 + TanStack Query; bundle −38%, hydration errors −91%.',
    '• Built a WCAG 2.2 AA design system in Storybook with axe-core CI; a11y bugs at release fell from 18/qtr to 2/qtr.',
    '• Led a 4-engineer migration from REST to tRPC; type-safety across the stack, p95 client→API latency 380ms → 140ms.',
    '• Drove Playwright adoption; flaky E2E suites 22% → 3% and pipeline time 34m → 11m.',
  ],
  atsNotes:
    'For a frontend role, ATS scans for: React, Next.js, TypeScript, Tailwind/CSS-in-JS, WCAG 2.2, Core Web Vitals, React Testing Library, Playwright/Cypress, design systems, GraphQL. Avoid two-column PDF layouts — older ATS parsers drop the right column entirely.',
};

const FULLSTACK: RoleProfile = {
  id: 'fullstack',
  label: 'Full-Stack Engineer',
  hintPatterns: [/\bfull[- ]?stack\b/i, /\bsoftware\s+(developer|engineer)\b/i],
  contentPatterns: [],
  coreSkills: [
    SKILL.ts,
    SKILL.react,
    SKILL.next,
    SKILL.node,
    SKILL.express,
    SKILL.sql,
    SKILL.redis,
    SKILL.docker,
    SKILL.aws,
    SKILL.cicd,
    SKILL.testing,
    SKILL.observability,
    SKILL.a11y,
    SKILL.cwv,
  ],
  roastHook:
    'Full-stack means full-stack impact. I see the tools — now show me a feature you owned end-to-end with the business number attached.',
  improvements: [
    'Pick 2–3 features you owned end-to-end (UI → API → DB) and quantify impact.',
    'Balance the bullets: at least one front-end perf win and one back-end latency/RPS win.',
    'Show DevOps maturity: CI/CD, observability, and on-call ownership.',
    'Replace "responsible for" with "led / designed / shipped" plus a number.',
  ],
  bullets: [
    '• Shipped a Next.js + NestJS billing portal end-to-end; checkout conversion +11% and p95 API latency 260ms → 95ms.',
    '• Designed the PostgreSQL schema + Prisma layer for multi-tenant isolation; cut cross-tenant query cost 46%.',
    '• Owned the CI/CD (GitHub Actions → ECS) + Datadog SLOs; deploy cadence 2/wk → 20/wk with 99.95% availability.',
    '• Implemented WCAG 2.2 AA across the dashboard and added Playwright E2E; accessibility escapes → 0 last quarter.',
  ],
  atsNotes:
    'Full-stack roles get scored on breadth. Make sure the Skills block covers both sides: React/Next/TS + Node/Postgres/Docker/AWS. Duplicate the most-important keywords in both the Skills block and the experience bullets.',
};

const DATA_ENGINEER: RoleProfile = {
  id: 'data-engineer',
  label: 'Data Engineer',
  hintPatterns: [
    /\bdata\s+engineer/i,
    /\banalytics\s+engineer/i,
    /\betl\s+(developer|engineer)/i,
  ],
  contentPatterns: [
    /\b(airflow|dbt|spark|snowflake|bigquery|redshift|databricks)\b/i,
  ],
  coreSkills: [
    SKILL.python,
    SKILL.sql,
    SKILL.spark,
    SKILL.airflow,
    SKILL.dbt,
    SKILL.warehouse,
    SKILL.queue,
    SKILL.aws,
    SKILL.gcp,
    SKILL.observability,
    SKILL.cicd,
  ],
  roastHook:
    'ETL soup with no volumes, no freshness SLAs, and no cost numbers. Data hiring managers want rows/day, $/query, and lineage — give them that.',
  improvements: [
    'Quantify pipeline volume (rows/day), freshness SLAs, and data-quality metrics.',
    'Surface cost work: partitioning, clustering, $/TB-scanned reductions in Snowflake/BigQuery.',
    'Mention lineage and data contracts (dbt tests, Great Expectations, OpenLineage).',
    'Show incident ownership: data downtime, backfills, on-call rotations.',
  ],
  bullets: [
    '• Migrated 180 Airflow DAGs to dbt + Snowflake; warehouse cost down 41% via partition pruning and incremental models.',
    '• Built a CDC pipeline (Debezium → Kafka → Snowflake) moving 120M rows/day with 3-minute freshness SLA.',
    '• Shipped 320 dbt tests + OpenLineage integration; data incidents −68% QoQ, stakeholder trust score 4.6/5.',
    '• Designed a medallion lakehouse on Databricks; query p95 for finance dashboards 42s → 6s.',
  ],
  atsNotes:
    'Data engineering ATS keywords: Python, SQL, Spark, Airflow, dbt, Snowflake/BigQuery/Redshift, Kafka, AWS/GCP, data modeling, lineage. Put specific warehouse and orchestrator names in bullets, not just in Skills.',
};

const ML: RoleProfile = {
  id: 'ml',
  label: 'Machine Learning / Data Scientist',
  hintPatterns: [
    /\bmachine\s?learning\b/i,
    /\bml\s+(engineer|scientist)\b/i,
    /\bdata\s+scientist\b/i,
    /\bai\s+engineer\b/i,
  ],
  contentPatterns: [/\b(pytorch|tensorflow|scikit|hugging\s?face|llm|rag)\b/i],
  coreSkills: [
    SKILL.python,
    SKILL.sql,
    SKILL.ml,
    SKILL.mlops,
    SKILL.experiment,
    SKILL.spark,
    SKILL.warehouse,
    SKILL.aws,
    SKILL.observability,
  ],
  roastHook:
    'Models without baselines, metrics, or business deltas are just Jupyter art. Put the lift number in the first bullet.',
  improvements: [
    'Report model metrics vs. a stated baseline (AUC, MAE, NDCG, etc.), not just the final number.',
    'Quantify business impact: revenue, retention, cost, or false-positive reductions.',
    'Show MLOps maturity: training pipelines, drift monitoring, CI for models.',
    'Mention experimentation rigor: A/B design, power analysis, guardrail metrics.',
  ],
  bullets: [
    '• Built a churn model (XGBoost) that lifted AUC 0.71 → 0.82 vs. baseline; retention campaign ROI +17%.',
    '• Moved training from notebooks to SageMaker Pipelines; retrain cadence monthly → weekly with drift alerts.',
    '• Designed and ran an A/B test (N=240k) on the ranking model; p=0.003 on NDCG@10, shipped to 100%.',
    '• Fine-tuned a 7B LLM with QLoRA for internal search RAG; eval acc +12pp, inference cost −55% via quantization.',
  ],
  atsNotes:
    'ML/DS ATS keywords: Python, PyTorch/TensorFlow, scikit-learn, SQL, experimentation / A-B testing, MLflow / SageMaker / Vertex, statistics. Include both the algorithm class and the business metric in each bullet.',
};

const DEVOPS: RoleProfile = {
  id: 'devops-sre',
  label: 'DevOps / SRE / Platform Engineer',
  hintPatterns: [
    /\bdev\s?ops\b/i,
    /\bsre\b/i,
    /\bsite\s+reliability\b/i,
    /\bplatform\s+engineer\b/i,
    /\binfra(structure)?\s+engineer\b/i,
  ],
  contentPatterns: [
    /\b(kubernetes|terraform|helm|ansible|ci\/?cd|prometheus)\b/i,
  ],
  coreSkills: [
    SKILL.k8s,
    SKILL.docker,
    SKILL.terraform,
    SKILL.aws,
    SKILL.gcp,
    SKILL.cicd,
    SKILL.observability,
    SKILL.slo,
    SKILL.security,
  ],
  roastHook:
    'Tools listed, outcomes missing. SRE resumes live or die on MTTR, error budget burn, and deploy frequency — lead with those.',
  improvements: [
    'Quantify reliability: MTTR, deploy frequency, change-failure rate, error-budget burn.',
    'Show cost engineering: cloud $ saved, right-sizing, spot/graviton migrations.',
    'Surface IaC coverage % and drift-detection practices.',
    'Include incident ownership: number of incidents, on-call load, postmortems written.',
  ],
  bullets: [
    '• Migrated 40 services from EC2 to EKS + Terraform; deploy cadence 3/wk → 30/wk, change-failure rate 18% → 6%.',
    '• Rolled out SLOs + error budgets across 12 services; MTTR 38m → 9m and on-call pages −55% QoQ.',
    '• Built a GitHub Actions → ArgoCD GitOps pipeline; production deploys fully automated with progressive delivery (Argo Rollouts).',
    '• Cut AWS spend $22k/month via Graviton + Karpenter spot pools, with zero SLO regression.',
  ],
  atsNotes:
    'DevOps/SRE ATS keywords: Kubernetes, Docker, Terraform, AWS/GCP/Azure, CI/CD, Prometheus/Grafana/Datadog, SLO/SLI, incident response, Helm, ArgoCD. Emphasize measurable reliability and cost numbers, not just tool names.',
};

const MOBILE: RoleProfile = {
  id: 'mobile',
  label: 'Mobile Engineer',
  hintPatterns: [
    /\bmobile\s+(developer|engineer)\b/i,
    /\b(ios|android|react\s?native|flutter)\s+(developer|engineer)\b/i,
  ],
  contentPatterns: [/\b(swift|kotlin|flutter|react\s?native|xcode|jetpack)\b/i],
  coreSkills: [
    SKILL.ios,
    SKILL.android,
    SKILL.rn,
    SKILL.flutter,
    SKILL.ts,
    SKILL.ftTest,
    SKILL.cicd,
    SKILL.observability,
    SKILL.a11y,
  ],
  roastHook:
    'App-store pipeline, crash-free rate, and cold-start time are the three numbers a mobile lead asks about. Two of them are missing here.',
  improvements: [
    'Report crash-free sessions %, cold-start time, and app-size deltas.',
    'Show store-release cadence and rollout controls (staged rollout, kill switches).',
    'Surface accessibility work — Dynamic Type, VoiceOver/TalkBack, contrast.',
    'Add platform-specific wins: SwiftUI adoption %, Compose migrations, RN bridge removal.',
  ],
  bullets: [
    '• Led the SwiftUI migration of the checkout flow; cold-start p95 2.1s → 0.8s, crash-free sessions 99.82% → 99.97%.',
    '• Shipped Jetpack Compose for 60% of screens; view-layer code −38% and render jank −61%.',
    '• Built a staged-rollout + kill-switch system on Firebase Remote Config; cut rollback time 12h → 20m.',
    '• Automated the iOS + Android release train on Fastlane + GitHub Actions; release cadence 2/wk → bi-weekly to weekly with zero manual steps.',
  ],
  atsNotes:
    'Mobile ATS keywords: Swift/SwiftUI, Kotlin/Jetpack Compose, React Native, Flutter, Fastlane, crash-free rate, cold-start, App Store / Play Store. Call out the specific platform in your headline and Skills list.',
};

const QA: RoleProfile = {
  id: 'qa',
  label: 'QA / SDET',
  hintPatterns: [
    /\bqa\s+(engineer|lead)\b/i,
    /\bsdet\b/i,
    /\btest\s+(automation|engineer)\b/i,
  ],
  contentPatterns: [/\b(cypress|playwright|selenium|appium|testng|pytest)\b/i],
  coreSkills: [
    SKILL.ftTest,
    SKILL.testing,
    SKILL.cicd,
    SKILL.observability,
    SKILL.ts,
  ],
  roastHook:
    'No flake-rate, no coverage deltas, no pipeline time saved. QA leadership lives on those numbers.',
  improvements: [
    'Quantify flake-rate reduction and pipeline time saved.',
    'Show coverage movement (unit + integration + E2E) with numbers and scope.',
    'Mention perf / load testing (k6, JMeter) if you have it.',
    'Surface test-strategy ownership: pyramids, risk-based testing, release gates.',
  ],
  bullets: [
    '• Cut E2E flake rate from 22% to 3% by quarantining flaky specs and adding Playwright auto-wait patterns.',
    '• Built a risk-based test matrix + CI gates in GitHub Actions; pipeline time 34m → 11m with 1.4× more coverage.',
    '• Introduced contract testing (Pact) between 6 services; production integration bugs −73% YoY.',
    '• Ran k6 load tests; surfaced a DB deadlock at 2k RPS that would have shipped to prod.',
  ],
  atsNotes:
    'QA/SDET ATS keywords: Playwright, Cypress, Selenium, TestNG/JUnit, Pytest, CI/CD, k6/JMeter, Pact, TestRail. Emphasize automation coverage % and flake metrics.',
};

const GENERIC: RoleProfile = {
  id: 'generic',
  label: 'Software Engineer',
  hintPatterns: [],
  contentPatterns: [],
  coreSkills: [
    SKILL.ts,
    SKILL.testing,
    SKILL.cicd,
    SKILL.docker,
    SKILL.observability,
    SKILL.rest,
    SKILL.sql,
  ],
  roastHook:
    'Your resume reads like it was written by a committee. Trade adjectives for numbers — recruiters scan bullets, they do not read essays.',
  improvements: [
    'Replace "responsible for" with action verbs + outcomes (led, built, shipped, cut, lifted).',
    'Every bullet should end in a number: %, $, users, latency, or time saved.',
    'Tighten the summary to 2 sentences; cut adjectives without numbers.',
    'Move your tech stack into a single-column Skills block the ATS can parse.',
  ],
  bullets: [
    '• Led a 4-engineer project that lifted <business metric> by X% in Q<n>.',
    '• Cut <latency / cost / error rate> by X% via <specific change>.',
    '• Mentored 3 engineers; 2 promoted within 12 months.',
    '• Owned CI/CD, testing, and deploy process for the <service>; release cadence 2/wk → 14/wk.',
  ],
  atsNotes:
    'No target role detected. Add a target-role line under your name and tune keywords to that role. Keep the layout single-column; older ATS parsers drop two-column content.',
};

const PROFILES: RoleProfile[] = [
  BACKEND_NODE,
  BACKEND_GENERIC,
  FRONTEND,
  FULLSTACK,
  DATA_ENGINEER,
  ML,
  DEVOPS,
  MOBILE,
  QA,
];

function pickProfile(ctx: PromptCtx): RoleProfile {
  const hint = `${ctx.role} ${ctx.jd}`.toLowerCase();

  // Hint-based match first — the user's TARGET ROLE / JD is authoritative.
  for (const p of PROFILES) {
    if (p.hintPatterns.some((re) => re.test(hint))) return p;
  }
  // Fall back to resume-content classification.
  const resume = ctx.resume.toLowerCase();
  for (const p of PROFILES) {
    if (p.contentPatterns.some((re) => re.test(resume))) return p;
  }
  return GENERIC;
}

// ---------------------------------------------------------------------------
// Response builder
// ---------------------------------------------------------------------------

const NUMERIC_RE = /\b\d{1,3}(?:[.,]\d+)?\s?(%|ms|k|m|b|bn|x|\$|rps|qps|req)/i;
const ACTION_VERB_RE =
  /\b(led|built|shipped|owned|launched|migrated|designed|architected|reduced|cut|lifted|scaled|optimized|automated)\b/i;

function buildResponse(ctx: PromptCtx, profile: RoleProfile): unknown {
  const present = detectSkills(ctx.hay, profile.coreSkills);
  const missing = missingSkills(ctx.hay, profile.coreSkills);
  const hasNumbers = NUMERIC_RE.test(ctx.resume);
  const hasVerbs = ACTION_VERB_RE.test(ctx.resume);

  // ---- strengths
  const strengths: string[] = [];
  for (const s of present.slice(0, 4)) {
    strengths.push(
      `Clear ${s.label} signal — keep it in the top third of the resume.`,
    );
  }
  if (hasNumbers) {
    strengths.push(
      'Bullets contain concrete numbers — strong recruiter + ATS signal.',
    );
  }
  if (hasVerbs) {
    strengths.push(
      'Strong action verbs suggest ownership, not just participation.',
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      `Resume is on-topic for a ${profile.label}; core story is legible.`,
    );
  }

  // ---- improvements
  const improvements: string[] = [];
  if (!hasNumbers) {
    improvements.push(
      'Add at least one number to every bullet (%, $, users, latency, time saved).',
    );
  }
  if (!hasVerbs) {
    improvements.push(
      'Open each bullet with an action verb (led, built, shipped, migrated, cut, lifted).',
    );
  }
  for (const tip of profile.improvements) {
    if (improvements.length >= 6) break;
    improvements.push(tip);
  }

  // ---- missing skills
  const missingSkillLabels = missing.slice(0, 7).map((s) => s.label);
  const citations = [
    'O*NET + ESCO crosswalk (https://www.onetonline.org/)',
    'ESCO framework (https://esco.ec.europa.eu/)',
  ];
  const marketSignals = dedupe(
    missing
      .slice(0, 5)
      .map(
        (s) =>
          `${s.label} appears as a market-priority expectation for ${profile.label} roles.`,
      ),
  );
  const priorityGaps = dedupe(
    missingSkillLabels.map(
      (label) => `${label} is a high-priority market gap for this role.`,
    ),
  );

  // ---- optimized rewrite
  const optimized = profile.bullets.slice(0, 6).join('\n');

  // ---- ATS score: base 50, +3 per core skill hit (cap 30), +5 numbers,
  //      +5 verbs, +5 if we had a confident role hint.
  const coverage = Math.min(30, present.length * 3);
  const hintConfident = profile.id !== 'generic' && !!ctx.role;
  const atsScore = clamp(
    50 +
      coverage +
      (hasNumbers ? 5 : 0) +
      (hasVerbs ? 5 : 0) +
      (hintConfident ? 5 : 0),
    20,
    98,
  );

  // ---- ATS notes
  const atsNotes = [
    profile.atsNotes,
    present.length
      ? `Detected in your resume: ${present
          .slice(0, 6)
          .map((s) => s.label)
          .join(', ')}.`
      : `Not seeing any ${profile.label.toLowerCase()} core skills in the text — worth adding a Skills block.`,
    missingSkillLabels.length
      ? `Consider adding: ${missingSkillLabels.slice(0, 4).join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // ---- roast
  const words = ctx.resume.split(/\s+/).filter(Boolean).length;
  const roast = [
    profile.roastHook,
    `You used ${words} words; a recruiter spends ~7 seconds on the first pass.`,
    hasNumbers
      ? 'The numbers you do have are good — double down and quantify every bullet.'
      : 'No numbers in sight — that is the #1 reason your ATS score stays middling.',
  ].join(' ');

  // ---- job-match extras (keys are stripped by Zod for resume schema)
  const matchScore = atsScore; // same scoring basis is fine for mock
  const gaps = missingSkillLabels.map(
    (label) => `No mention of ${label} — commonly expected for this role.`,
  );
  const matchSuggestions = improvements.slice(0, 6);

  return {
    // Resume schema
    roast,
    strengths: dedupe(strengths).slice(0, 5),
    improvements: dedupe(improvements).slice(0, 6),
    missingSkills: dedupe(missingSkillLabels).slice(0, 7),
    marketSignals: marketSignals.slice(0, 5),
    priorityGaps: priorityGaps.slice(0, 5),
    citations,
    optimized,
    atsScore,
    atsNotes,

    // Job-match schema
    score: matchScore,
    gaps: dedupe(gaps).slice(0, 8),
    suggestions: dedupe(matchSuggestions).slice(0, 8),
  };
}

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
