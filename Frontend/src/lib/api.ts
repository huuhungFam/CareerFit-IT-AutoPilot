import { jobs as mockJobs } from '../data/mock';
import type { Job, MatchLabel, MockAccount, Role } from '../types';

const importMeta = import.meta as unknown as { env?: Record<string, string | undefined> };
const API_BASE_URL = (importMeta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const TOKEN_KEY = 'careerfit.accessToken';
const ACCOUNT_KEY = 'careerfit.account';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

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

type SuggestionsDto = {
  titles?: string[] | null;
  companies?: string[] | null;
  skills?: string[] | null;
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

export type SearchSuggestionGroup = Array<{ group: string; items: string[] }>;

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function saveSession(account: MockAccount, token?: string) {
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
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
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
  }

  return payload.data;
}

function normalizeRole(role: string): Role {
  return role.toLowerCase() === 'recruiter' ? 'recruiter' : 'candidate';
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
  return 'High';
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

function publicJobFallback(index = 0) {
  return mockJobs[index % mockJobs.length] ?? mockJobs[0];
}

export function mapPublicJob(dto: JobCardDto | JobDetailDto, index = 0): Job {
  const fallback = publicJobFallback(index);
  const detail = dto as JobDetailDto;
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', ') || fallback.location,
    seniority: dto.seniorityLevel ?? dto.employmentType ?? fallback.seniority,
    language: dto.language ?? fallback.language,
    salary: formatSalary(dto.salary),
    requiredSkills: dto.requiredSkills?.length ? dto.requiredSkills : fallback.requiredSkills,
    optionalSkills: detail.niceToHaveSkills?.length ? detail.niceToHaveSkills : fallback.optionalSkills,
    description: detail.originalText ?? fallback.description,
    normalizedScore: fallback.normalizedScore,
    label: fallback.label,
    isPotential: false,
    reasons: [],
    status: mapStatus(dto.status),
    postedAt: formatPostedAt(dto.createdAt),
  };
}

export function mapCandidateJob(dto: CandidateJobCardDto, index = 0): Job {
  const fallback = publicJobFallback(index);
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', ') || fallback.location,
    seniority: dto.seniorityLevel ?? dto.employmentType ?? fallback.seniority,
    language: fallback.language,
    salary: formatSalary(null, dto.salaryDisplay),
    requiredSkills: dto.requiredSkills?.length ? dto.requiredSkills : fallback.requiredSkills,
    optionalSkills: dto.optionalSkills?.length ? dto.optionalSkills : fallback.optionalSkills,
    description: dto.potentialReason ?? fallback.description,
    normalizedScore: Number(dto.normalizedScore ?? fallback.normalizedScore),
    label: normalizeLabel(dto.label),
    isPotential: Boolean(dto.isPotential),
    reasons: dto.reasons?.length ? dto.reasons : fallback.reasons,
    status: 'new',
    postedAt: formatPostedAt(dto.matchedAt),
  };
}

export function mapRecruiterJob(dto: RecruiterJobDto, index = 0): Job {
  const fallback = publicJobFallback(index);
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: dto.location ?? fallback.location,
    seniority: dto.seniorityLevel ?? fallback.seniority,
    language: fallback.language,
    salary: fallback.salary,
    requiredSkills: fallback.requiredSkills,
    optionalSkills: fallback.optionalSkills,
    description: fallback.description,
    normalizedScore: fallback.normalizedScore,
    label: fallback.label,
    isPotential: fallback.isPotential,
    reasons: fallback.reasons,
    status: mapStatus(dto.status),
    postedAt: formatPostedAt(dto.createdAt),
  };
}

export const careerfitApi = {
  restoreAccount() {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MockAccount;
    } catch {
      return null;
    }
  },

  clearSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ACCOUNT_KEY);
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

  async getCandidateJobs() {
    const payload = await request<CandidateJobListDto>('/matches/me/cards?page=0&size=20');
    return payload.jobs.map(mapCandidateJob);
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
};
