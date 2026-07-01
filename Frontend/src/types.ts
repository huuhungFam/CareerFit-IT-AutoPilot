export type Language = 'vi' | 'en';

export type Role = 'candidate' | 'recruiter' | 'admin';

export interface MockAccount {
  username: string;
  password: string;
  role: Role;
  displayName: string;
}

export type MatchLabel = 'Low' | 'Medium' | 'High' | 'Potential';
export type MatchFeedback = 'GOOD_MATCH' | 'POTENTIAL' | 'BAD_MATCH' | 'NOT_INTERESTED';

export interface Job {
  id: string;
  matchingId?: string;
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
  feedback?: MatchFeedback;
  tieBreakReason?: string;
  skillOverlapCount?: number;
  jobFreshness?: string;
  salaryFit?: string;
  locationFit?: string;
  status: 'new' | 'saved' | 'applied' | 'skipped';
  postedAt: string;
  postingStatus?: 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'PAUSED' | 'HIDDEN_BY_ADMIN';
  applicantCount?: number;
  matchCount?: number;
  salaryMode?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  remoteType?: string;
  employmentType?: string;
  domain?: string;
}

export interface RankingTieMeta {
  rank: number;
  tieRank: number;
  tieGroupSize: number;
  tied: boolean;
  sortKey: string;
  lastUpdatedAt?: string | null;
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
  emailNotificationsEnabled: boolean;
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
  notificationCooldownHours: number;
  replacementAfterSkipEnabled: boolean;
  replacementDelayMinutes: number;
  nextScanAt: string;
  updatedAt?: string | null;
}

export interface RecruiterCandidateItem {
  initials: string;
  matchingId: string;
  cvId?: string;
  candidateId: string;
  applicationId?: string | null;
  name: string;
  email?: string;
  title: string;
  location?: string;
  yearsOfExperience?: number;
  topSkills?: string[];
  cvSummary?: string;
  appliedAt: string;
  score: number;
  label: 'HIGH' | 'MEDIUM' | 'LOW' | 'POTENTIAL';
  isPotential: boolean;
  applicationStatus: string;
  hasApplied: boolean;
  tone: 'primary' | 'secondary';
  missingSignals?: string[];
  tie?: RankingTieMeta | null;
  tieBreakReason?: string;
  skillOverlapCount?: number;
  jobFreshness?: string;
  salaryFit?: string;
  locationFit?: string;
}

export interface Application {
  id: string;
  jobTitle: string;
  company: string;
  status: 'Applied' | 'Invited' | 'Auto-applied' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Reviewing';
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
