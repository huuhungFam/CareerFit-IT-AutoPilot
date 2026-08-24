import { request } from './api';

export type AdminReportTargetType = 'JOB' | 'CV';

export interface AdminReportCase {
  targetType: AdminReportTargetType;
  targetId: string;
  title: string;
  owner: string;
  contentStatus: string;
  pendingCount: number;
  reasons: string[];
  firstReportedAt: string;
  latestReportedAt: string;
}

export interface AdminReportItem {
  id: string;
  reason: string;
  comment?: string | null;
  status: string;
  reporterEmail?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AdminReportContentDetail {
  targetType: AdminReportTargetType;
  targetId: string;
  title: string;
  owner: string;
  contentStatus: string;
  company?: string | null;
  location?: string | null;
  description?: string | null;
  skills: string[];
  contactEmail?: string | null;
}

export interface AdminReportQueue {
  content: AdminReportCase[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
  pendingJobs: number;
  pendingCvs: number;
}

export interface AdminReportDetail {
  reportCase: AdminReportCase;
  reports: AdminReportItem[];
  content: AdminReportContentDetail;
}

// Admin API Interfaces
export interface AdminDashboardResponse {
  totalCandidates: number;
  totalRecruiters: number;
  activeJobs: number;
  applications: number;
  highMatches: number;
  potentialMatches: number;
  emailActionsSentToday: number;
  failedEmailActions: number;
  pendingAutomationActions: number;
  systemErrorsLast24h: number;
  generatedAt: string;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AdminJobSummary {
  id: string;
  title: string;
  company: string;
  status: string;
  recruiterEmail: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorType: string;
  actorId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  result: string;
  channel: string;
  metadata: string;
  createdAt: string;
}

export interface AuditLogPageResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface EmailActionSummary {
  id: string;
  tokenPrefix: string;
  recipientEmail: string;
  actionType: string;
  status: string;
  expiresAt: string;
  redeemedAt: string;
  createdAt: string;
}

export interface EmailTokenSummary {
  id: string;
  tokenPrefix: string;
  recipientEmail: string;
  purpose: string;
  valid: boolean;
  used: boolean;
  expired: boolean;
  expiresAt: string;
  usedAt: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

function buildQuery(params: Record<string, any>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : '';
}

// API methods
export const adminApi = {
  // Dashboard
  getDashboard: () => request<AdminDashboardResponse>('/admin/dashboard'),

  // Users
  searchUsers: (params: { role?: string; status?: string; keyword?: string; page?: number; size?: number }) =>
    request<PageResponse<AdminUserSummary>>(`/admin/users${buildQuery(params)}`),
  suspendUser: (userId: string) => request<void>(`/admin/users/${userId}/suspend`, { method: 'POST' }),
  activateUser: (userId: string) => request<void>(`/admin/users/${userId}/activate`, { method: 'POST' }),

  // Jobs
  getJobs: (params: { status?: string; page?: number; size?: number }) =>
    request<PageResponse<AdminJobSummary>>(`/admin/jobs${buildQuery(params)}`),
  hideJob: (jobId: string) => request<void>(`/admin/jobs/${jobId}/hide`, { method: 'POST' }),
  restoreJob: (jobId: string) => request<void>(`/admin/jobs/${jobId}/restore`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params: { actorTypeStr?: string; actionType?: string; targetType?: string; channelStr?: string; resultStr?: string; page?: number; size?: number }) =>
    request<AuditLogPageResponse>(`/admin/audit-logs${buildQuery(params)}`),

  // Email Monitor
  getEmailActions: (params: { page?: number; size?: number }) =>
    request<PageResponse<EmailActionSummary>>(`/admin/email-actions${buildQuery(params)}`),
  retryEmailAction: (actionId: string) =>
    request<void>(`/admin/email-actions/${actionId}/retry`, { method: 'POST' }),
  getEmailTokens: (params: { page?: number; size?: number }) =>
    request<PageResponse<EmailTokenSummary>>(`/admin/email-tokens${buildQuery(params)}`),
  revokeEmailToken: (tokenId: string) =>
    request<void>(`/admin/email-tokens/${tokenId}/revoke`, { method: 'POST' }),

  // Content reports
  getReports: (params: { targetType: AdminReportTargetType; page?: number; size?: number }) =>
    request<AdminReportQueue>(`/admin/reports${buildQuery(params)}`),
  getReportDetail: (targetType: AdminReportTargetType, targetId: string) =>
    request<AdminReportDetail>(`/admin/reports/${targetType}/${targetId}`),
  banReportedContent: (targetType: AdminReportTargetType, targetId: string, note?: string) =>
    request<void>(`/admin/reports/${targetType}/${targetId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ note: note?.trim() || null }),
    }),
  dismissReports: (targetType: AdminReportTargetType, targetId: string, note?: string) =>
    request<void>(`/admin/reports/${targetType}/${targetId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ note: note?.trim() || null }),
    }),
    
  // System
  rebuildMatching: (cvId: string) => request<any>(`/admin/matching/rebuild?cvId=${cvId}`, { method: 'POST' })
};
