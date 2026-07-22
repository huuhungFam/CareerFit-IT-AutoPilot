import type { AutomationPolicy, Job, MatchFeedback, MatchLabel, MockAccount, RecruiterCandidateItem, Role } from '../types';

const API_BASE_URL = ((import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'careerfit.accessToken';
const ACCOUNT_KEY = 'careerfit.account';

type SalaryDisplayDto = {
  mode?: string | null;
  min?: number | string | null;
  max?: number | string | null;
  currency?: string | null;
  type?: string | null;
  isVisible?: boolean;
  displayText?: string | null;
};

type JobCardDto = {
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  remoteType?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salary?: SalaryDisplayDto | null;
  requiredSkills?: string[] | null;
  domain?: string | null;
  language?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type JobDetailDto = JobCardDto & {
  niceToHaveSkills?: string[] | null;
  originalText?: string | null;
  updatedAt?: string | null;
};

type CandidateJobCardDto = {
  matchingId?: string | null;
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  remoteType?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salaryDisplay?: string | null;
  requiredSkills?: string[] | null;
  optionalSkills?: string[] | null;
  normalizedScore?: number | string | null;
  label?: string | null;
  isPotential?: boolean;
  reasons?: string[] | null;
  potentialReason?: string | null;
  matchedAt?: string | null;
};

type JobListDto = {
  jobs: JobCardDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};

type CandidateJobListDto = {
  jobs: CandidateJobCardDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};

type JobRecommendationDto = {
  jobId: string;
  title: string;
  company: string;
  location?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salaryDisplay?: string | null;
  language?: string | null;
  finalScore?: number | null;
  matchLabel?: string | null;
  isPotential?: boolean;
  requiredSkills?: string[] | null;
  matchingSkills?: string[] | null;
  postedAt?: string | null;
};

export type CandidateJobPage = {
  jobs: Job[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};

export type CandidateJobPageParams = {
  page?: number;
  size?: number;
  label?: string;
  potentialOnly?: boolean;
  minScore?: number;
};

type SuggestionsDto = {
  titles?: string[] | null;
  companies?: string[] | null;
  skills?: string[] | null;
};

export type EmployerSummaryDto = {
  id: string;
  companyName: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  summary?: string | null;
  industry?: string | null;
  companySize?: string | null;
  location?: string | null;
  isFeatured: boolean;
  jobCount: number;
};

export type EmployerDetailDto = EmployerSummaryDto & {
  description?: string | null;
  websiteUrl?: string | null;
  benefits?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RecruiterDashboardDto = {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
  recentJobs: number;
};

type RecruiterJobDto = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  seniorityLevel?: string | null;
  status?: string | null;
  applicantCount?: number;
  matchCount?: number;
  createdAt?: string | null;
};

export type AdvancedTrendPoint = {
  date: string;
  jobs: number;
  matches: number;
  applications: number;
  views: number;
  avgMatchScore: number;
};

export type AdvancedSkillDemandItem = {
  skill: string;
  jobCount: number;
  candidateHasSkill?: boolean;
};

export type AdvancedSalaryBucket = {
  currency: string;
  seniority: string;
  jobCount: number;
  minSalary: number;
  averageSalary: number;
  maxSalary: number;
};

export type AdvancedMarketOverview = {
  activeJobs: number;
  totalJobs: number;
  newJobsInRange: number;
  employers: number;
  jobViews: number;
  jobSearches: number;
  applications: number;
  matchings: number;
  topSkills: AdvancedSkillDemandItem[];
  salaryDistribution: AdvancedSalaryBucket[];
};

export type CandidateAnalyticsOverview = {
  profileCompleteness: number;
  cvCount: number;
  scoringDoneCvCount: number;
  totalMatches: number;
  highMatches: number;
  potentialMatches: number;
  averageMatchScore: number;
  bestMatchScore: number;
  totalApplications: number;
  applicationFunnel: Record<string, number>;
  skillDemand: AdvancedSkillDemandItem[];
  profileGaps: Array<{ skill: string; marketDemand: number; reason: string }>;
};

export type RecruiterAnalyticsOverview = {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  invited: number;
  autoApplied: number;
  totalMatchings: number;
  highMatchings: number;
  potentialMatchings: number;
  averageMatchScore: number;
  jobViews: number;
  topJobs: Array<{
    jobId: string;
    title: string;
    status: string;
    views: number;
    matches: number;
    applications: number;
    avgMatchScore: number;
  }>;
};

type AuthResponseDto = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    emailVerified: boolean;
  };
};

type MeResponseDto = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  emailVerified: boolean;
  preferredLanguage?: string | null;
};

export type CvStatus = 'UPLOADED' | 'VALIDATING' | 'PROCESSING' | 'SCORING_DONE' | 'FAILED';

export type CandidateCvDto = {
  id: string;
  displayName: string;
  source: 'UPLOAD' | 'MANUAL';
  isDefault: boolean;
  status: CvStatus;
  language?: string | null;
  topSkills: string[];
  parsedSummary?: string | null;
  lastScoredAt?: string | null;
  createdAt: string;
};

export type CandidateCvDetailDto = CandidateCvDto & {
  rawText?: string | null;
  failureReason?: string | null;
  updatedAt?: string | null;
};

export type CvStatusDto = {
  id: string;
  status: CvStatus;
  failureReason?: string | null;
  lastScoredAt?: string | null;
};

export type CvUploadDto = {
  id: string;
  displayName: string;
  status: CvStatus;
  message?: string | null;
  qualitySignals?: Array<{ code?: string; level?: string; message?: string }>;
};

type CvListDto = {
  cvs: CandidateCvDto[];
  total: number;
  defaultCvId?: string | null;
};

export type MarketStatsDto = {
  activeJobs: number;
  totalJobs: number;
  newJobsToday: number;
  employers: number;
  distributionByRole?: Record<string, number> | null;
  distributionBySalary?: Record<string, number> | null;
};

export type MarketTrendPointDto = {
  date: string;
  activeJobs: number;
  newJobs: number;
};

export type SearchSuggestionGroup = Array<{ group: string; items: string[] }>;

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function getToken() {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

function saveSession(account: MockAccount, token?: string) {
  window.sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as any;

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiRequestError(payload?.error?.message ?? payload?.message ?? `Request failed: ${response.status}`, response.status);
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}

function normalizeRole(role: string): Role {
  const r = role.toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'recruiter') return 'recruiter';
  return 'candidate';
}

function toAccount(payload: AuthResponseDto): MockAccount {
  return {
    username: payload.user.email,
    password: '',
    role: normalizeRole(payload.user.role),
    displayName: payload.user.fullName,
  };
}

function normalizeLabel(label?: string | null): MatchLabel {
  const normalized = label?.toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'potential') return 'Potential';
  if (normalized === 'high') return 'High';
  return 'Low';
}

