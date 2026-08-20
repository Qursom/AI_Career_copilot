import type { PublicSkillRecord } from '../rag.types';

/**
 * Adjacent role families that the original O*NET/ESCO seed did not cover.
 * Product, security, mobile, QA, data analysis, and staff/EM expectations
 * show up constantly in job-match queries that previously retrieved nothing.
 */
export const ADJACENT_ROLES_SEED: PublicSkillRecord[] = [
  {
    id: 'pm-discovery',
    role: 'Product Manager',
    skill: 'Discovery, problem framing, and outcome metrics',
    importance: 'core',
    evidence:
      'Product management competency models emphasize customer discovery, framing the problem, and tying roadmaps to measurable outcomes rather than output volume.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
    seniority: 'mid-senior',
  },
  {
    id: 'pm-prioritization',
    role: 'Product Manager',
    skill: 'Prioritization frameworks and stakeholder alignment',
    importance: 'core',
    evidence:
      'Role taxonomies for product managers repeatedly include trade-off analysis, RICE/WSJF-style prioritization, and alignment across engineering, design, and go-to-market.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/occupation_main',
  },
  {
    id: 'security-appsec',
    role: 'Security Engineer',
    skill: 'Application security and threat modeling',
    importance: 'core',
    evidence:
      'Application security engineering profiles require threat modeling, secure SDLC practices, and review of authentication, authorization, and data-handling paths.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
    seniority: 'mid-senior',
  },
  {
    id: 'security-detection',
    role: 'Security Engineer',
    skill: 'Detection engineering and incident response',
    importance: 'important',
    evidence:
      'Security operations and detection engineering postings emphasize log pipelines, detection rules, and structured incident response.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'mobile-native',
    role: 'Mobile Engineer',
    skill: 'Native iOS or Android application architecture',
    importance: 'core',
    evidence:
      'Mobile developer competency frameworks highlight native platform APIs, app lifecycle, and architecture patterns such as MVVM or unidirectional data flow.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/occupation_main',
  },
  {
    id: 'mobile-release',
    role: 'Mobile Engineer',
    skill: 'Release engineering, crash analytics, and store compliance',
    importance: 'important',
    evidence:
      'Shipping mobile products requires CI for store builds, crash/analytics instrumentation, and compliance with platform review guidelines.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'qa-automation',
    role: 'QA / Test Engineer',
    skill: 'Automated UI and API test design',
    importance: 'core',
    evidence:
      'Quality-engineering taxonomies emphasize automating regression at the API and UI layers and designing tests from risk, not from screenshots of happy paths.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'qa-quality-strategy',
    role: 'QA / Test Engineer',
    skill: 'Test strategy, coverage, and defect triage',
    importance: 'important',
    evidence:
      'Senior QA profiles include risk-based test strategy, coverage analysis, and collaborating with engineering on defect severity and escape prevention.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetcenter.org/',
  },
  {
    id: 'analyst-sql',
    role: 'Data Analyst',
    skill: 'SQL analysis and metric definition',
    importance: 'core',
    evidence:
      'Data analyst occupational profiles consistently require SQL, warehouse querying, and defining metrics that the business can actually decide from.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
  },
  {
    id: 'analyst-viz',
    role: 'Data Analyst',
    skill: 'Dashboarding and stakeholder storytelling',
    importance: 'important',
    evidence:
      'Analyst competency models include turning queries into dashboards and written narratives that non-technical stakeholders can act on.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/skill_main',
  },
  {
    id: 'staff-technical-direction',
    role: 'Staff Engineer',
    skill: 'Cross-team technical direction and design review',
    importance: 'core',
    evidence:
      'Staff-plus engineering taxonomies emphasize setting technical direction across teams, reviewing designs for failure modes, and reducing coordination cost.',
    sourceName: 'O*NET + ESCO crosswalk',
    sourceUrl: 'https://www.onetonline.org/',
    seniority: 'staff',
  },
  {
    id: 'em-delivery',
    role: 'Engineering Manager',
    skill: 'Delivery systems, coaching, and hiring',
    importance: 'core',
    evidence:
      'Engineering-manager role definitions combine delivery systems, people coaching, and hiring bar-setting rather than individual ticket throughput.',
    sourceName: 'ESCO framework',
    sourceUrl: 'https://esco.ec.europa.eu/en/classification/occupation_main',
    seniority: 'manager',
  },
];
