export type Language = 'vi' | 'en';

export type Role = 'candidate' | 'recruiter';

export type MatchLabel = 'Low' | 'Medium' | 'High' | 'Potential';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  seniority: string;
  language: string;
  salary: string;
  requiredSkills: string[];
  optionalSkills: string[];
  description: string;
  normalizedScore: number;
  label: MatchLabel;
  isPotential: boolean;
  reasons: string[];
  status: 'new' | 'saved' | 'applied' | 'skipped';
  postedAt: string;
}

export interface CandidatePreference {
  desiredTitle: string;
  skills: string[];
  location: string;
  seniority: string;
  language: string;
  autoApplyThreshold: number;
}

export interface AutomationPolicy {
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
  scanEnabled: boolean;
  scanFrequency: '1 hour' | '6 hours' | 'daily';
  highMatchEmailEnabled: boolean;
  highMatchThreshold: number;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  timezone: string;
  maxEmailsPerDay: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  cooldownMinutes: number;
  replacementAfterSkipEnabled: boolean;
  replacementDelayMinutes: number;
  nextScanAt: string;
}

export interface Application {
  id: string;
  jobTitle: string;
  company: string;
  status: 'Applied' | 'Invited' | 'Auto-applied' | 'Reviewing';
  score: number;
  source: 'manual' | 'autopilot';
  updatedAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  headline: string;
  location: string;
  email: string;
}

export interface RecruiterSummary {
  activeJobs: number;
  pendingApprovals: number;
  highMatches: number;
  invitesSent: number;
}

export interface TrendPoint {
  day: string;
  jobs: number;
  matches: number;
}

export interface EmailAction {
  id: string;
  action: 'APPLY' | 'SKIP' | 'INVITE';
  target: string;
  score: number;
  reason: string;
  expiresAt: string;
  status: 'valid' | 'used' | 'expired' | 'invalid';
}
