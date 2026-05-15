import type {
  Application,
  AutomationPolicy,
  Candidate,
  CandidatePreference,
  EmailAction,
  Job,
  RecruiterSummary,
  TrendPoint,
} from '../types';

export const candidate: Candidate = {
  id: 'cand-01',
  name: 'Minh Anh',
  headline: 'Frontend Engineer | React, TypeScript, UX Systems',
  location: 'Ho Chi Minh City',
  email: 'minhanh@example.com',
};

export const preference: CandidatePreference = {
  desiredTitle: 'Senior Frontend Engineer',
  skills: ['React', 'TypeScript', 'Design System', 'Testing'],
  location: 'Hybrid Ho Chi Minh City',
  seniority: 'Senior',
  language: 'Vietnamese / English',
  autoApplyThreshold: 88,
};

export const automationPolicy: AutomationPolicy = {
  autoApplyEnabled: true,
  autoApplyThreshold: 88,
  scanEnabled: true,
  scanFrequency: '6 hours',
  highMatchEmailEnabled: true,
  highMatchThreshold: 90,
  dailyDigestEnabled: true,
  dailyDigestTime: '08:00',
  timezone: 'Asia/Ho_Chi_Minh',
  maxEmailsPerDay: 5,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  cooldownMinutes: 180,
  replacementAfterSkipEnabled: false,
  replacementDelayMinutes: 45,
  nextScanAt: 'Today, 14:30',
};

export const jobs: Job[] = [
  {
    id: 'job-01',
    title: 'Senior Frontend Engineer',
    company: 'Northstar HealthTech',
    location: 'Ho Chi Minh City, Hybrid',
    seniority: 'Senior',
    language: 'English',
    salary: '$3,000 - $4,200',
    requiredSkills: ['React', 'TypeScript', 'TanStack Query', 'Testing'],
    optionalSkills: ['Design System', 'Accessibility'],
    description:
      'Own the web experience for a healthcare automation platform, build reusable UI patterns, and partner with product teams on matching workflows.',
    normalizedScore: 94,
    label: 'High',
    isPotential: false,
    reasons: ['same tech stack', 'senior scope', 'automation domain'],
    status: 'new',
    postedAt: '2h ago',
  },
  {
    id: 'job-02',
    title: 'Product-minded React Developer',
    company: 'Orbit Talent AI',
    location: 'Remote Vietnam',
    seniority: 'Mid-Senior',
    language: 'Vietnamese / English',
    salary: '$2,400 - $3,500',
    requiredSkills: ['React', 'UX', 'REST API', 'Performance'],
    optionalSkills: ['Recharts', 'i18n'],
    description:
      'Build candidate-facing products with search, recommendations, email actions, and recruiter analytics.',
    normalizedScore: 89,
    label: 'High',
    isPotential: true,
    reasons: ['transferable skills', 'candidate UX', 'bilingual UI'],
    status: 'saved',
    postedAt: '1d ago',
  },
  {
    id: 'job-03',
    title: 'Fullstack TypeScript Engineer',
    company: 'Finflow Labs',
    location: 'Da Nang, Onsite',
    seniority: 'Senior',
    language: 'English',
    salary: '$2,800 - $4,000',
    requiredSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
    optionalSkills: ['Queue workers', 'Audit logs'],
    description:
      'Create workflow-heavy interfaces and API contracts for finance operations teams with strict auditability.',
    normalizedScore: 81,
    label: 'Medium',
    isPotential: true,
    reasons: ['audit-friendly product', 'typescript depth'],
    status: 'new',
    postedAt: '3d ago',
  },
  {
    id: 'job-04',
    title: 'UI Platform Engineer',
    company: 'AtlasWorks',
    location: 'Ho Chi Minh City',
    seniority: 'Lead',
    language: 'English',
    salary: '$3,500 - $5,000',
    requiredSkills: ['Design System', 'Accessibility', 'React', 'Storybook'],
    optionalSkills: ['Mentoring', 'Visual QA'],
    description:
      'Lead the internal UI platform and make complex recruiter workflows feel calm, fast, and reliable.',
    normalizedScore: 92,
    label: 'High',
    isPotential: false,
    reasons: ['design system match', 'leadership scope'],
    status: 'new',
    postedAt: '4d ago',
  },
];

export const applications: Application[] = [
  {
    id: 'app-01',
    jobTitle: 'Senior Frontend Engineer',
    company: 'Northstar HealthTech',
    status: 'Auto-applied',
    score: 94,
    source: 'autopilot',
    updatedAt: 'Today 09:15',
  },
  {
    id: 'app-02',
    jobTitle: 'Product-minded React Developer',
    company: 'Orbit Talent AI',
    status: 'Reviewing',
    score: 89,
    source: 'manual',
    updatedAt: 'Yesterday',
  },
  {
    id: 'app-03',
    jobTitle: 'UI Platform Engineer',
    company: 'AtlasWorks',
    status: 'Invited',
    score: 92,
    source: 'autopilot',
    updatedAt: 'May 14',
  },
];

export const recruiterSummary: RecruiterSummary = {
  activeJobs: 18,
  pendingApprovals: 7,
  highMatches: 132,
  invitesSent: 42,
};

export const trends: TrendPoint[] = [
  { day: 'Mon', jobs: 12, matches: 44 },
  { day: 'Tue', jobs: 18, matches: 57 },
  { day: 'Wed', jobs: 15, matches: 63 },
  { day: 'Thu', jobs: 23, matches: 81 },
  { day: 'Fri', jobs: 20, matches: 76 },
  { day: 'Sat', jobs: 11, matches: 35 },
  { day: 'Sun', jobs: 9, matches: 28 },
];

export const emailAction: EmailAction = {
  id: 'action-01',
  action: 'APPLY',
  target: 'Senior Frontend Engineer at Northstar HealthTech',
  score: 94,
  reason: 'Strong React, TypeScript, testing, and automation product match.',
  expiresAt: 'Today 18:00',
  status: 'valid',
};

export const delay = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));