function formatSalary(salary?: SalaryDisplayDto | null, salaryDisplay?: string | null) {
  if (salaryDisplay) return salaryDisplay;
  if (!salary || salary.isVisible === false || salary.mode === 'HIDDEN') return 'Negotiable';
  if (salary.displayText) return salary.displayText;

  const currency = salary.currency ?? 'USD';
  if (salary.min && salary.max) return `${currency} ${salary.min} - ${salary.max}`;
  if (salary.min) return `From ${currency} ${salary.min}`;
  if (salary.max) return `Up to ${currency} ${salary.max}`;
  return salary.mode === 'NEGOTIABLE' ? 'Negotiable' : 'Salary not listed';
}

function formatPostedAt(value?: string | null) {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  return date.toLocaleDateString('vi-VN');
}

function mapStatus(status?: string | null): Job['status'] {
  if (status === 'CLOSED' || status === 'PAUSED') return 'skipped';
  if (status === 'DRAFT') return 'saved';
  return 'new';
}

function meToAccount(payload: MeResponseDto): MockAccount {
  return {
    username: payload.email,
    password: '',
    role: normalizeRole(payload.role),
    displayName: payload.fullName,
  };
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Polling cancelled', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Polling cancelled', 'AbortError'));
    }, { once: true });
  });
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CF';
}

