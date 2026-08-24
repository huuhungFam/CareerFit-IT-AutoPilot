import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminDashboardResponse, type AdminUserSummary, type AdminJobSummary, type EmailActionSummary, type EmailTokenSummary, type PageResponse, type AuditLogPageResponse } from '../lib/adminApi';
import { useLanguage } from '../i18n/LanguageProvider';
import { ToastMessage } from '../components/ToastMessage';

export function AdminDashboardPage({ marketDashboard }: { marketDashboard?: ReactNode }) {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDashboard()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch(() => {
        setError(t('adminDataLoadFailed'));
      });
  }, [t]);

  return (
    <div className="page-stack">
      {marketDashboard}
      <h2>{t('adminDashboard')}</h2>
      {error ? <InlineAdminError message={error} /> : !data ? <p>{t('loadingDashboard')}</p> : (
        <div className="stats-grid feature-stats">
          <div className="stat-card"><h3>{t('usersLabel')}</h3><p>{data.totalCandidates} {t('candidatesLabel')} | {data.totalRecruiters} {t('recruitersLabel')}</p></div>
          <div className="stat-card"><h3>{t('jobs')}</h3><p>{data.activeJobs} {t('active')} | {data.applications} {t('applications')}</p></div>
          <div className="stat-card"><h3>{t('matchingLabel')}</h3><p>{data.highMatches} {t('matchHigh')} | {data.potentialMatches} {t('potential')}</p></div>
          <div className="stat-card"><h3>{t('emailsLabel')}</h3><p>{data.emailActionsSentToday} {t('actionsSent')} | {data.pendingAutomationActions} {t('pending')}</p></div>
        </div>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<PageResponse<AdminUserSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(() => adminApi.searchUsers({})
    .then((res) => {
      setData(res);
      setError(null);
    })
    .catch(() => {
      setError(t('adminDataLoadFailed'));
    }), [t]);
  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleToggleStatus = async (user: AdminUserSummary) => {
    try {
      if (user.status === 'ACTIVE') await adminApi.suspendUser(user.id);
      else await adminApi.activateUser(user.id);
      await fetchUsers();
      setActionMessage({ tone: 'success', text: t('userStatusUpdated') });
    } catch {
      setError(t('backendOfflineLocalUpdate'));
      setActionMessage({ tone: 'error', text: t('backendOfflineLocalUpdate') });
    }
  };
  const roleGroups = ['ADMIN', 'RECRUITER', 'CANDIDATE'].map((role) => ({
    role,
    users: (data?.content ?? []).filter((user) => user.role === role),
  }));

  return (
    <div className="page-stack">
      <h2>{t('userManagement')}</h2>
      {actionMessage ? <ToastMessage {...actionMessage} /> : null}
      {error ? <InlineAdminError message={error} /> : null}
      <div className="panel job-market-panel">
        {roleGroups.map(({ role, users }) => (
          <section className="admin-user-role-group" key={role}>
            <div className="admin-user-role-heading"><h3>{formatAdminEnum(role, language)}</h3><span>{users.length}</span></div>
            {users.length ? <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
              <thead><tr><th>{t('email')}</th><th>{t('role')}</th><th>{t('status')}</th><th>{t('actionsLabel')}</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td><td>{formatAdminEnum(u.role, language)}</td><td>{formatAdminEnum(u.status, language)}</td>
                    <td>
                      <button className={u.status === 'ACTIVE' ? 'destructive' : 'primary-action'} onClick={() => handleToggleStatus(u)}>
                        {u.status === 'ACTIVE' ? t('suspend') : t('activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table> : <p>{language === 'vi' ? `Chưa có tài khoản ${formatAdminEnum(role, language).toLowerCase()}.` : `No ${formatAdminEnum(role, language).toLowerCase()} accounts.`}</p>}
          </section>
        ))}
      </div>
    </div>
  );
}

export function AdminJobsPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<PageResponse<AdminJobSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const fetchJobs = useCallback(() => adminApi.getJobs({})
    .then((res) => {
      setData(res);
      setError(null);
    })
    .catch(() => {
      setError(t('adminDataLoadFailed'));
    }), [t]);
  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  const handleToggleJob = async (job: AdminJobSummary) => {
    try {
      if (job.status === 'ACTIVE') await adminApi.hideJob(job.id);
      else await adminApi.restoreJob(job.id);
      await fetchJobs();
      setActionMessage({ tone: 'success', text: t('jobVisibilityUpdated') });
    } catch {
      setError(t('backendOfflineLocalUpdate'));
      setActionMessage({ tone: 'error', text: t('backendOfflineLocalUpdate') });
    }
  };

  return (
    <div className="page-stack">
      <h2>{t('jobModeration')}</h2>
      {actionMessage ? <ToastMessage {...actionMessage} /> : null}
      {error ? <InlineAdminError message={error} /> : null}
      <div className="panel job-market-panel">
        <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr><th>{t('titleLabel')}</th><th>{t('company')}</th><th>{t('status')}</th><th>{t('actionsLabel')}</th></tr></thead>
          <tbody>
            {data?.content.map(j => (
              <tr key={j.id}>
                <td>{j.title}</td><td>{j.company}</td><td>{formatAdminEnum(j.status, language)}</td>
                <td>
                  <button className={j.status === 'ACTIVE' ? 'destructive' : 'primary-action'} onClick={() => handleToggleJob(j)}>
                    {j.status === 'ACTIVE' ? t('hide') : t('restore')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<AuditLogPageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getAuditLogs({})
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch(() => {
        setError(t('adminDataLoadFailed'));
      });
  }, [t]);

  return (
    <div className="page-stack">
      <h2>{t('auditLogs')}</h2>
      {error ? <InlineAdminError message={error} /> : null}
      <div className="panel job-market-panel">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead><tr><th>{t('timeLabel')}</th><th>{t('actorLabel')}</th><th>{t('actionLabel')}</th><th>{t('targetLabel')}</th><th>{t('resultLabel')}</th></tr></thead>
          <tbody>
            {data?.logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</td>
                <td>{formatAdminEnum(log.actorType, language)}</td>
                <td>{formatAdminEnum(log.actionType, language)}</td>
                <td>{formatAdminEnum(log.targetType, language)}</td>
                <td>{formatAdminEnum(log.result, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminEmailMonitorPage() {
  const { language, t } = useLanguage();
  const [actions, setActions] = useState<PageResponse<EmailActionSummary> | null>(null);
  const [tokens, setTokens] = useState<PageResponse<EmailTokenSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const fetchActions = useCallback(() => adminApi.getEmailActions({})
    .then((res) => {
      setActions(res);
      setError(null);
    })
    .catch(() => {
      setError(t('adminDataLoadFailed'));
    }), [t]);
  const fetchTokens = useCallback(() => adminApi.getEmailTokens({})
    .then((res) => {
      setTokens(res);
      setError(null);
    })
    .catch(() => {
      setError(t('adminDataLoadFailed'));
    }), [t]);
  useEffect(() => { void Promise.all([fetchActions(), fetchTokens()]); }, [fetchActions, fetchTokens]);

  const markPending = async (action: EmailActionSummary) => {
    try {
      await adminApi.retryEmailAction(action.id);
      await fetchActions();
      setActionMessage({ tone: 'success', text: t('emailActionUpdated') });
    } catch {
      setError(t('backendOfflineLocalUpdate'));
      setActionMessage({ tone: 'error', text: t('backendOfflineLocalUpdate') });
    }
  };

  return (
    <div className="page-stack">
      <h2>{t('emailMonitor')}</h2>
      {actionMessage ? <ToastMessage {...actionMessage} /> : null}
      {error ? <InlineAdminError message={error} /> : null}
      <div className="panel job-market-panel">
        <h3>{t('emailActions')}</h3>
        <table className="data-table" style={{ width: '100%', textAlign: 'left', marginBottom: '2rem' }}>
          <thead><tr><th>{t('email')}</th><th>{t('actionLabel')}</th><th>{t('status')}</th><th>{t('actionsLabel')}</th></tr></thead>
          <tbody>
            {actions?.content.map(a => (
              <tr key={a.id}>
                <td>{a.recipientEmail}</td><td>{formatAdminEnum(a.actionType, language)}</td><td>{formatAdminEnum(a.status, language)}</td>
                <td>
                  <button className="primary-action" onClick={() => markPending(a)}>
                    {t('markPending')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>{t('emailTokens')}</h3>
        <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr><th>{t('email')}</th><th>{t('purposeLabel')}</th><th>{t('validLabel')}</th></tr></thead>
          <tbody>
            {tokens?.content.map(t => (
              <tr key={t.id}><td>{t.recipientEmail}</td><td>{formatAdminEnum(t.purpose, language)}</td><td>{t.valid ? (language === 'vi' ? 'Có' : 'Yes') : (language === 'vi' ? 'Không' : 'No')}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineAdminError({ message }: { message: string }) {
  const { t } = useLanguage();
  return (
    <div className="admin-notice" role="alert">
      <strong>{t('adminDataLoadFailed')}</strong>
      <p>{message}</p>
    </div>
  );
}

function formatAdminEnum(value: string | null | undefined, language: 'vi' | 'en') {
  if (!value) return language === 'vi' ? 'Không có' : 'None';
  if (language === 'en') return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const labels: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    CANDIDATE: 'Ứng viên',
    RECRUITER: 'Nhà tuyển dụng',
    SYSTEM: 'Hệ thống',
    ACTIVE: 'Đang hoạt động',
    SUSPENDED: 'Tạm khóa',
    DRAFT: 'Bản nháp',
    HIDDEN_BY_ADMIN: 'Đã ẩn bởi quản trị viên',
    SUCCESS: 'Thành công',
    FAILED: 'Thất bại',
    PENDING: 'Đang chờ',
    REDEEMED: 'Đã sử dụng',
    LOGIN: 'Đăng nhập',
    AUTO_APPLY_SCAN: 'Quét tự động ứng tuyển',
    USER: 'Người dùng',
    JOB: 'Việc làm',
    APPLICATION: 'Đơn ứng tuyển',
    EMAIL_ACTION: 'Hành động qua email',
    JOB_MARKET_SNAPSHOT: 'Ảnh chụp thị trường việc làm',
    WEB: 'Trang web',
    SCHEDULER: 'Bộ lập lịch',
    GOOD_MATCH: 'Phù hợp',
    POTENTIAL: 'Tiềm năng',
    BAD_MATCH: 'Không phù hợp',
    NOT_INTERESTED: 'Không quan tâm',
    VIEW_JOB: 'Xem việc làm',
    UNSUBSCRIBE_DIGEST: 'Hủy nhận bản tổng hợp',
    EXPIRED: 'Đã hết hạn',
    PASSWORDLESS_LOGIN: 'Đăng nhập không mật khẩu',
    APPLY_JOB: 'Ứng tuyển việc làm',
    REJECT_MATCH: 'Từ chối kết quả phù hợp',
    CHANGE_THRESHOLD: 'Thay đổi ngưỡng',
    USER_ACTIVATED: 'Kích hoạt người dùng',
    USER_SUSPENDED: 'Tạm khóa người dùng',
    MARK_EMAIL_ACTION_PENDING: 'Đánh dấu hành động email chờ xử lý',
    APPLICATION_STATUS_UPDATED: 'Cập nhật trạng thái ứng tuyển',
    APPLICATION_WITHDRAWN: 'Rút đơn ứng tuyển',
    APPLICATION_SUBMITTED: 'Gửi đơn ứng tuyển',
    JOB_RESTORED: 'Khôi phục việc làm',
    JOB_HIDDEN: 'Ẩn việc làm',
    JOB_PAUSED: 'Tạm dừng việc làm',
    JOB_VIEW: 'Xem việc làm',
    REGISTER: 'Đăng ký',
    AUTH_LOGIN: 'Đăng nhập',
    MARKET_SNAPSHOT_FAILED: 'Tạo ảnh chụp thị trường thất bại',
    AUTO_APPLY_CREATED: 'Tự động tạo đơn ứng tuyển',
    FAILURE: 'Thất bại',
    DENIED: 'Bị từ chối',
  };
  const normalizedValue = value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  return labels[normalizedValue] ?? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
