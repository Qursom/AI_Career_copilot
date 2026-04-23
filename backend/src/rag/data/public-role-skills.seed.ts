import type { PublicSkillRecord } from '../rag.types';

/**
 * Seeded from publicly available labor-market frameworks (O*NET + ESCO).
 * This gives a deterministic baseline corpus for retrieval before integrating
 * larger raw datasets in future iterations.
 */
export const PUBLIC_ROLE_SKILLS_SEED: PublicSkillRecord[] = [
  {
    id: 'backend-node-ts',
    role: 'Backend Engineer (Node.js)',
    skill: 'Node.js and TypeScript',
    importance: 'core',
    evidence:
      'Building API services with runtime reliability, type-safe contracts, and asynchronous processing is a recurring backend requirement.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
    seniority: 'mid-senior',
  },
  {
    id: 'backend-data-modeling',
    role: 'Backend Engineer (Node.js)',
    skill: 'PostgreSQL schema and query optimization',
    importance: 'core',
    evidence:
      'Job families for backend software engineers consistently prioritize data modeling and query performance for production systems.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'backend-observability',
    role: 'Backend Engineer (Node.js)',
    skill: 'Observability with tracing and metrics',
    importance: 'important',
    evidence:
      'Monitoring distributed services, incident response, and reliability engineering are common capability expectations in backend postings.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetcenter.org/',
  },
  {
    id: 'backend-cloud-containers',
    role: 'Backend Engineer (Node.js)',
    skill: 'Docker and cloud deployment patterns',
    importance: 'important',
    evidence:
      'Cloud-native deployment and container tooling appears frequently in software engineer and platform-oriented role profiles.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'frontend-react',
    role: 'Frontend Engineer',
    skill: 'React and modern component architecture',
    importance: 'core',
    evidence:
      'Front-end developer competency frameworks highlight client-side frameworks and modular UI engineering as primary skills.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/occupation_main',
  },
  {
    id: 'frontend-accessibility',
    role: 'Frontend Engineer',
    skill: 'Web accessibility (WCAG and ARIA)',
    importance: 'important',
    evidence:
      'Accessibility standards and inclusive design are increasingly included in frontend and product engineering role requirements.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'frontend-performance',
    role: 'Frontend Engineer',
    skill: 'Web performance optimization',
    importance: 'important',
    evidence:
      'Improving page performance, responsive rendering, and UX quality is repeatedly mapped to front-end engineering competence.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'fullstack-api-ui',
    role: 'Full-Stack Engineer',
    skill: 'End-to-end delivery across UI and API layers',
    importance: 'core',
    evidence:
      'Full-stack role taxonomies emphasize implementing features across frontend interfaces and backend service layers.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/occupation_main',
  },
  {
    id: 'fullstack-testing',
    role: 'Full-Stack Engineer',
    skill: 'Automated testing across integration boundaries',
    importance: 'important',
    evidence:
      'Cross-layer quality practices and integration testing are recurrent expectations for full-stack software roles.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetcenter.org/',
  },
  {
    id: 'data-eng-pipelines',
    role: 'Data Engineer',
    skill: 'Batch and streaming data pipelines',
    importance: 'core',
    evidence:
      'Data engineering competency models repeatedly include ETL/ELT pipeline orchestration, transformation, and reliability.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'data-eng-warehouse',
    role: 'Data Engineer',
    skill: 'Data warehouse modeling and SQL optimization',
    importance: 'core',
    evidence:
      'Warehouse optimization and analytical data modeling are core expectations in data engineering occupational profiles.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'ml-experimentation',
    role: 'Machine Learning Engineer',
    skill: 'Model experimentation and evaluation metrics',
    importance: 'core',
    evidence:
      'ML role definitions consistently require experimentation design, model validation, and measurable performance tracking.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'ml-mlops',
    role: 'Machine Learning Engineer',
    skill: 'MLOps lifecycle and model monitoring',
    importance: 'important',
    evidence:
      'Operationalizing ML systems with deployment and monitoring is increasingly listed in ML engineering skill taxonomies.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'devops-iac',
    role: 'DevOps / SRE Engineer',
    skill: 'Infrastructure as code and automation',
    importance: 'core',
    evidence:
      'DevOps and reliability roles are strongly associated with infrastructure automation and reproducible deployment practices.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetcenter.org/',
  },
  {
    id: 'devops-slo',
    role: 'DevOps / SRE Engineer',
    skill: 'Service reliability metrics (SLO, SLI, MTTR)',
    importance: 'important',
    evidence:
      'Reliability engineering profiles emphasize incident response, monitoring, and service-level objective management.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
];