function normalizeRecruiterLabel(label?: string | null): RecruiterCandidateItem['label'] {
  const normalized = label?.toUpperCase();
  if (normalized === 'MEDIUM') return 'MEDIUM';
  if (normalized === 'LOW') return 'LOW';
  if (normalized === 'POTENTIAL') return 'POTENTIAL';
  return 'HIGH';
}

function mapRecruiterCandidate(dto: any): RecruiterCandidateItem {
  const name = dto.name ?? dto.candidateName ?? 'Candidate';
  const score = Math.round(Number(dto.score ?? dto.normalizedScore ?? 0));
  const applicationStatus = dto.applicationStatus ?? 'NONE';
  const label = normalizeRecruiterLabel(dto.label);

  return {
    initials: dto.initials ?? initialsFromName(name),
    matchingId: dto.matchingId ?? '',
    cvId: dto.cvId ?? undefined,
    candidateId: dto.candidateId,
    applicationId: dto.applicationId ?? null,
    name,
    email: dto.email ?? dto.candidateEmail ?? undefined,
    title: dto.title ?? dto.desiredTitle ?? 'Candidate',
    location: dto.location ?? undefined,
    yearsOfExperience: dto.yearsOfExperience ?? undefined,
    topSkills: dto.topSkills ?? [],
    cvSummary: dto.cvSummary ?? dto.parsedSummary ?? undefined,
    appliedAt: dto.appliedAt ? formatPostedAt(dto.appliedAt) : formatPostedAt(dto.matchedAt),
    score,
    label,
    isPotential: Boolean(dto.isPotential),
    applicationStatus,
    hasApplied: Boolean(dto.hasApplied),
    tone: score >= 85 ? 'primary' : 'secondary',
    missingSignals: dto.missingSignals ?? undefined,
    tie: dto.tie ?? null,
    tieBreakReason: dto.tieBreakReason ?? undefined,
    skillOverlapCount: dto.skillOverlapCount ?? undefined,
    jobFreshness: dto.jobFreshness ?? undefined,
    salaryFit: dto.salaryFit ?? undefined,
    locationFit: dto.locationFit ?? undefined,
    portfolioVisible: Boolean(dto.portfolioVisible),
    portfolio: dto.portfolio ?? null,
    portfolioHiddenReason: dto.portfolioHiddenReason ?? null,
  };
}

function normalizeTime(value?: string | null) {
  if (!value) return '08:00';
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function normalizeScanFrequency(value?: string | null): AutomationPolicy['scanFrequency'] {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('daily') || normalized.includes('24')) return 'daily';
  if (normalized.includes('6')) return '6 hours';
  return '1 hour';
}

