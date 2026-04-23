import type { PublicSkillRecord } from '../rag.types';

const SRC = {
  name: 'Comparison corpus',
  url: 'https://ai-career-copilot.local/corpus',
} as const;

/**
 * Resume, job, skill, and tip blurbs for retrieval / job–resume comparison.
 * Ingested with {@link PUBLIC_ROLE_SKILLS_SEED}; same metadata shape.
 */
export const COMPARISON_CORPUS_SEED: PublicSkillRecord[] = [
  {
    id: 'resume-mean-001',
    role: 'Resume sample (MEAN full stack)',
    skill: 'MongoDB, Express, Angular, Node.js',
    importance: 'core',
    evidence:
      'Senior Full Stack Developer with 6 years of experience in MEAN stack (MongoDB, Express.js, Angular, Node.js). Built scalable SaaS platforms, REST APIs, authentication systems using JWT, and real-time dashboards. Experienced in Docker, AWS deployment, CI/CD pipelines, and microservices architecture.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
    seniority: 'senior',
  },
  {
    id: 'resume-node-002',
    role: 'Resume sample (Node backend)',
    skill: 'Node.js, TypeScript, NestJS, AWS',
    importance: 'core',
    evidence:
      'Backend Engineer specialized in Node.js and TypeScript with expertise in building high-performance REST APIs using Express and NestJS. Worked with Redis caching, PostgreSQL optimization, Kafka-based event systems, and AWS Lambda serverless architecture.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
    seniority: 'mid',
  },
  {
    id: 'resume-angular-003',
    role: 'Resume sample (Angular frontend)',
    skill: 'Angular, TypeScript, RxJS',
    importance: 'core',
    evidence:
      'Frontend Developer with strong expertise in Angular, TypeScript, RxJS, and Angular Material. Built enterprise-grade single-page applications with reusable components, lazy loading modules, and performance optimization for large-scale dashboards.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
    seniority: 'mid',
  },
  {
    id: 'resume-java-004',
    role: 'Resume sample (Java backend)',
    skill: 'Java, Spring Boot, Microservices',
    importance: 'core',
    evidence:
      'Java Backend Engineer with 7 years of experience in Spring Boot, Hibernate, and microservices architecture. Designed distributed systems using Kafka, RabbitMQ, Docker, Kubernetes, and deployed cloud-native applications on AWS.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
    seniority: 'senior',
  },
  {
    id: 'job-node-001',
    role: 'Job posting (Node backend)',
    skill: 'Node.js, Express, AWS',
    importance: 'important',
    evidence:
      'We are hiring a Node.js Backend Developer to build scalable APIs using Express.js or NestJS. Candidate should have experience in TypeScript, MongoDB or PostgreSQL, Redis caching, authentication systems, and AWS deployment.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'job-mean-002',
    role: 'Job posting (MEAN stack)',
    skill: 'MEAN, Angular, Node.js',
    importance: 'important',
    evidence:
      'Looking for a MEAN Stack Developer with strong experience in MongoDB, Express.js, Angular, and Node.js. Must be able to build full-stack applications, authentication systems, and integrate REST APIs with modern frontend frameworks.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'job-angular-003',
    role: 'Job posting (Angular)',
    skill: 'Angular, TypeScript',
    importance: 'important',
    evidence:
      'Seeking Angular Developer skilled in Angular 15+, TypeScript, RxJS, and frontend architecture. Should build responsive UI applications, reusable components, and integrate REST APIs efficiently.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'job-java-004',
    role: 'Job posting (Java backend)',
    skill: 'Java, Spring Boot, Kafka',
    importance: 'important',
    evidence:
      'Hiring Java Backend Engineer with expertise in Spring Boot, microservices, Kafka, REST APIs, and cloud deployment using AWS or Azure. Experience with Docker and Kubernetes is required.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'skill-node',
    role: 'Skill reference (Node.js)',
    skill: 'Node.js',
    importance: 'emerging',
    evidence:
      'Node.js is a server-side runtime built on Chrome V8 engine used to build scalable backend APIs, microservices, and real-time applications using JavaScript or TypeScript.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'skill-angular',
    role: 'Skill reference (Angular)',
    skill: 'Angular',
    importance: 'emerging',
    evidence:
      'Angular is a frontend framework for building single-page applications using TypeScript. It provides dependency injection, reactive forms, RxJS-based reactive programming, and modular architecture.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'skill-mean',
    role: 'Skill reference (MEAN)',
    skill: 'MEAN',
    importance: 'emerging',
    evidence:
      'MEAN stack is a full-stack JavaScript framework consisting of MongoDB, Express.js, Angular, and Node.js used for building scalable web applications.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'skill-java',
    role: 'Skill reference (Java)',
    skill: 'Java',
    importance: 'emerging',
    evidence:
      'Java is a strongly typed backend programming language used for enterprise systems. Spring Boot simplifies microservices development and integrates with databases and messaging systems.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'career-tip-001',
    role: 'Career guidance (matching)',
    skill: 'Resume alignment and stack',
    importance: 'emerging',
    evidence:
      'To improve job matching results, tailor your resume with measurable achievements, highlight relevant tech stack, and align skills with job descriptions like Node.js, Angular, or Java.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
  {
    id: 'career-tip-002',
    role: 'Career guidance (backend)',
    skill: 'System design and cloud',
    importance: 'emerging',
    evidence:
      'Strong backend engineers should focus on system design, scalability, caching strategies, database optimization, and cloud deployment using AWS or Docker.',
    sourceName: SRC.name,
    sourceUrl: SRC.url,
  },
];