function mapAutomationPolicy(dto: any): AutomationPolicy {
  const cooldownHours = Number(dto.notificationCooldownHours ?? 24);
  return {
    autoApplyEnabled: Boolean(dto.autoApplyEnabled),
    autoApplyThreshold: Number(dto.autoApplyThreshold ?? 90),
    emailNotificationsEnabled: dto.emailNotificationsEnabled !== false,
    scanEnabled: Boolean(dto.scanEnabled ?? dto.autopilotEnabled ?? dto.highMatchEmailEnabled),
    scanFrequency: normalizeScanFrequency(dto.scanFrequency ?? dto.digestFrequency),
    highMatchEmailEnabled: Boolean(dto.highMatchEmailEnabled ?? dto.autopilotEnabled ?? dto.notifyOnHighOnly),
    highMatchThreshold: Number(dto.highMatchThreshold ?? dto.minScoreToNotify ?? 90),
    dailyDigestEnabled: dto.dailyDigestEnabled ?? dto.digestEnabled ?? true,
    dailyDigestTime: normalizeTime(dto.dailyDigestTime ?? dto.digestTime),
    timezone: dto.timezone ?? dto.userTimezone ?? 'Asia/Ho_Chi_Minh',
    maxEmailsPerDay: Number(dto.maxEmailsPerDay ?? dto.maxEmailPerDay ?? dto.maxNotificationsPerDay ?? 5),
    quietHoursEnabled: Boolean(dto.quietHoursEnabled),
    quietHoursStart: normalizeTime(dto.quietHoursStart ?? '22:00'),
    quietHoursEnd: normalizeTime(dto.quietHoursEnd ?? '07:00'),
    cooldownMinutes: Number(dto.cooldownMinutes ?? cooldownHours * 60),
    notificationCooldownHours: cooldownHours,
    replacementAfterSkipEnabled: Boolean(dto.replacementAfterSkipEnabled),
    replacementDelayMinutes: Number(dto.replacementDelayMinutes ?? 45),
    nextScanAt: dto.nextScanAt ?? 'Backend scheduled',
    updatedAt: dto.updatedAt ?? null,
  };
}

function toAutomationPolicyPatch(payload: Partial<AutomationPolicy>) {
  const patch: Record<string, unknown> = { ...payload };

  if ('highMatchEmailEnabled' in payload) {
    patch.autopilotEnabled = payload.highMatchEmailEnabled;
    patch.notifyOnHighOnly = payload.highMatchEmailEnabled;
    delete patch.highMatchEmailEnabled;
  }
  if ('highMatchThreshold' in payload) {
    patch.minScoreToNotify = payload.highMatchThreshold;
    delete patch.highMatchThreshold;
  }
  if ('dailyDigestEnabled' in payload) {
    patch.digestEnabled = payload.dailyDigestEnabled;
    delete patch.dailyDigestEnabled;
  }
  if ('maxEmailsPerDay' in payload) {
    patch.maxNotificationsPerDay = payload.maxEmailsPerDay;
    delete patch.maxEmailsPerDay;
  }
  if ('cooldownMinutes' in payload && !('notificationCooldownHours' in payload)) {
    patch.notificationCooldownHours = Math.round(Number(payload.cooldownMinutes ?? 0) / 60);
  }

  delete patch.scanEnabled;
  delete patch.scanFrequency;
  delete patch.dailyDigestTime;
  delete patch.timezone;
  delete patch.cooldownMinutes;
  delete patch.nextScanAt;
  delete patch.updatedAt;
  return patch;
}

export function mapPublicJob(dto: JobCardDto | JobDetailDto): Job {
  const detail = dto as JobDetailDto;
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', ') || 'Not specified',
    seniority: dto.seniorityLevel ?? dto.employmentType ?? 'Not specified',
    language: dto.language ?? 'Not specified',
    salary: formatSalary(dto.salary),
    requiredSkills: dto.requiredSkills ?? [],
    optionalSkills: detail.niceToHaveSkills ?? [],
    description: detail.originalText ?? 'No description provided.',
    normalizedScore: 0,
    label: 'Low',
    isPotential: false,
    reasons: [],
    status: mapStatus(dto.status),
    postedAt: formatPostedAt(dto.createdAt),
  };
}

export function mapCandidateJob(dto: CandidateJobCardDto): Job {
  return {
    id: dto.id,
    matchingId: dto.matchingId ?? undefined,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', ') || 'Not specified',
    seniority: dto.seniorityLevel ?? dto.employmentType ?? 'Not specified',
    language: 'Not specified',
    salary: formatSalary(null, dto.salaryDisplay),
    requiredSkills: dto.requiredSkills ?? [],
    optionalSkills: dto.optionalSkills ?? [],
    description: dto.potentialReason ?? 'No description provided.',
    normalizedScore: Number(dto.normalizedScore ?? 0),
    label: normalizeLabel(dto.label),
    isPotential: Boolean(dto.isPotential),
    reasons: dto.reasons ?? [],
    status: 'new',
    postedAt: formatPostedAt(dto.matchedAt),
  };
}

export function mapRecruiterJob(dto: RecruiterJobDto): Job {
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: dto.location ?? 'Not specified',
    seniority: dto.seniorityLevel ?? 'Not specified',
    language: 'Not specified',
    salary: 'Not specified',
    requiredSkills: [],
    optionalSkills: [],
    description: 'Open the job workspace for details.',
    normalizedScore: 0,
    label: 'Low',
    isPotential: false,
    reasons: [],
    status: mapStatus(dto.status),
    postedAt: formatPostedAt(dto.createdAt),
  };
}

function mapRecommendation(dto: JobRecommendationDto): Job {
  return {
    id: dto.jobId,
    title: dto.title,
    company: dto.company,
    location: dto.location ?? 'Not specified',
    seniority: dto.seniorityLevel ?? dto.employmentType ?? 'Not specified',
    language: dto.language ?? 'Not specified',
    salary: dto.salaryDisplay ?? 'Negotiable',
    requiredSkills: dto.requiredSkills ?? [],
    optionalSkills: [],
    description: 'Recommended role based on your CV and candidate profile.',
    normalizedScore: Math.round(Number(dto.finalScore ?? 0)),
    label: normalizeLabel(dto.matchLabel),
    isPotential: Boolean(dto.isPotential),
    reasons: dto.matchingSkills ?? [],
    status: 'new',
    postedAt: formatPostedAt(dto.postedAt),
  };
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export const careerfitApi = {
  restoreAccount() {
    const raw = window.sessionStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MockAccount;
    } catch {
      return null;
    }
  },

  clearSession() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(ACCOUNT_KEY);
  },

  async getCurrentUser() {
    return request<MeResponseDto>('/auth/me');
  },

  async restoreSession() {
    const storedAccount = careerfitApi.restoreAccount();
    if (!getToken()) {
      if (storedAccount) careerfitApi.clearSession();
      return null;
    }
    try {
      const me = await careerfitApi.getCurrentUser();
      const account = meToAccount(me);
      saveSession(account);
      return account;
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        careerfitApi.clearSession();
        return null;
      }
      // A temporary outage should not discard the last server-validated identity.
      return storedAccount;
    }
  },

  async login(identifier: string, password: string) {
    const payload = await request<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier.trim(), password }),
    });
    const account = toAccount(payload);
    saveSession(account, payload.accessToken);
    return account;
  },

  async register(email: string, password: string, fullName: string, role: 'CANDIDATE' | 'RECRUITER') {
    const payload = await request<AuthResponseDto>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim(), role }),
    });
    const account = toAccount(payload);
    saveSession(account, payload.accessToken);
    return account;
  },

  async requestPasswordless(email: string) {
    return request<{ message: string; token: string | null; expiresInMinutes: number }>('/auth/passwordless/request', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  async inspectPasswordlessToken(token: string) {
    return request<string>(`/auth/passwordless/verify?token=${encodeURIComponent(token)}`);
  },

  async verifyPasswordlessToken(token: string) {
    const payload = await request<AuthResponseDto>('/auth/passwordless/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    const initialAccount = toAccount(payload);
    saveSession(initialAccount, payload.accessToken);
    const me = await careerfitApi.getCurrentUser();
    const account = meToAccount(me);
    saveSession(account);
    return account;
  },

  async searchJobs(keyword = '') {
    const params = new URLSearchParams({ page: '0', size: '20', sort: 'recent' });
    if (keyword.trim()) params.set('keyword', keyword.trim());
    const payload = await request<JobListDto>(`/jobs/search?${params}`);
    return payload.jobs.map(mapPublicJob);
  },

  async getJob(jobId: string) {
    const payload = await request<JobDetailDto>(`/jobs/${jobId}`);
    return mapPublicJob(payload);
  },

  async getFeaturedEmployers() {
    return request<EmployerSummaryDto[]>('/employers/featured');
  },

  async getEmployer(slug: string) {
    return request<EmployerDetailDto>(`/employers/${encodeURIComponent(slug)}`);
  },

  async getEmployerJobs(slug: string) {
    const payload = await request<JobListDto>(`/employers/${encodeURIComponent(slug)}/jobs?page=0&size=20`);
    return payload.jobs.map(mapPublicJob);
  },

  async getSimilarJobs(jobId: string, limit = 5) {
    const payload = await request<JobRecommendationDto[]>(`/recommendations/jobs/${encodeURIComponent(jobId)}/similar?limit=${limit}`);
    return payload.map(mapRecommendation);
  },

  async getRecommendations(limit = 20) {
    const payload = await request<JobRecommendationDto[]>(`/recommendations/jobs?limit=${limit}`);
    return payload.map(mapRecommendation);
  },

  async getCandidateJobsPage(params: CandidateJobPageParams = {}): Promise<CandidateJobPage> {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    });
    if (params.label) query.set('label', params.label);
    if (params.potentialOnly) query.set('potentialOnly', 'true');
    if (params.minScore && params.minScore > 0) query.set('minScore', String(params.minScore));

    const payload = await request<CandidateJobListDto>(`/matches/me/cards?${query}`);
    return {
      jobs: payload.jobs.map(mapCandidateJob),
      total: payload.total,
      page: payload.page,
      size: payload.size,
      totalPages: payload.totalPages,
    };
  },

  async getCandidateJobs() {
    const payload = await careerfitApi.getCandidateJobsPage({ page: 0, size: 20 });
    return payload.jobs;
  },

  async getSearchSuggestions(keyword: string): Promise<SearchSuggestionGroup> {
    const trimmed = keyword.trim();
    if (!trimmed) return [];
    const payload = await request<SuggestionsDto>(`/jobs/search/suggestions?keyword=${encodeURIComponent(trimmed)}`);
    return [
      { group: 'searchGroupSkills', items: payload.skills ?? [] },
      { group: 'searchGroupJobTitle', items: payload.titles ?? [] },
      { group: 'searchGroupCompany', items: payload.companies ?? [] },
    ];
  },

  async getRecruiterDashboard() {
    const payload = await request<RecruiterDashboardDto>('/recruiter/dashboard');
    return {
      activeJobs: payload.activeJobs,
      pendingApprovals: payload.pendingReview,
      highMatches: payload.totalApplicants,
      invitesSent: payload.recentJobs,
    };
  },

  async getRecruiterJobs() {
    const payload = await request<RecruiterJobDto[]>('/recruiter/jobs');
    return payload.map(mapRecruiterJob);
  },

  async getAdvancedMarketOverview(rangeDays = 30) {
    return request<AdvancedMarketOverview>(`/analytics/market/overview?rangeDays=${rangeDays}`);
  },

  async getAdvancedMarketSkills(top = 12) {
    return request<AdvancedSkillDemandItem[]>(`/analytics/market/skills?top=${top}`);
  },

  async getAdvancedMarketSalary() {
    return request<AdvancedSalaryBucket[]>('/analytics/market/salary');
  },

  async getAdvancedMarketTrends(days = 30) {
    return request<AdvancedTrendPoint[]>(`/analytics/market/trends?days=${days}`);
  },

  async getMarketStats() {
    return request<MarketStatsDto>('/analytics/stats');
  },

  async getMarketTrend(days = 7) {
    return request<MarketTrendPointDto[]>(`/analytics/trend?days=${days}`);
  },

  async getMarketRoles(top = 6) {
    return request<Record<string, number>>(`/analytics/roles?top=${top}`);
  },

  async getCandidateAdvancedOverview() {
    return request<CandidateAnalyticsOverview>('/candidate/analytics/overview');
  },

  async getCandidateAdvancedSkillDemand() {
    return request<AdvancedSkillDemandItem[]>('/candidate/analytics/skill-demand');
  },

  async getCandidateAdvancedProfileGaps(top = 12) {
    return request<CandidateAnalyticsOverview['profileGaps']>(`/candidate/analytics/profile-gaps?top=${top}`);
  },

  async getCandidateAdvancedTrends(days = 30) {
    return request<AdvancedTrendPoint[]>(`/candidate/analytics/match-trends?days=${days}`);
  },

  async getRecruiterAdvancedOverview(rangeDays = 30) {
    return request<RecruiterAnalyticsOverview>(`/recruiter/analytics/overview?rangeDays=${rangeDays}`);
  },

  async getRecruiterAdvancedTrends(days = 30) {
    return request<AdvancedTrendPoint[]>(`/recruiter/analytics/trends?days=${days}`);
  },

  async exportRecruiterJobs() {
    const jobs = await request<RecruiterJobDto[]>('/recruiter/jobs');
    const rows = [
      ['Title', 'Company', 'Location', 'Seniority', 'Status', 'Applicants', 'Matches', 'Created at'],
      ...jobs.map((job) => [
        job.title,
        job.company,
        job.location ?? '',
        job.seniorityLevel ?? '',
        job.status ?? '',
        String(job.applicantCount ?? 0),
        String(job.matchCount ?? 0),
        job.createdAt ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    return new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  },

  async submitApplication(jobId: string) {
    return request<any>('/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async getCandidateCvs() {
    const payload = await request<CvListDto>('/cv/me');
    return payload.cvs;
  },

  async getCandidateProfile() {
    return request<any>('/candidates/me');
  },

  async uploadCv(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<CvUploadDto>('/cv/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async createManualCv(payload: any) {
    return request<CvUploadDto>('/cv/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateCandidateAccount(fullName: string) {
    return request<any>('/candidates/me/account', {
      method: 'PATCH',
      body: JSON.stringify({ fullName }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateCandidateProfile(payload: any) {
    return request<any>('/candidates/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async setDefaultCv(cvId: string) {
    return request<CandidateCvDto>(`/cv/${encodeURIComponent(cvId)}/set-default`, {
      method: 'POST',
    });
  },

  async getCv(cvId: string) {
    return request<CandidateCvDetailDto>(`/cv/${encodeURIComponent(cvId)}`);
  },

  async getCvStatus(cvId: string) {
    return request<CvStatusDto>(`/cv/${encodeURIComponent(cvId)}/status`);
  },

  async deleteCv(cvId: string) {
    return request<void>(`/cv/${encodeURIComponent(cvId)}`, { method: 'DELETE' });
  },

  async waitForCvProcessing(
    cvId: string,
    options: { timeoutMs?: number; intervalMs?: number; maxRetries?: number; signal?: AbortSignal } = {},
  ) {
    const timeoutMs = options.timeoutMs ?? 90_000;
    const intervalMs = options.intervalMs ?? 1_200;
    const maxRetries = options.maxRetries ?? 3;
    const startedAt = Date.now();
    let consecutiveErrors = 0;

    while (Date.now() - startedAt < timeoutMs) {
      if (options.signal?.aborted) throw new DOMException('Polling cancelled', 'AbortError');
      let status: CvStatusDto;
      try {
        status = await careerfitApi.getCvStatus(cvId);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        consecutiveErrors += 1;
        const isClientError = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
        if (consecutiveErrors > maxRetries || isClientError) throw error;
        await wait(intervalMs, options.signal);
        continue;
      }
      consecutiveErrors = 0;
      if (status.status === 'SCORING_DONE') return status;
      if (status.status === 'FAILED') throw new Error(status.failureReason || 'CV processing failed.');
      await wait(intervalMs, options.signal);
    }
    throw new Error('CV_PROCESSING_TIMEOUT');
  },

  async getPortfolio() {
    return request<any>('/candidates/me/portfolio');
  },

  async updatePortfolioLink(id: string, payload: any) {
    return request<any>(`/candidates/me/portfolio/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async createPortfolioLink(payload: any) {
    return request<any>('/candidates/me/portfolio/links', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updatePortfolioProject(id: string, payload: any) {
    return request<any>(`/candidates/me/portfolio/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async createPortfolioProject(payload: any) {
    return request<any>('/candidates/me/portfolio/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async deletePortfolioLink(id: string) {
    return request<any>(`/candidates/me/portfolio/links/${id}`, { method: 'DELETE' });
  },

  async deletePortfolioProject(id: string) {
    return request<any>(`/candidates/me/portfolio/projects/${id}`, { method: 'DELETE' });
  },

  async getMyApplications(page = 0, size = 20) {
    const payload = await request<any>(`/applications/me?page=${page}&size=${size}`);
    return payload.content || payload;
  },

  async withdrawApplication(applicationId: string) {
    return request<any>(`/applications/${applicationId}`, { method: 'DELETE' });
  },

  async getAutomationPolicy() {
    const payload = await request<any>('/automation/policy');
    return mapAutomationPolicy(payload);
  },

  async updateEmailNotifications(enabled: boolean) {
    const payload = await request<any>('/automation/policy/email-notifications', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
      headers: { 'Content-Type': 'application/json' },
    });
    return mapAutomationPolicy(payload);
  },

  async updateAutomationPolicy(payload: Partial<AutomationPolicy>) {
    const updated = await request<any>('/automation/policy', {
      method: 'PATCH',
      body: JSON.stringify(toAutomationPolicyPatch(payload)),
      headers: { 'Content-Type': 'application/json' },
    });
    return mapAutomationPolicy(updated);
  },

  async runAutoApplyNow() {
    return request<any>('/automation/auto-apply/run-now', { method: 'POST' });
  },

  async getSettings() {
    return request<any>('/settings/me');
  },

  async updateSettings(payload: any) {
    return request<any>('/settings/me', {
      method: 'PATCH',
      body: JSON.stringify({ values: payload }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async createJob(payload: any) {
    return request<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateJob(id: string, payload: any) {
    return request<any>(`/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async updateJobStatus(id: string, status: string) {
    return request<any>(`/jobs/${id}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
    });
  },

  async deleteJob(id: string) {
    return request<any>(`/jobs/${id}`, { method: 'DELETE' });
  },

  async getRecruiterCandidates(jobId: string, options: any) {
    const params = new URLSearchParams(options).toString();
    const payload = await request<any>(`/recruiter/jobs/${jobId}/candidates?${params}`);
    if (Array.isArray(payload)) {
      return { candidates: payload.map(mapRecruiterCandidate) };
    }
    return {
      ...payload,
      candidates: (payload.candidates ?? []).map(mapRecruiterCandidate),
    };
  },

  async inviteCandidate(jobId: string, candidateId: string) {
    return request<any>(`/recruiter/jobs/${jobId}/candidates/${candidateId}/invite`, { method: 'POST' });
  },

  async updateApplicationStatus(applicationId: string, status: string) {
    return request<any>(`/recruiter/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async submitMatchFeedback(matchingId: string, type: MatchFeedback) {
    const params = new URLSearchParams({ type, channel: 'WEB' });
    return request<void>(`/matches/${encodeURIComponent(matchingId)}/feedback?${params}`, {
      method: 'POST',
    });
  },
};

export type CandidateProfileDto = any;
export type CreateJobPayload = any;
export type ManualCvPayload = any;
export type PortfolioLinkDto = any;
export type PortfolioLinkPayload = any;
export type PortfolioProjectDto = any;
export type PortfolioProjectPayload = any;
