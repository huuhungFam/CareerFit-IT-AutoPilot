import { type FormEvent, type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Ban,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ArrowLeft,
  Clock3,
  Edit3,
  FileText,
  Flag,
  Globe,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MailCheck,
  MapPin,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UploadCloud,
  UserRound,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { AppShell } from './components/AppShell';
import { AutomationPolicyPanel } from './components/AutomationPolicyPanel';
import { MatchingBadge, PotentialBadge, ReasonChips } from './components/Badges';
import { JobCard } from './components/JobCard';
import { StatCard } from './components/StatCard';
import { ToastMessage as ActionMessage } from './components/ToastMessage';
import { useLanguage } from './i18n/LanguageProvider';
import { AdminDashboardPage, AdminUsersPage, AdminJobsPage, AdminAuditLogsPage, AdminEmailMonitorPage } from './pages/AdminPages';
import {
  careerfitApi,
  type AdvancedMarketOverview,
  type AdvancedTrendPoint,
  type CandidateAnalyticsOverview,
  type CandidateCvDto,
  type CandidateJobPage,
  type CandidateProfileDto,
  type CreateJobPayload,
  type EmployerDetailDto,
  type ManualCvPayload,
  type PortfolioLinkDto,
  type PortfolioLinkPayload,
  type PortfolioProjectDto,
  type PortfolioProjectPayload,
  type RecruiterAnalyticsOverview,
} from './lib/api';
import {
  automationPolicy,
  candidate,
  preference,
} from './data/mock';
import type { AutomationPolicy, Job, MatchFeedback, MockAccount, RecruiterCandidateItem, Role } from './types';

const jobFilterOptions = {
  city: [
    ['all', 'All Cities'],
    ['hcm', 'Ho Chi Minh'],
    ['hanoi', 'Ha Noi'],
    ['remote', 'Remote Vietnam'],
  ],
  level: [
    ['all', 'All levels'],
    ['senior', 'Senior'],
    ['mid-senior', 'Mid-Senior'],
    ['lead', 'Lead'],
  ],
  workModel: [
    ['all', 'All models'],
    ['hybrid', 'Hybrid'],
    ['remote', 'Remote'],
    ['onsite', 'Onsite'],
  ],
  salary: [
    ['all', 'All salaries'],
    ['2500', '$2,500+'],
    ['3000', '$3,000+'],
    ['4000', '$4,000+'],
    ['negotiable', 'Negotiable'],
  ],
  domain: [
    ['all', 'All domains'],
    ['frontend', 'Frontend'],
    ['backend', 'Backend'],
    ['fullstack', 'Fullstack'],
    ['data-ai', 'Data/AI'],
    ['devops', 'DevOps'],
    ['qa', 'QA/Testing'],
  ],
} as const;

type JobFilterKey = keyof typeof jobFilterOptions;
type JobFilters = Record<JobFilterKey, string>;
type UploadTab = 'parser' | 'manual';
type ProfileTab = 'cv' | 'profile' | 'portfolio';
type RecruiterSubview = 'ranking' | 'applicants' | 'potential';
type RecruiterMatchFilter = 'all' | 'HIGH' | 'POTENTIAL' | 'HIGH_OR_POTENTIAL' | 'APPLIED' | 'NOT_APPLIED';

const defaultJobFilters: JobFilters = {
  city: 'all',
  level: 'all',
  workModel: 'all',
  salary: 'all',
  domain: 'all',
};

const profileTabParamToState: Record<string, ProfileTab> = {
  cvs: 'cv',
  fixed: 'profile',
  portfolio: 'portfolio',
};

const profileTabStateToParam: Record<ProfileTab, string> = {
  cv: 'cvs',
  profile: 'fixed',
  portfolio: 'portfolio',
};

function isOptionValue(key: JobFilterKey, value: string | null) {
  return Boolean(value && jobFilterOptions[key].some(([optionValue]) => optionValue === value));
}

function localizeFilterOption(key: JobFilterKey, value: string, fallback: string, language: 'vi' | 'en') {
  if (language === 'en') return fallback;
  const labels: Partial<Record<JobFilterKey, Record<string, string>>> = {
    city: { hcm: 'TP. Hồ Chí Minh', hanoi: 'Hà Nội', remote: 'Từ xa tại Việt Nam' },
    level: { all: 'Tất cả cấp bậc', senior: 'Cao cấp', 'mid-senior': 'Trung - cao cấp', lead: 'Trưởng nhóm' },
    workModel: { all: 'Tất cả hình thức', hybrid: 'Kết hợp', remote: 'Từ xa', onsite: 'Tại văn phòng' },
    salary: { all: 'Tất cả mức lương', negotiable: 'Thỏa thuận' },
    domain: { all: 'Tất cả nhóm việc làm' },
  };
  return labels[key]?.[value] ?? fallback;
}

function getJobFilters(searchParams: URLSearchParams): JobFilters {
  return {
    city: isOptionValue('city', searchParams.get('city')) ? searchParams.get('city')! : defaultJobFilters.city,
    level: isOptionValue('level', searchParams.get('level')) ? searchParams.get('level')! : defaultJobFilters.level,
    workModel: isOptionValue('workModel', searchParams.get('workModel')) ? searchParams.get('workModel')! : defaultJobFilters.workModel,
    salary: isOptionValue('salary', searchParams.get('salary')) ? searchParams.get('salary')! : defaultJobFilters.salary,
    domain: isOptionValue('domain', searchParams.get('domain')) ? searchParams.get('domain')! : defaultJobFilters.domain,
  };
}

function getOptionLabel(key: JobFilterKey, value: string) {
  return jobFilterOptions[key].find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function writeJobSearchParams(keyword: string, filters: JobFilters) {
  const params = new URLSearchParams();
  if (keyword.trim()) params.set('keyword', keyword.trim());
  (Object.keys(filters) as JobFilterKey[]).forEach((key) => {
    if (filters[key] !== defaultJobFilters[key]) {
      params.set(key, filters[key]);
    }
  });
  return params;
}

function setOrDeleteParam(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

function getRangeDays(searchParams: URLSearchParams) {
  const parsed = Number(searchParams.get('rangeDays'));
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

function getRecruiterSubview(pathname: string): RecruiterSubview {
  if (pathname.endsWith('/applicants')) return 'applicants';
  if (pathname.endsWith('/potential')) return 'potential';
  return 'ranking';
}

function getRecruiterJobsQuery(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const sort = searchParams.get('sort');
  const match = searchParams.get('match');
  return {
    q: searchParams.get('q') ?? '',
    status: status === 'active' || status === 'draft' ? status : 'all',
    sort: sort === 'score_desc' || sort === 'newest' || sort === 'applicants_desc' ? sort : 'score_desc',
    match: isRecruiterMatchFilter(match) ? match : 'all',
  };
}

function isRecruiterMatchFilter(value: string | null): value is RecruiterMatchFilter {
  return value === 'HIGH' || value === 'POTENTIAL' || value === 'HIGH_OR_POTENTIAL' || value === 'APPLIED' || value === 'NOT_APPLIED';
}

function matchesRecruiterCandidateFilter(candidate: RecruiterCandidateItem, filter: RecruiterMatchFilter) {
  if (filter === 'all') return true;
  if (filter === 'HIGH') return candidate.label === 'HIGH' || candidate.score >= 85;
  if (filter === 'POTENTIAL') return candidate.isPotential || candidate.label === 'POTENTIAL';
  if (filter === 'HIGH_OR_POTENTIAL') return candidate.label === 'HIGH' || candidate.score >= 85 || candidate.isPotential || candidate.label === 'POTENTIAL';
  if (filter === 'APPLIED') return candidate.hasApplied || !['NONE', 'INVITED'].includes(candidate.applicationStatus);
  if (filter === 'NOT_APPLIED') return candidate.applicationStatus === 'NONE' || candidate.applicationStatus === 'INVITED';
  return true;
}

function sortRecruiterCandidates(a: RecruiterCandidateItem, b: RecruiterCandidateItem, source: RecruiterCandidateItem[]) {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;
  const labelPriority: Record<RecruiterCandidateItem['label'], number> = {
    HIGH: 4,
    POTENTIAL: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  const labelDiff = labelPriority[b.label] - labelPriority[a.label];
  if (labelDiff !== 0) return labelDiff;
  return source.indexOf(a) - source.indexOf(b) || a.name.localeCompare(b.name);
}

function recruiterDiscoveryOptions(query: ReturnType<typeof getRecruiterJobsQuery>) {
  return {
    label: query.match === 'HIGH' ? 'HIGH' as const : undefined,
    isPotential: query.match === 'POTENTIAL' ? true : undefined,
    applicationStatus: query.match === 'NOT_APPLIED' ? 'NONE' : undefined,
    sort: query.sort === 'newest' ? 'updated_desc' as const : 'score_desc' as const,
    page: 0,
    size: 50,
  };
}

export function App() {
  const [account, setAccount] = useState<MockAccount | null>(() => careerfitApi.restoreAccount());
  const location = useLocation();

  useEffect(() => {
    let active = true;
    void careerfitApi.restoreSession().then((restoredAccount) => {
      if (active) setAccount(restoredAccount);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(username: string, password: string) {
    const normalizedUsername = username.trim();
    try {
      const apiAccount = await careerfitApi.login(normalizedUsername, password);
      setAccount(apiAccount);
      return apiAccount;
    } catch {
      return null;
    }
  }

  async function handleRegister(email: string, password: string, fullName: string, role: 'CANDIDATE' | 'RECRUITER') {
    try {
      const apiAccount = await careerfitApi.register(email, password, fullName, role);
      setAccount(apiAccount);
      return apiAccount;
    } catch {
      return null;
    }
  }

  function handleLogout() {
    careerfitApi.clearSession();
    setAccount(null);
  }

  function protectedRoute(role: Role, element: ReactNode) {
    if (!account) {
      return <LoginRequiredPage nextPath={`${location.pathname}${location.search}`} />;
    }

    if (account.role !== role) {
      return <Navigate to={getRoleHomePath(account.role)} replace />;
    }

    return element;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} onRegister={handleRegister} />} />
      <Route path="/register" element={<LoginPage mode="register" onLogin={handleLogin} onRegister={handleRegister} />} />
      <Route path="/auth/magic-link/verify" element={<MagicLinkPage onAuthenticated={setAccount} />} />
      <Route path="/automation/confirm" element={<AutomationConfirmPage />} />
      <Route path="/automation/result" element={<AutomationResultPage />} />
      <Route element={<AppShell role={account?.role ?? 'guest'} />}>
        <Route index element={<CandidateHomePage isPublic />} />
        <Route path="/jobs" element={<CandidateJobsPage isPublic />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage isPublic />} />
        <Route path="/candidate" element={protectedRoute('candidate', <CandidateHomePage />)} />
        <Route path="/candidate/jobs" element={protectedRoute('candidate', <CandidateJobsPage />)} />
        <Route path="/candidate/jobs/:jobId" element={protectedRoute('candidate', <JobDetailPage />)} />
        <Route path="/candidate/employers/:employerId" element={<EmployerDetailPage isPublic={!account} />} />
        <Route path="/candidate/upload" element={protectedRoute('candidate', <UploadPage />)} />
        <Route path="/candidate/profile" element={protectedRoute('candidate', <ProfilePage />)} />
        <Route path="/candidate/recommendations" element={protectedRoute('candidate', <RecommendationsPage />)} />
        <Route path="/candidate/advanced-analytics" element={protectedRoute('candidate', <AdvancedAnalyticsPage role="candidate" />)} />
        <Route path="/candidate/applications" element={protectedRoute('candidate', <ApplicationsPage />)} />
        <Route path="/candidate/automation" element={protectedRoute('candidate', <AutomationPage />)} />
        <Route
          path="/candidate/settings"
          element={protectedRoute('candidate', <ConnectedSettingsPage role="candidate" onLogout={handleLogout} onDeleteAccount={handleLogout} />)}
        />
        <Route path="/recruiter" element={protectedRoute('recruiter', <RecruiterHomePage />)} />
        <Route path="/recruiter/jobs" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/ranking" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/applicants" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/potential" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/analytics" element={protectedRoute('recruiter', <AnalyticsPage />)} />
        <Route path="/recruiter/advanced-analytics" element={protectedRoute('recruiter', <AdvancedAnalyticsPage role="recruiter" />)} />
        <Route path="/recruiter/automation" element={protectedRoute('recruiter', <AutomationPage />)} />
        <Route
          path="/recruiter/settings"
          element={protectedRoute('recruiter', <ConnectedSettingsPage role="recruiter" onLogout={handleLogout} onDeleteAccount={handleLogout} />)}
        />
        {/* Admin Routes */}
        <Route path="/admin" element={protectedRoute('admin', <AdminDashboardPage />)} />
        <Route path="/admin/users" element={protectedRoute('admin', <AdminUsersPage />)} />
        <Route path="/admin/jobs" element={protectedRoute('admin', <AdminJobsPage />)} />
        <Route path="/admin/audit-logs" element={protectedRoute('admin', <AdminAuditLogsPage />)} />
        <Route path="/admin/email-monitor" element={protectedRoute('admin', <AdminEmailMonitorPage />)} />
      </Route>
    </Routes>
  );
}

function LoginPage({
  mode = 'login',
  onLogin,
  onRegister,
}: {
  mode?: 'login' | 'register';
  onLogin: (username: string, password: string) => Promise<MockAccount | null>;
  onRegister: (email: string, password: string, fullName: string, role: 'CANDIDATE' | 'RECRUITER') => Promise<MockAccount | null>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [error, setError] = useState('');
  const [authMessage, setAuthMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = searchParams.get('next');

  async function submitLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const account = mode === 'register'
        ? await onRegister(username, password, fullName, registerRole)
        : await onLogin(username, password);
      if (!account) {
        setError(mode === 'register'
          ? (language === 'vi' ? 'Không thể đăng ký. Hãy kiểm tra email, mật khẩu và tài khoản đã tồn tại.' : 'Could not register. Check the email, password, and whether the account already exists.')
          : t('invalidLogin'));
        return;
      }

      navigate(resolvePostLoginPath(account, nextPath));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestMagicLink() {
    setError('');
    setAuthMessage(null);
    if (!username.includes('@')) {
      setError(language === 'vi' ? 'Hãy nhập một địa chỉ email hợp lệ để nhận liên kết đăng nhập.' : 'Enter a valid email address to receive a sign-in link.');
      return;
    }
    setIsSubmitting(true);
    try {
      await careerfitApi.requestPasswordless(username);
      setAuthMessage({
        tone: 'success',
        text: language === 'vi' ? 'Yêu cầu đã được gửi. Hãy kiểm tra email để tiếp tục đăng nhập.' : 'Request sent. Check your email to continue signing in.',
      });
    } catch (requestError) {
      setAuthMessage({
        tone: 'error',
        text: readableError(requestError, language === 'vi' ? 'Không thể gửi liên kết đăng nhập.' : 'Could not send the sign-in link.', language),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <button
        className="auth-language-switch"
        onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
        type="button"
        aria-label={t('language')}
      >
        <Globe size={17} />
        {language.toUpperCase()}
      </button>
      <section className="auth-hero">
        <p className="eyebrow">{t('brand')}</p>
        <h1>{mode === 'login' ? t('login') : t('register')}</h1>
        <p>{t('candidateHomeCopy')}</p>
      </section>
      <form className="auth-card" onSubmit={submitLogin}>
        {mode === 'register' ? (
          <label>
            {t('fullName')}
            <input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
        ) : null}
        <label>
          {mode === 'register' ? t('emailAddress') : t('username')}
          <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={mode === 'register' ? 'name@example.com' : 'ca / re / ad'} type={mode === 'register' ? 'email' : 'text'} required />
        </label>
        <label>
          {t('password')}
          <input
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={mode === 'register' ? 8 : undefined}
            placeholder={mode === 'register' ? '••••••••' : '1'}
            type="password"
          />
        </label>
        {mode === 'register' ? (
          <label>
            {t('role')}
            <select value={registerRole} onChange={(event) => setRegisterRole(event.target.value as 'CANDIDATE' | 'RECRUITER')}>
              <option value="CANDIDATE">{t('candidate')}</option>
              <option value="RECRUITER">{t('recruiter')}</option>
            </select>
          </label>
        ) : null}
        {error ? <p className="validation-error">{error}</p> : null}
        {authMessage ? <ActionMessage {...authMessage} /> : null}
        <button className="primary-action full" disabled={isSubmitting} type="submit">
          {mode === 'register' ? t('register') : t('signIn')}
        </button>
        {mode === 'login' ? <small>{t('testLoginHint')}</small> : null}
        {mode === 'login' ? (
          <button className="full" type="button" disabled={isSubmitting} onClick={requestMagicLink}>
            <MailCheck size={16} />
            {t('passwordless')}
          </button>
        ) : null}
        <button className="auth-mode-link" type="button" onClick={() => navigate(mode === 'login' ? '/register' : '/login')}>
          {mode === 'login'
            ? (language === 'vi' ? 'Chưa có tài khoản? Đăng ký' : 'New to CareerFit? Register')
            : (language === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in')}
        </button>
      </form>
    </main>
  );
}

function resolvePostLoginPath(account: MockAccount, nextPath: string | null) {
  if (nextPath?.startsWith('/candidate') && account.role === 'candidate') return nextPath;
  if (nextPath?.startsWith('/recruiter') && account.role === 'recruiter') return nextPath;
  if (nextPath?.startsWith('/admin') && account.role === 'admin') return nextPath;

  return getRoleHomePath(account.role);
}

function MagicLinkPage({ onAuthenticated }: { onAuthenticated: (account: MockAccount) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const token = searchParams.get('token')?.trim() ?? '';
  const inspection = useQuery({
    queryKey: ['magic-link-inspection', token],
    queryFn: () => careerfitApi.inspectPasswordlessToken(token),
    enabled: Boolean(token),
    retry: false,
  });

  async function completeLogin() {
    if (!token) return;
    setIsVerifying(true);
    setVerifyError('');
    try {
      const account = await careerfitApi.verifyPasswordlessToken(token);
      onAuthenticated(account);
      navigate(getRoleHomePath(account.role), { replace: true });
    } catch (error) {
      setVerifyError(readableError(
        error,
        language === 'vi' ? 'Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.' : 'This sign-in link is invalid or has expired.',
        language,
      ));
    } finally {
      setIsVerifying(false);
    }
  }

  const invalidToken = !token || inspection.isError;
  return (
    <main className="auth-page magic-link-page">
      <button className="auth-language-switch" onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')} type="button" aria-label={t('language')}>
        <Globe size={17} />
        {language.toUpperCase()}
      </button>
      <section className="auth-hero">
        <p className="eyebrow">CareerFit</p>
        <h1>{language === 'vi' ? 'Xác nhận đăng nhập' : 'Confirm sign in'}</h1>
        <p>{language === 'vi' ? 'Kiểm tra liên kết bảo mật trước khi mở không gian làm việc của bạn.' : 'Verify this secure link before opening your workspace.'}</p>
      </section>
      <section className="auth-card magic-link-card">
        {inspection.isLoading ? (
          <div className="magic-link-state"><Clock3 size={24} /><strong>{language === 'vi' ? 'Đang kiểm tra liên kết...' : 'Checking your link...'}</strong></div>
        ) : invalidToken ? (
          <>
            <ActionMessage tone="error" text={language === 'vi' ? 'Liên kết không hợp lệ hoặc đã hết hạn.' : 'This link is invalid or has expired.'} />
            <button type="button" onClick={() => navigate('/login')}>{language === 'vi' ? 'Quay lại đăng nhập' : 'Back to sign in'}</button>
          </>
        ) : (
          <>
            <div className="magic-link-state"><ShieldCheck size={26} /><strong>{language === 'vi' ? 'Liên kết hợp lệ' : 'Link verified'}</strong></div>
            <p>{inspection.data}</p>
            {verifyError ? <ActionMessage tone="error" text={verifyError} /> : null}
            <button className="primary-action full" type="button" disabled={isVerifying} onClick={completeLogin}>
              <LogIn size={17} />
              {isVerifying ? (language === 'vi' ? 'Đang đăng nhập...' : 'Signing in...') : (language === 'vi' ? 'Tiếp tục đăng nhập' : 'Continue signing in')}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function getRoleHomePath(role: Role) {
  if (role === 'admin') return '/admin';
  return role === 'candidate' ? '/candidate' : '/recruiter';
}

function LoginRequiredPage({ nextPath }: { nextPath?: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="login-required-panel">
      <div>
        <p className="eyebrow">{t('loginRequiredEyebrow')}</p>
        <h2>{t('loginRequiredTitle')}</h2>
        <p>{t('loginRequiredCopy')}</p>
      </div>
      <button className="primary-action" onClick={() => navigate(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login')}>
        <LogIn size={17} />
        {t('login')}
      </button>
    </section>
  );
}

function CandidateHomePage({ isPublic = false }: { isPublic?: boolean }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data = [], isLoading: isJobsLoading } = useJobs({ isPublic });
  const { data: applicationPage } = useQuery<any>({
    queryKey: ['my-applications'],
    enabled: !isPublic,
    queryFn: () => careerfitApi.getMyApplications(),
  });
  const { data: currentPolicy } = useQuery<any>({
    queryKey: ['automation-policy'],
    enabled: !isPublic,
    queryFn: () => careerfitApi.getAutomationPolicy(),
  });
  const suggestions = useSearchSuggestions(query);
  const newJobs = data.slice(0, 3);
  const applicationRows = applicationPage?.content || applicationPage?.applications || (Array.isArray(applicationPage) ? applicationPage : []);

  function runSearch() {
    const keyword = query.trim();
    const basePath = isPublic ? '/jobs' : '/candidate/jobs';
    navigate(keyword ? `${basePath}?keyword=${encodeURIComponent(keyword)}` : basePath);
  }

  function runFilteredSearch(nextFilters: JobFilters, nextKeyword: string) {
    const basePath = isPublic ? '/jobs' : '/candidate/jobs';
    const params = writeJobSearchParams(nextKeyword, nextFilters);
    navigate({ pathname: basePath, search: params.toString() ? `?${params.toString()}` : '' });
  }

  async function applyToJob(job: Job) {
    if (isPublic) {
      setIsLoginPromptOpen(true);
      return;
    }
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language),
      });
    }
  }

  return (
    <div className="page-stack">
      <SearchHero
        eyebrow={candidate.headline}
        title={t('candidateHomeTitle')}
        copy={t('candidateHomeCopy')}
        placeholder={t('searchPlaceholder')}
        actionLabel={t('search')}
        value={query}
        onChange={setQuery}
        onFilter={() => setIsFilterOpen(true)}
        onSearch={runSearch}
        suggestions={suggestions}
        variant={isPublic ? 'guest' : 'signed'}
      />

      <JobMarketDashboard />

      {!isPublic ? (
        <section className="stats-grid feature-stats">
          <StatCard label={t('recommendations')} value={data.length} detail={`${data.filter((job) => job.normalizedScore >= 90).length} ${t('jobsAboveNinety')}`} />
          <StatCard label={t('autoApply')} value={currentPolicy?.autoApplyEnabled ? t('enabled') : t('disabled')} detail={`${t('score')} >= ${currentPolicy?.minScore ?? 85}%`} />
          <StatCard label={t('applications')} value={applicationRows.length} detail={t('inviteThisWeek')} />
        </section>
      ) : null}

      <section className="panel job-market-panel">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">{t('jobs')}</p>
            <h2>{t('newJobs')}</h2>
          </div>
          <button onClick={() => navigate(isPublic ? '/jobs' : '/candidate/jobs')}>
            {t('viewAll')}
          </button>
        </div>
        <TopEmployers />
        {actionMessage ? <ActionMessage {...actionMessage} /> : null}
        <JobListWithPreview
          jobs={newJobs}
          isLoading={isJobsLoading}
          onOpen={(job) => navigate(isPublic ? `/jobs/${job.id}` : `/candidate/jobs/${job.id}`)}
          onApply={applyToJob}
          showMatchMeta={!isPublic}
        />
      </section>

      {isFilterOpen ? (
        <FilterModal
          filters={defaultJobFilters}
          keyword={query}
          onApply={runFilteredSearch}
          onReset={() => {
            setQuery('');
            setIsFilterOpen(false);
          }}
          onClose={() => setIsFilterOpen(false)}
        />
      ) : null}
      {isLoginPromptOpen ? <LoginPromptModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function CandidateJobsPage({ isPublic = false }: { isPublic?: boolean }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const initialKeyword = searchParams.get('keyword') ?? '';
  const filters = useMemo(() => getJobFilters(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const [query, setQuery] = useState(initialKeyword);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [candidatePages, setCandidatePages] = useState<CandidateJobPage[]>([]);
  const [isLoadingMoreJobs, setIsLoadingMoreJobs] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const {
    data: publicJobs = [],
    isLoading: isPublicJobsLoading,
    isFetching: isPublicJobsFetching,
    isError: publicJobsFailed,
    refetch: refetchPublicJobs,
  } = useJobs({
    isPublic,
    keyword: initialKeyword,
    enabled: isPublic,
  });
  const {
    data: firstCandidatePage,
    isLoading: isCandidateJobsLoading,
    isFetching: isCandidateJobsFetching,
    isError: candidateJobsFailed,
    refetch: refetchCandidateJobs,
  } = useQuery({
    queryKey: ['candidate-jobs-page', 0],
    enabled: !isPublic,
    queryFn: () => careerfitApi.getCandidateJobsPage({ page: 0, size: 20 }),
    refetchInterval: 60_000,
    retry: 1,
  });
  const sourceJobs = isPublic ? publicJobs : candidatePages.flatMap((page) => page.jobs);
  const lastCandidatePage = candidatePages[candidatePages.length - 1];
  const canLoadMoreCandidateJobs = !isPublic && Boolean(lastCandidatePage) && lastCandidatePage!.page + 1 < lastCandidatePage!.totalPages;
  const loadedCandidateJobCount = candidatePages.reduce((sum, page) => sum + page.jobs.length, 0);
  const totalCandidateJobCount = lastCandidatePage?.total ?? firstCandidatePage?.total ?? loadedCandidateJobCount;
  const isJobsLoading = isPublic ? isPublicJobsLoading : isCandidateJobsLoading;
  const isJobsFetching = isPublic ? isPublicJobsFetching : isCandidateJobsFetching;
  const jobsFailed = isPublic ? publicJobsFailed : candidateJobsFailed;
  const keywordFilteredJobs = useFilteredJobs(
    sourceJobs.filter((job) => !hiddenJobIds.includes(job.id)),
    query,
  );
  const filteredJobs = useMemo(() => sortJobsStable(applyJobFilters(keywordFilteredJobs, filters)), [keywordFilteredJobs, filters]);
  const scoreCounts = useMemo(() => getScoreCounts(filteredJobs), [filteredJobs]);
  const activeFilterCount = (Object.keys(filters) as JobFilterKey[]).filter((key) => filters[key] !== defaultJobFilters[key]).length;
  const hasActiveSearchOrFilters = Boolean(query.trim()) || activeFilterCount > 0;
  const lowMatchOnly = !isPublic && filteredJobs.length > 0 && filteredJobs.every(isLowMatchJob);
  const suggestions = useSearchSuggestions(query);

  useEffect(() => {
    setQuery(initialKeyword);
  }, [initialKeyword]);

  useEffect(() => {
    setHiddenJobIds([]);
  }, [searchParamsKey]);

  useEffect(() => {
    if (!isPublic && firstCandidatePage) {
      setCandidatePages((current) => {
        if (current.length === 0) return [firstCandidatePage];
        return [firstCandidatePage, ...current.filter((page) => page.page !== firstCandidatePage.page)];
      });
      setLoadMoreError(null);
    }
  }, [firstCandidatePage, isPublic]);

  function runSearch() {
    const keyword = query.trim();
    setIsSearchFocused(false);
    setSearchParams(writeJobSearchParams(keyword, filters));
  }

  function applyFilters(nextFilters: JobFilters, nextKeyword = query) {
    setQuery(nextKeyword);
    setSearchParams(writeJobSearchParams(nextKeyword, nextFilters));
    setIsFilterOpen(false);
  }

  function resetFilters() {
    setSearchParams(writeJobSearchParams(query, defaultJobFilters));
    setIsFilterOpen(false);
  }

  function updateSingleFilter(key: JobFilterKey, value: string) {
    setSearchParams(writeJobSearchParams(query, { ...filters, [key]: value }));
  }

  async function applyToJob(job: Job) {
    if (isPublic) {
      setIsLoginPromptOpen(true);
      return;
    }
    setActionMessage(null);
    setApplyingJobId(job.id);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language),
      });
      setApplyingJobId(null);
    }
  }

  async function skipJob(id: string, options?: { feedbackSaved?: boolean }) {
    const job = filteredJobs.find((item) => item.id === id);
    setActionMessage(null);
    try {
      if (!options?.feedbackSaved && job?.matchingId) {
        await careerfitApi.submitMatchFeedback(job.matchingId, 'NOT_INTERESTED');
      }
      setHiddenJobIds((current) => current.includes(id) ? current : [...current, id]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã ghi nhận phản hồi và ẩn công việc này.' : 'Feedback saved and job hidden.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ghi nhận phản hồi.' : 'Could not save feedback.', language),
      });
    }
  }

  async function loadMoreCandidateJobs() {
    if (!lastCandidatePage || !canLoadMoreCandidateJobs || isLoadingMoreJobs) return;
    setIsLoadingMoreJobs(true);
    setLoadMoreError(null);
    try {
      const nextPage = await careerfitApi.getCandidateJobsPage({
        page: lastCandidatePage.page + 1,
        size: 20,
      });
      setCandidatePages((current) => {
        if (current.some((page) => page.page === nextPage.page)) return current;
        return [...current, nextPage];
      });
    } catch (error) {
      setLoadMoreError(readableError(error, language === 'vi' ? 'Không thể tải thêm việc làm.' : 'Could not load more jobs.', language));
    } finally {
      setIsLoadingMoreJobs(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="result-search-hero">
        <label className="location-select">
          <MapPin size={17} />
          <select value={filters.city} onChange={(event) => updateSingleFilter('city', event.target.value)}>
            {jobFilterOptions.city.map(([value, label]) => (
              <option value={value} key={value}>{value === 'all' ? t('allCities') : localizeFilterOption('city', value, label, language)}</option>
            ))}
          </select>
        </label>
        <div className="result-search-input">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch();
            }}
            placeholder={t('searchPlaceholder')}
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setSearchParams(writeJobSearchParams('', filters));
              }}
            >
              ×
            </button>
          ) : null}
          {isSearchFocused ? <SearchSuggestions suggestions={suggestions} onPick={setQuery} /> : null}
        </div>
        <button className="primary-action" onClick={runSearch}>
          <Search size={17} />
          {t('search')}
        </button>
      </section>

      <section className="search-results-page">
        <div className="result-heading">
          <h2>
            {isPublic ? filteredJobs.length : totalCandidateJobCount} <span>{query || 'IT'}</span> {t('jobsInVietnam')}
          </h2>
          {!isPublic && totalCandidateJobCount > 0 ? (
            <p className="result-subtitle">
              {language === 'vi'
                ? `Đang hiển thị ${Math.min(loadedCandidateJobCount, totalCandidateJobCount)} / ${totalCandidateJobCount} việc làm phù hợp`
                : `Showing ${Math.min(loadedCandidateJobCount, totalCandidateJobCount)} / ${totalCandidateJobCount} matched jobs`}
            </p>
          ) : null}
        </div>
        <div className="top-filter-bar">
          <button className={filters.level !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('level')}: {localizeFilterOption('level', filters.level, getOptionLabel('level', filters.level), language)}
          </button>
          <button className={filters.workModel !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('workingModel')}: {localizeFilterOption('workModel', filters.workModel, getOptionLabel('workModel', filters.workModel), language)}
          </button>
          <button className={filters.salary !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('salary')}: {localizeFilterOption('salary', filters.salary, getOptionLabel('salary', filters.salary), language)}
          </button>
          <button className={filters.domain !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('jobDomain')}: {localizeFilterOption('domain', filters.domain, getOptionLabel('domain', filters.domain), language)}
          </button>
          <button className="filter-button" onClick={() => setIsFilterOpen(true)}>
            <SlidersHorizontal size={16} />
            {t('filter')}{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
        {applyingJobId ? <p className="validation-message">{t('submittingApplication')}</p> : null}
        {actionMessage ? <ActionMessage {...actionMessage} /> : null}
        {!jobsFailed && lowMatchOnly ? (
          <MatchingEdgeCaseNotice
            type="low"
            jobs={filteredJobs}
            onPrimary={() => navigate('/candidate/upload?tab=manual')}
            onSecondary={() => navigate('/candidate/profile?tab=fixed')}
            onTertiary={() => setSearchParams(writeJobSearchParams(query, defaultJobFilters))}
          />
        ) : null}
        {jobsFailed ? (
          <section className="empty-state" role="alert">
            <h3>{language === 'vi' ? 'Không thể tải danh sách việc làm' : 'Could not load jobs'}</h3>
            <p>{language === 'vi' ? 'Kiểm tra kết nối backend rồi thử lại.' : 'Check the backend connection and try again.'}</p>
            <button type="button" onClick={() => void (isPublic ? refetchPublicJobs() : refetchCandidateJobs())}>
              {language === 'vi' ? 'Thử lại' : 'Retry'}
            </button>
          </section>
        ) : <JobListWithPreview
          jobs={filteredJobs}
          isLoading={isJobsLoading || isJobsFetching}
          onOpen={(job) => navigate(isPublic ? `/jobs/${job.id}` : `/candidate/jobs/${job.id}`)}
          onSkip={skipJob}
          onApply={applyToJob}
          showMatchMeta={!isPublic}
          scoreCounts={scoreCounts}
          emptyTitle={t('noMatchingJobs')}
          emptyCopy={hasActiveSearchOrFilters ? t('noMatchingJobsActionCopy') : t('noMatchingJobsCopy')}
          emptyActions={
            <div className="empty-actions">
              <button onClick={resetFilters}>{t('resetFilters')}</button>
              <button onClick={() => {
                setQuery('');
                setSearchParams(writeJobSearchParams('', defaultJobFilters));
              }}>
                {t('clearSearch')}
              </button>
              {!isPublic ? (
                <>
                  <button onClick={() => navigate('/candidate/profile?tab=fixed')}>{t('updateProfile')}</button>
                  <button onClick={() => navigate('/candidate/upload')}>{t('uploadAnotherCv')}</button>
                </>
              ) : null}
            </div>
          }
        />}
        {!jobsFailed && !isPublic && sourceJobs.length > 0 ? (
          <div className="load-more-row">
            {loadMoreError ? <p className="validation-error">{loadMoreError}</p> : null}
            {canLoadMoreCandidateJobs ? (
              <button className="primary-action" type="button" disabled={isLoadingMoreJobs} onClick={loadMoreCandidateJobs}>
                {isLoadingMoreJobs
                  ? (language === 'vi' ? 'Đang tải...' : 'Loading...')
                  : (language === 'vi' ? 'Xem thêm 20 việc làm' : 'Load 20 more jobs')}
              </button>
            ) : (
              <p className="validation-message">
                {language === 'vi' ? 'Đã hiển thị toàn bộ việc làm phù hợp.' : 'All matched jobs are shown.'}
              </p>
            )}
          </div>
        ) : null}
      </section>

      {isFilterOpen ? (
        <FilterModal
          filters={filters}
          keyword={query}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      ) : null}
      {isLoginPromptOpen ? <LoginPromptModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function JobDetailPanelUnused({ job }: { job?: Job }) {
  const { t } = useLanguage();
  if (!job) {
    return (
      <aside className="detail-panel">
        <h2>{t('noJobSelected')}</h2>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <p className="eyebrow">{job.company}</p>
      <h2>{job.title}</h2>
      <p>{job.description}</p>
      <MatchingBadge score={job.normalizedScore} label={job.label} />
      {job.isPotential ? <PotentialBadge /> : null}
      <h3>{t('reason')}</h3>
      <ReasonChips reasons={job.reasons} />
      <h3>{t('requiredSkills')}</h3>
      <ReasonChips reasons={job.requiredSkills} />
      <div className="actions vertical">
        <button className="primary-action">{t('apply')}</button>
        <button>{t('save')}</button>
        <button>{t('similar')}</button>
      </div>
    </aside>
  );
}

function FeedbackBar({
  matchingId,
  initialFeedback,
  onNotInterested,
}: {
  matchingId?: string;
  initialFeedback?: MatchFeedback;
  onNotInterested?: () => void;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<MatchFeedback | undefined>(initialFeedback);
  const [submitting, setSubmitting] = useState<MatchFeedback | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected(initialFeedback);
  }, [initialFeedback]);

  if (!matchingId) {
    return null;
  }
  const feedbackMatchingId = matchingId;

  const options: Array<{ type: MatchFeedback; label: string; icon: ReactNode }> = [
    { type: 'GOOD_MATCH', label: t('greatMatch'), icon: <ThumbsUp size={15} /> },
    { type: 'POTENTIAL', label: t('potentialMatch'), icon: <Sparkles size={15} /> },
    { type: 'BAD_MATCH', label: t('badMatch'), icon: <ThumbsDown size={15} /> },
    { type: 'NOT_INTERESTED', label: t('skipMatch'), icon: <Ban size={15} /> },
  ];

  async function submitFeedback(type: MatchFeedback, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const previous = selected;
    setSelected(type);
    setSubmitting(type);
    setError('');

    try {
      await careerfitApi.submitMatchFeedback(feedbackMatchingId, type);
      if (type === 'NOT_INTERESTED') {
        onNotInterested?.();
      }
    } catch {
      setSelected(previous);
      setError(t('feedbackFailed'));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="feedback-bar" onClick={(event) => event.stopPropagation()}>
      <span className="feedback-label">
        <Sparkles size={14} />
        {selected ? t('feedbackSaved') : t('learningSignal')}
      </span>
      <div className="feedback-actions">
        {options.map((option) => (
          <button
            className={selected === option.type ? 'selected' : ''}
            aria-pressed={selected === option.type}
            disabled={Boolean(submitting)}
            key={option.type}
            onClick={(event) => submitFeedback(option.type, event)}
            type="button"
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      {error ? <small className="feedback-error">{error}</small> : null}
    </div>
  );
}

function ValidationSuggestion({
  severity,
  code,
  message,
}: {
  severity: 'error' | 'warning' | 'quality';
  code: string;
  message: string;
}) {
  return (
    <p className={`field-validation-hint ${severity}`}>
      <span>{code}</span>
      {message}
    </p>
  );
}

function JobDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [showSimilarJobs, setShowSimilarJobs] = useState(false);
  const { data: job, isLoading, isError } = useJobDetail(jobId, isPublic);
  const {
    data: similarJobs = [],
    isLoading: areSimilarJobsLoading,
    isError: similarJobsFailed,
    refetch: refetchSimilarJobs,
  } = useQuery({
    queryKey: ['similar-jobs', jobId],
    enabled: Boolean(jobId) && showSimilarJobs,
    queryFn: () => careerfitApi.getSimilarJobs(jobId!),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    function handleScroll() {
      setShowStickyBar(window.scrollY > 360);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [job?.id]);

  if (isLoading) return <section className="panel empty-state"><p>{t('loading')}</p></section>;
  if (isError || !job) return <section className="panel empty-state"><p>{language === 'vi' ? 'Không thể tải công việc này.' : 'Could not load this job.'}</p></section>;
  const currentJob = job;

  async function applyToCurrentJob() {
    if (isPublic) {
      setIsLoginPromptOpen(true);
      return;
    }
    setApplyError('');
    setIsApplying(true);
    try {
      await careerfitApi.submitApplication(currentJob.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setApplyError(readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language));
      setIsApplying(false);
    }
  }

  return (
    <div className="jd-detail-route">
      <button className="back-button" onClick={() => navigate(isPublic ? '/' : '/candidate')}>
        <ArrowLeft size={17} />
        {t('backToJobs')}
      </button>
      {isApplying ? <p className="validation-message">{t('submittingApplication')}</p> : null}
      {applyError ? <ActionMessage tone="error" text={applyError} /> : null}
      <JobDetailContent job={job} showMatchMeta={!isPublic} onApply={applyToCurrentJob} />
      {showSimilarJobs ? (
        <section className="panel similar-jobs-panel" id="similar-jobs">
          <div className="section-heading">
            <p className="eyebrow">{t('jobs')}</p>
            <h2>{t('similarJobs')}</h2>
          </div>
          {similarJobsFailed ? (
            <div className="empty-state" role="alert">
              <p>{language === 'vi' ? 'Không thể tải việc làm tương tự.' : 'Could not load similar jobs.'}</p>
              <button type="button" onClick={() => void refetchSimilarJobs()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
            </div>
          ) : (
            <JobListWithPreview
              jobs={similarJobs}
              isLoading={areSimilarJobsLoading}
              onOpen={(similarJob) => navigate(`${isPublic ? '/jobs' : '/candidate/jobs'}/${similarJob.id}`)}
              showMatchMeta={false}
            />
          )}
        </section>
      ) : null}
      {showStickyBar ? <StickyApplyBar onApply={applyToCurrentJob} onSimilar={() => setShowSimilarJobs(true)} /> : null}
      {isLoginPromptOpen ? <LoginPromptModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function EmployerDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const {
    data: employer,
    isLoading: isEmployerLoading,
    isError: employerFailed,
    refetch: refetchEmployer,
  } = useQuery({
    queryKey: ['employer', employerId],
    enabled: Boolean(employerId),
    queryFn: () => careerfitApi.getEmployer(employerId!),
  });
  const {
    data: employerJobs = [],
    isLoading: areJobsLoading,
    isError: jobsFailed,
    refetch: refetchEmployerJobs,
  } = useQuery({
    queryKey: ['employer-jobs', employerId],
    enabled: Boolean(employerId),
    queryFn: () => careerfitApi.getEmployerJobs(employerId!),
  });

  if (isEmployerLoading) {
    return <section className="panel empty-state"><p>{language === 'vi' ? 'Đang tải hồ sơ công ty...' : 'Loading company profile...'}</p></section>;
  }

  if (employerFailed || !employer) {
    return (
      <section className="panel empty-state" role="alert">
        <h2>{language === 'vi' ? 'Không thể tải hồ sơ công ty' : 'Could not load company profile'}</h2>
        <button type="button" onClick={() => void refetchEmployer()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
      </section>
    );
  }

  return (
    <div className="employer-detail-route">
      <button className="back-button" onClick={() => navigate(isPublic ? '/' : '/candidate')}>
        {t('backToEmployers')}
      </button>

      <section className="employer-hero">
        <div className="employer-cover" style={employer.coverUrl ? { backgroundImage: `url(${employer.coverUrl})` } : undefined} />
        <div className="employer-profile-card">
          <div className="employer-logo-large">
            {employer.logoUrl ? <img src={employer.logoUrl} alt="" /> : employerInitials(employer)}
          </div>
          <div>
            <p className="eyebrow">{t('featuredEmployers')}</p>
            <h1>{employer.companyName}</h1>
            <p>{employer.industry || (language === 'vi' ? 'Công nghệ thông tin' : 'Information technology')}</p>
          </div>
          <button className="primary-action" disabled title={language === 'vi' ? 'Backend chưa hỗ trợ theo dõi công ty.' : 'Following companies is not supported by the backend yet.'}>{t('followCompany')}</button>
        </div>
      </section>

      <section className="employer-info-grid">
        <article className="employer-main-panel">
          <h2>{t('companyIntro')}</h2>
          <p>{employer.summary || employer.description || (language === 'vi' ? 'Nhà tuyển dụng chưa cập nhật phần giới thiệu.' : 'The employer has not added an introduction yet.')}</p>
          {employer.description && employer.description !== employer.summary ? <p>{employer.description}</p> : null}

          <h2>{t('featuredBenefits')}</h2>
          <div className="benefit-grid">
            {(employer.benefits ?? []).map((benefit) => (
              <span key={benefit}>{benefit}</span>
            ))}
            {!employer.benefits?.length ? <p>{language === 'vi' ? 'Chưa có thông tin phúc lợi.' : 'No benefit information yet.'}</p> : null}
          </div>

          <h2>{t('openJobs')}</h2>
          <div className="employer-job-list">
            {areJobsLoading ? <p>{language === 'vi' ? 'Đang tải công việc...' : 'Loading jobs...'}</p> : null}
            {jobsFailed ? (
              <div role="alert">
                <p>{language === 'vi' ? 'Không thể tải việc làm của công ty.' : 'Could not load this company’s jobs.'}</p>
                <button type="button" onClick={() => void refetchEmployerJobs()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
              </div>
            ) : null}
            {!areJobsLoading && !jobsFailed && employerJobs.length === 0 ? <p>{language === 'vi' ? 'Hiện chưa có công việc đang mở.' : 'No open jobs are available.'}</p> : null}
            {employerJobs.slice(0, 3).map((job) => (
              <article className="employer-job-card" key={job.id} onClick={() => navigate(`${isPublic ? '/jobs' : '/candidate/jobs'}/${job.id}`)}>
                <div>
                  <p className="eyebrow">{job.company}</p>
                  <h3>{job.title}</h3>
                  <p>{localizeUiMetadata(job.location, language)} · {job.salary}</p>
                </div>
                {!isPublic ? <MatchingBadge score={job.normalizedScore} label={job.label} /> : null}
              </article>
            ))}
          </div>
        </article>

        <aside className="employer-side-panel">
          <h3>{t('companyInfo')}</h3>
          <div className="company-fact">
            <Building2 size={18} />
            <span>{employer.industry || 'IT'}</span>
          </div>
          <div className="company-fact">
            <MapPin size={18} />
            <span>{employer.location || (language === 'vi' ? 'Chưa cập nhật' : 'Not provided')}</span>
          </div>
          <div className="company-fact">
            <Users size={18} />
            <span>{employer.companySize || (language === 'vi' ? 'Chưa cập nhật' : 'Not provided')}</span>
          </div>
          <div className="company-fact">
            <Globe size={18} />
            {employer.websiteUrl ? <a href={employer.websiteUrl} target="_blank" rel="noreferrer">{employer.websiteUrl}</a> : <span>{language === 'vi' ? 'Chưa cập nhật' : 'Not provided'}</span>}
          </div>
          <button className="primary-action full" onClick={() => navigate(`${isPublic ? '/jobs' : '/candidate/jobs'}?keyword=${encodeURIComponent(employer.companyName)}`)}>{t('viewAll')}</button>
        </aside>
      </section>
    </div>
  );
}

function UploadPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<'idle' | 'uploading' | 'processing' | 'scored' | 'failed'>('idle');
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isSavingManualCv, setIsSavingManualCv] = useState(false);
  const [pendingCvId, setPendingCvId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingControllerRef = useRef<AbortController | null>(null);
  const { data: manualProfile } = useQuery<any>({ queryKey: ['candidate-profile'], queryFn: careerfitApi.getCandidateProfile });
  const { data: matchedJobs = [] } = useJobs({ isPublic: false });
  const activeUploadTab: UploadTab = searchParams.get('tab') === 'manual' ? 'manual' : 'parser';
  const skillChips = ['React', 'TypeScript', 'Design System', 'Testing', 'Accessibility'];

  useEffect(() => () => pollingControllerRef.current?.abort(), []);

  function setActiveUploadTab(tab: UploadTab) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'tab', tab, 'parser');
    setSearchParams(params);
  }

  async function pollCvUntilReady(cvId: string, navigateWhenReady = false) {
    pollingControllerRef.current?.abort();
    const controller = new AbortController();
    pollingControllerRef.current = controller;
    setPendingCvId(cvId);
    setState('processing');
    setActionMessage({
      tone: 'success',
      text: language === 'vi'
        ? 'CV đã được tiếp nhận. Hệ thống đang trích xuất, chuẩn hóa và chấm điểm.'
        : 'CV accepted. Extraction, normalization, and scoring are in progress.',
    });
    try {
      await careerfitApi.waitForCvProcessing(cvId, { signal: controller.signal });
      setState('scored');
      setPendingCvId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      ]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'CV đã chấm điểm xong và sẵn sàng dùng để gợi ý việc làm.' : 'CV scoring is complete and ready for job recommendations.',
      });
      if (navigateWhenReady) navigate('/candidate/profile?tab=cvs');
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      setState('failed');
      const timedOut = error instanceof Error && error.message === 'CV_PROCESSING_TIMEOUT';
      setActionMessage({
        tone: 'error',
        text: timedOut
          ? (language === 'vi' ? 'Xử lý CV mất nhiều thời gian hơn dự kiến. Bạn có thể thử kiểm tra lại trạng thái.' : 'CV processing is taking longer than expected. You can retry the status check.')
          : readableError(error, language === 'vi' ? 'Không thể hoàn tất xử lý CV. Hãy thử kiểm tra lại trạng thái.' : 'CV processing could not be completed. Retry the status check.', language),
      });
      return false;
    } finally {
      if (pollingControllerRef.current === controller) pollingControllerRef.current = null;
    }
  }

  async function uploadSelectedCv(file?: File) {
    if (!file) return;
    setState('uploading');
    setActionMessage(null);
    try {
      const result = await careerfitApi.uploadCv(file);
      if (result.status === 'FAILED') {
        setState('failed');
        setActionMessage({
          tone: 'error',
          text: language === 'vi' ? 'CV đã tải lên nhưng không thể trích xuất nội dung. Hãy thử tệp PDF/DOCX rõ ràng hơn.' : 'The CV was uploaded but its content could not be extracted. Try a clearer PDF or DOCX file.',
        });
        return;
      }
      await pollCvUntilReady(result.id);
    } catch (error) {
      setState('idle');
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể tải CV lên.' : 'Could not upload CV.', language),
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function saveManualCv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingManualCv(true);
    setActionMessage(null);
    const form = new FormData(event.currentTarget);
    const skills = String(form.get('skills') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const payload: ManualCvPayload = {
      displayName: String(form.get('displayName') ?? '').trim(),
      fullName: String(form.get('fullName') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      location: String(form.get('location') ?? '').trim(),
      desiredTitle: String(form.get('desiredTitle') ?? '').trim(),
      seniorityLevel: String(form.get('seniorityLevel') ?? '').trim(),
      yearsOfExperience: Number(form.get('yearsOfExperience') ?? 0),
      skills,
      workExperience: String(form.get('workExperience') ?? '').trim(),
      summary: String(form.get('summary') ?? '').trim(),
      language,
    };
    try {
      const result = await careerfitApi.createManualCv(payload);
      if (result.status === 'FAILED') throw new Error(result.message || 'CV processing failed.');
      await pollCvUntilReady(result.id, true);
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể tạo CV.' : 'Could not create CV.', language),
      });
    } finally {
      setIsSavingManualCv(false);
    }
  }

  return (
    <div className="page-stack manual-cv-route">
      <section className="manual-cv-hero">
        <div>
          <p className="eyebrow">{t('upload')}</p>
          <h2>{activeUploadTab === 'manual' ? t('buildProfile') : t('intelligenceApplied')}</h2>
          <p>
            {activeUploadTab === 'manual'
              ? `${t('uploadCopy')} ${t('manualCreation')} giúp bạn nhập hồ sơ có cấu trúc để AutoFit scoring rõ ràng hơn.`
              : t('uploadCopy')}
          </p>
        </div>
      </section>

      <section className="upload-builder manual-builder">
        <div className="upload-tabs">
          <button
            className={activeUploadTab === 'parser' ? 'active' : ''}
            type="button"
            onClick={() => setActiveUploadTab('parser')}
          >
            {t('documentParser')}
          </button>
          <button
            className={activeUploadTab === 'manual' ? 'active' : ''}
            type="button"
            onClick={() => setActiveUploadTab('manual')}
          >
            {t('manualCreation')}
          </button>
        </div>

        {activeUploadTab === 'parser' ? (
          <div className="upload-builder-grid parser-tab-content">
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => uploadSelectedCv(event.target.files?.[0])}
            />
            <button className={`dropzone ${state}`} type="button" onClick={() => fileInputRef.current?.click()} disabled={state === 'uploading'}>
              <UploadCloud size={40} />
              <h2>{state === 'idle' ? t('dropCvHere') : state === 'processing' ? t('processingFile') : state === 'failed' ? t('uploadFailed') : t(state)}</h2>
              <p>{t('parserCopy')}</p>
              <strong>{t('browseFiles')}</strong>
            </button>
            <aside className="manual-entry-card parser-status-card">
              <p className="eyebrow">{t('documentParser')}</p>
              <h3>{t('parserStatusTitle')}</h3>
              <div className="parser-step-list">
                <span className={state !== 'idle' ? 'done' : ''}>{t('fileAccepted')}</span>
                <span className={state === 'processing' || state === 'scored' ? 'done' : ''}>{t('textExtraction')}</span>
                <span className={state === 'scored' ? 'done' : ''}>{t('rankingReady')}</span>
              </div>
              {state === 'failed' && pendingCvId ? (
                <button className="cv-retry-action" type="button" onClick={() => pollCvUntilReady(pendingCvId)}>
                  {language === 'vi' ? 'Kiểm tra lại trạng thái' : 'Retry status check'}
                </button>
              ) : null}
              <ReasonChips reasons={['PDF / Image / DOCX', 'OCR', 'CV-JD scoring']} />
            </aside>
          </div>
        ) : (
          <form className="manual-form-stack" id="manual-cv-form" key={manualProfile?.userId ?? 'loading'} onSubmit={saveManualCv}>
          <section className="manual-form-card">
            <div className="manual-card-title">
              <UserRound size={22} />
              <h3>{t('personalInfo')}</h3>
            </div>
            <div className="settings-grid">
              <label>
                {t('fullName')}
                <input name="fullName" defaultValue={manualProfile?.fullName ?? candidate.name} required />
              </label>
              <label>
                {t('currentJobTitle')}
                <input name="desiredTitle" defaultValue={manualProfile?.desiredTitle ?? ''} required />
              </label>
              <label>
                {t('emailAddress')}
                <input name="email" defaultValue={manualProfile?.email?.includes('@') ? manualProfile.email : ''} type="email" />
              </label>
              <label>
                {t('phoneNumber')}
                <input name="phone" defaultValue={manualProfile?.phone ?? ''} />
              </label>
              <label>
                {t('location')}
                <input name="location" defaultValue={manualProfile?.location ?? ''} />
              </label>
              <label>
                {t('seniority')}
                <select name="seniorityLevel" defaultValue={manualProfile?.desiredSeniority ?? 'MID'}>
                  <option value="INTERN">Intern</option><option value="FRESHER">Fresher</option><option value="JUNIOR">Junior</option><option value="MID">Mid</option><option value="SENIOR">Senior</option><option value="LEAD">Lead</option><option value="PRINCIPAL">Principal</option>
                </select>
              </label>
              <label>
                {language === 'vi' ? 'Số năm kinh nghiệm' : 'Years of experience'}
                <input name="yearsOfExperience" type="number" min="0" max="50" defaultValue={manualProfile?.yearsOfExperience ?? 0} required />
              </label>
              <label>
                {language === 'vi' ? 'Tên CV' : 'CV name'}
                <input name="displayName" defaultValue="CV Frontend - Form" required />
              </label>
            </div>
          </section>

          <section className="manual-form-card">
            <div className="manual-card-title">
              <FileText size={22} />
              <div>
                <h3>{t('professionalSummary')}</h3>
                <p>{t('summaryHelper')}</p>
              </div>
            </div>
            <label className="validation-field quality">
              <textarea
                name="summary"
                rows={5}
                defaultValue="Frontend engineer with 5+ years building production React applications, design systems, and candidate-facing search experiences. Strong at turning complex workflow data into calm, usable product surfaces."
              />
              <ValidationSuggestion
                severity="quality"
                code="CV_SUMMARY_TOO_SHORT"
                message={t('cvSummarySuggestion')}
              />
            </label>
          </section>

          <section className="manual-form-card">
            <div className="manual-card-title">
              <Sparkles size={22} />
              <div>
                <h3>{t('technicalSkills')}</h3>
                <p>{t('skillsHelper')}</p>
              </div>
            </div>
            <div className="manual-skill-cloud">
              {skillChips.map((skill) => (
                <span key={skill}>
                  {skill}
                </span>
              ))}
            </div>
            <label>
              {t('skills')}
              <input name="skills" defaultValue={manualProfile?.desiredSkills?.join(', ') ?? skillChips.join(', ')} required />
            </label>
            <ValidationSuggestion
              severity="warning"
              code="SKILL_SIGNAL_THIN"
              message={t('skillSignalSuggestion')}
            />
          </section>

          <section className="manual-experience-section">
            <div className="inline-heading">
              <div>
                <p className="eyebrow">{t('manualCreation')}</p>
                <h3>{t('experience')}</h3>
              </div>
            </div>

            <article className="experience-editor-card">
              <div className="experience-editor-head">
                <div className="settings-grid">
                  <label>
                    {t('role')}
                    <input defaultValue="Senior Frontend Engineer" />
                  </label>
                  <label>
                    {t('company')}
                    <input defaultValue="Northstar HealthTech" />
                  </label>
                </div>
              </div>
              <div className="experience-date-grid">
                <label>
                  {t('startDate')}
                  <input defaultValue="2021-04" type="month" />
                </label>
                <label>
                  {t('endDate')}
                  <input type="month" />
                </label>
              </div>
              <label>
                {t('description')}
                <textarea
                  name="workExperience"
                  rows={4}
                  defaultValue="Led the candidate web experience for a recruitment automation product. Built reusable UI patterns, search/filter flows, job detail pages, and analytics dashboards with React and TypeScript."
                />
                <ValidationSuggestion
                  severity="quality"
                  code="IMPACT_METRIC_MISSING"
                  message={t('impactMetricSuggestion')}
                />
              </label>
            </article>
          </section>
          </form>
        )}
      </section>

      {actionMessage ? <ActionMessage {...actionMessage} /> : null}

      {activeUploadTab === 'manual' ? (
        <div className="manual-sticky-actions">
          <button type="button" onClick={() => navigate('/candidate/profile')}>{t('cancel')}</button>
          <button className="primary-action" type="submit" form="manual-cv-form" disabled={isSavingManualCv}>
            <Save size={17} />
            {isSavingManualCv ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : t('saveStartMatching')}
          </button>
        </div>
      ) : null}

      {state === 'scored' ? (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{t('score')}</p>
            <h2>{t('rankingResults')}</h2>
          </div>
          <div className="job-list compact">
            {matchedJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} onOpen={(selectedJob) => navigate(`/candidate/jobs/${selectedJob.id}`)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProfilePage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileDraft, setProfileDraft] = useState({
    fullName: '', phone: '', location: '', desiredTitle: '', desiredSkills: '', desiredSeniority: '',
    desiredWorkModel: '', desiredSalaryMin: '', desiredSalaryMax: '', desiredSalaryCurrency: 'VND',
    yearsOfExperience: '', aboutMe: '',
  });
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [defaultingCvId, setDefaultingCvId] = useState<string | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [deleteTargetCv, setDeleteTargetCv] = useState<CandidateCvDto | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const { data: profile } = useQuery<any>({
    queryKey: ['candidate-profile'],
    queryFn: careerfitApi.getCandidateProfile,
  });
  const { data: managedCvs = [], isLoading: cvsLoading } = useQuery<CandidateCvDto[]>({
    queryKey: ['candidate-cvs'],
    queryFn: careerfitApi.getCandidateCvs,
  });
  const cvDetail = useQuery({
    queryKey: ['candidate-cv-detail', selectedCvId],
    queryFn: () => careerfitApi.getCv(selectedCvId!),
    enabled: Boolean(selectedCvId),
    retry: false,
  });
  const profileTab = profileTabParamToState[searchParams.get('tab') ?? ''] ?? 'cv';
  function setProfileTab(tab: ProfileTab) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'tab', profileTabStateToParam[tab], 'cvs');
    setSearchParams(params);
  }
  useEffect(() => {
    if (!profile) return;
    setProfileDraft({
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      location: profile.location ?? '',
      desiredTitle: profile.desiredTitle ?? '',
      desiredSkills: profile.desiredSkills?.join(', ') ?? '',
      desiredSeniority: profile.desiredSeniority ?? '',
      desiredWorkModel: profile.desiredWorkModel ?? '',
      desiredSalaryMin: profile.desiredSalaryMin?.toString() ?? '',
      desiredSalaryMax: profile.desiredSalaryMax?.toString() ?? '',
      desiredSalaryCurrency: profile.desiredSalaryCurrency ?? 'VND',
      yearsOfExperience: profile.yearsOfExperience?.toString() ?? '',
      aboutMe: profile.aboutMe ?? '',
    });
  }, [profile]);

  function updateProfileDraft(field: keyof typeof profileDraft, value: string) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setSavingProfile(true);
    setActionMessage(null);
    const numberOrNull = (value: string) => value.trim() ? Number(value) : null;
    try {
      await Promise.all([
        careerfitApi.updateCandidateAccount(profileDraft.fullName.trim()),
        careerfitApi.updateCandidateProfile({
          phone: profileDraft.phone.trim() || null,
          location: profileDraft.location.trim() || null,
          desiredTitle: profileDraft.desiredTitle.trim() || null,
          desiredSkills: profileDraft.desiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
          desiredSeniority: profileDraft.desiredSeniority || null,
          desiredWorkModel: profileDraft.desiredWorkModel || null,
          desiredSalaryMin: numberOrNull(profileDraft.desiredSalaryMin),
          desiredSalaryMax: numberOrNull(profileDraft.desiredSalaryMax),
          desiredSalaryCurrency: profileDraft.desiredSalaryCurrency.trim() || null,
          yearsOfExperience: numberOrNull(profileDraft.yearsOfExperience),
          aboutMe: profileDraft.aboutMe.trim() || null,
        } as Partial<CandidateProfileDto>),
      ]);
      await queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã cập nhật hồ sơ cố định.' : 'Fixed profile updated.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể lưu hồ sơ.' : 'Could not save profile.', language) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function setDefaultCv(cv: CandidateCvDto) {
    if (cv.isDefault) return;
    setDefaultingCvId(cv.id);
    setActionMessage(null);
    try {
      await careerfitApi.setDefaultCv(cv.id);
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? `Đã chọn ${cv.displayName} làm CV mặc định.` : `${cv.displayName} is now the default CV.` });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể đổi CV mặc định.' : 'Could not change default CV.', language) });
    } finally {
      setDefaultingCvId(null);
    }
  }

  async function deleteCv() {
    if (!deleteTargetCv) return;
    if (deleteTargetCv.isDefault) {
      setActionMessage({
        tone: 'error',
        text: language === 'vi' ? 'Không thể xóa CV mặc định. Hãy chọn một CV khác làm mặc định trước.' : 'The default CV cannot be deleted. Set another CV as default first.',
      });
      setDeleteTargetCv(null);
      return;
    }
    setDeletingCvId(deleteTargetCv.id);
    setActionMessage(null);
    try {
      await careerfitApi.deleteCv(deleteTargetCv.id);
      if (selectedCvId === deleteTargetCv.id) setSelectedCvId(null);
      setDeleteTargetCv(null);
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã xóa CV.' : 'CV deleted.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể xóa CV này.' : 'Could not delete this CV.', language) });
    } finally {
      setDeletingCvId(null);
    }
  }

  return (
    <div className="page-stack profile-cv-route">
      <section className="plain-heading profile-cv-heading">
        <p className="eyebrow">{profile?.fullName ?? candidate.name}</p>
        <h2>{t('profileTitle')}</h2>
        <p>{t('profileCvDescription')}</p>
      </section>

      <section className="profile-cv-shell">
        {actionMessage ? <ActionMessage {...actionMessage} /> : null}
        <div className="profile-cv-tabs">
          <button className={profileTab === 'cv' ? 'active' : ''} onClick={() => setProfileTab('cv')}>
            {t('createdCvs')}
          </button>
          <button className={profileTab === 'profile' ? 'active' : ''} onClick={() => setProfileTab('profile')}>
            {t('fixedProfile')}
          </button>
          <button className={profileTab === 'portfolio' ? 'active' : ''} onClick={() => setProfileTab('portfolio')}>
            {t('portfolioProjects')}
          </button>
        </div>

        {profileTab === 'cv' ? (
          <div className="cv-management-view">
            <div className="profile-cv-note">
              <FileText size={18} />
              <span>{t('multiCvNote')}</span>
            </div>
            <div className="cv-toolbar">
              <button className="primary-action" onClick={() => navigate('/candidate/upload')}>
                <UploadCloud size={17} />
                {t('uploadNewCv')}
              </button>
              <button onClick={() => navigate('/candidate/upload?tab=manual')}>
                <Plus size={17} />
                {t('createCvByForm')}
              </button>
            </div>
            <div className="cv-card-list">
              {cvsLoading ? <p>{language === 'vi' ? 'Đang tải danh sách CV...' : 'Loading CVs...'}</p> : null}
              {!cvsLoading && managedCvs.length === 0 ? <p>{language === 'vi' ? 'Bạn chưa có CV. Hãy tải PDF, ảnh, DOCX hoặc tạo CV bằng form.' : 'No CV yet. Upload PDF, image, DOCX, or create one by form.'}</p> : null}
              {managedCvs.map((cv) => (
                <article className="cv-management-card" key={cv.id}>
                  <div className="cv-file-icon">
                    <FileText size={22} />
                  </div>
                  <div className="cv-card-main">
                    <div>
                      <h3>{cv.displayName}</h3>
                      <p>{cv.source === 'MANUAL' ? t('manualCreation') : t('uploadedPdf')} · {cv.createdAt ? new Date(cv.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : ''}</p>
                    </div>
                    <ReasonChips reasons={cv.topSkills ?? []} />
                  </div>
                  <div className="cv-card-score">
                    <span>{cv.isDefault ? t('defaultMatchingCv') : cv.status}</span>
                  </div>
                  <div className="cv-card-actions">
                    <button type="button" onClick={() => setSelectedCvId(cv.id)}>
                      {language === 'vi' ? 'Chi tiết' : 'Details'}
                    </button>
                    <button onClick={() => setDefaultCv(cv)} disabled={cv.isDefault || defaultingCvId === cv.id}>
                      {defaultingCvId === cv.id ? '...' : t('setDefault')}
                    </button>
                    <button
                      className="danger-icon-action"
                      type="button"
                      disabled={cv.isDefault || deletingCvId === cv.id}
                      title={cv.isDefault ? (language === 'vi' ? 'Không thể xóa CV mặc định' : 'The default CV cannot be deleted') : (language === 'vi' ? 'Xóa CV' : 'Delete CV')}
                      aria-label={language === 'vi' ? `Xóa ${cv.displayName}` : `Delete ${cv.displayName}`}
                      onClick={() => setDeleteTargetCv(cv)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : profileTab === 'profile' ? (
          <div className="fixed-profile-view">
            <div className="profile-cv-note">
              <UserRound size={18} />
              <span>{t('portfolioNote')}</span>
            </div>
            <div className="settings-grid">
              <label>
                {t('fullName')}
                <input value={profileDraft.fullName} onChange={(event) => updateProfileDraft('fullName', event.target.value)} />
              </label>
              <label>
                Email
                <input value={profile?.email ?? ''} type="email" disabled />
              </label>
              <label>
                {t('desiredTitle')}
                <input value={profileDraft.desiredTitle} onChange={(event) => updateProfileDraft('desiredTitle', event.target.value)} />
              </label>
              <label>
                {t('skills')}
                <input value={profileDraft.desiredSkills} onChange={(event) => updateProfileDraft('desiredSkills', event.target.value)} />
                <ValidationSuggestion
                  severity="quality"
                  code="PROFILE_SKILL_SCOPE"
                  message={t('profileSkillScopeSuggestion')}
                />
              </label>
              <label>
                {t('location')}
                <input value={profileDraft.location} onChange={(event) => updateProfileDraft('location', event.target.value)} />
              </label>
              <label>
                {t('seniority')}
                <select value={profileDraft.desiredSeniority} onChange={(event) => updateProfileDraft('desiredSeniority', event.target.value)}>
                  <option value="">-</option>
                  <option value="JUNIOR">Junior</option>
                  <option value="MID">Mid</option>
                  <option value="SENIOR">{t('senior')}</option>
                  <option value="LEAD">{t('lead')}</option>
                  <option value="Senior">{t('senior')}</option>
                  <option value="Mid-Senior">{t('midSenior')}</option>
                  <option value="Lead">{t('lead')}</option>
                </select>
              </label>
              <label>
                {language === 'vi' ? 'Lương tối thiểu' : 'Minimum salary'}
                <input type="number" min="0" value={profileDraft.desiredSalaryMin} onChange={(event) => updateProfileDraft('desiredSalaryMin', event.target.value)} />
                <ValidationSuggestion
                  severity="warning"
                  code="SALARY_RANGE_REVIEW"
                  message={t('salaryRangeSuggestion')}
                />
              </label>
              <label>
                {language === 'vi' ? 'Lương tối đa' : 'Maximum salary'}
                <input type="number" min="0" value={profileDraft.desiredSalaryMax} onChange={(event) => updateProfileDraft('desiredSalaryMax', event.target.value)} />
              </label>
              <label>
                {language === 'vi' ? 'Đơn vị tiền tệ' : 'Currency'}
                <input value={profileDraft.desiredSalaryCurrency} onChange={(event) => updateProfileDraft('desiredSalaryCurrency', event.target.value.toUpperCase())} />
              </label>
              <label>
                {t('workingModel')}
                <select value={profileDraft.desiredWorkModel} onChange={(event) => updateProfileDraft('desiredWorkModel', event.target.value)}>
                  <option value="">-</option>
                  <option value="HYBRID">{t('hybrid')}</option>
                  <option value="REMOTE">{t('remote')}</option>
                  <option value="ONSITE">{t('onsite')}</option>
                </select>
              </label>
              <label>
                {language === 'vi' ? 'Số năm kinh nghiệm' : 'Years of experience'}
                <input type="number" min="0" max="50" value={profileDraft.yearsOfExperience} onChange={(event) => updateProfileDraft('yearsOfExperience', event.target.value)} />
              </label>
              <label className="settings-grid-wide">
                {language === 'vi' ? 'Giới thiệu bản thân' : 'About me'}
                <textarea rows={4} value={profileDraft.aboutMe} onChange={(event) => updateProfileDraft('aboutMe', event.target.value)} />
              </label>
            </div>
            <div className="profile-form-actions">
              <button onClick={() => profile && setProfileDraft({
                fullName: profile.fullName ?? '', phone: profile.phone ?? '', location: profile.location ?? '', desiredTitle: profile.desiredTitle ?? '',
                desiredSkills: profile.desiredSkills?.join(', ') ?? '', desiredSeniority: profile.desiredSeniority ?? '', desiredWorkModel: profile.desiredWorkModel ?? '',
                desiredSalaryMin: profile.desiredSalaryMin?.toString() ?? '', desiredSalaryMax: profile.desiredSalaryMax?.toString() ?? '',
                desiredSalaryCurrency: profile.desiredSalaryCurrency ?? 'VND', yearsOfExperience: profile.yearsOfExperience?.toString() ?? '', aboutMe: profile.aboutMe ?? '',
              })}>{t('cancel')}</button>
              <button className="primary-action" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : t('saveFixedProfile')}
              </button>
            </div>
          </div>
        ) : (
          <PortfolioManager />
        )}
      </section>
      {selectedCvId ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedCvId(null)}>
          <section className="candidate-review-modal cv-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cv-detail-title">
            <div className="section-heading inline-heading">
              <div>
                <p className="eyebrow">CV</p>
                <h2 id="cv-detail-title">{cvDetail.data?.displayName ?? (language === 'vi' ? 'Chi tiết CV' : 'CV details')}</h2>
              </div>
              <button type="button" aria-label={language === 'vi' ? 'Đóng' : 'Close'} onClick={() => setSelectedCvId(null)}><XCircle size={20} /></button>
            </div>
            {cvDetail.isLoading ? <div className="cv-detail-loading">{language === 'vi' ? 'Đang tải chi tiết CV...' : 'Loading CV details...'}</div> : null}
            {cvDetail.isError ? (
              <div className="cv-detail-error">
                <ActionMessage tone="error" text={readableError(cvDetail.error, language === 'vi' ? 'Không thể tải chi tiết CV.' : 'Could not load CV details.', language)} />
                <button type="button" onClick={() => cvDetail.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
              </div>
            ) : null}
            {cvDetail.data ? (
              <div className="cv-detail-content">
                <div className="cv-detail-meta">
                  <span>{cvDetail.data.source === 'MANUAL' ? t('manualCreation') : t('uploadedPdf')}</span>
                  <span>{cvDetail.data.status}</span>
                  {cvDetail.data.isDefault ? <strong>{t('defaultMatchingCv')}</strong> : null}
                  <span>{new Date(cvDetail.data.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                </div>
                <div>
                  <h3>{language === 'vi' ? 'Kỹ năng đã trích xuất' : 'Extracted skills'}</h3>
                  {cvDetail.data.topSkills.length ? <ReasonChips reasons={cvDetail.data.topSkills} /> : <p>{language === 'vi' ? 'Chưa có kỹ năng được trích xuất.' : 'No extracted skills yet.'}</p>}
                </div>
                <div>
                  <h3>{language === 'vi' ? 'Tóm tắt hồ sơ' : 'Profile summary'}</h3>
                  <p>{cvDetail.data.parsedSummary || (language === 'vi' ? 'Chưa có tóm tắt.' : 'No summary available.')}</p>
                </div>
                {cvDetail.data.failureReason ? <ActionMessage tone="error" text={cvDetail.data.failureReason} /> : null}
                <div>
                  <h3>{language === 'vi' ? 'Nội dung đã trích xuất' : 'Extracted content'}</h3>
                  <pre className="cv-raw-text">{cvDetail.data.rawText || (language === 'vi' ? 'Chưa có nội dung trích xuất.' : 'No extracted content available.')}</pre>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {deleteTargetCv ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTargetCv(null)}>
          <section className="candidate-review-modal compact-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-cv-title">
            <div className="section-heading inline-heading">
              <div><p className="eyebrow">CV</p><h2 id="delete-cv-title">{language === 'vi' ? 'Xóa CV?' : 'Delete CV?'}</h2></div>
              <button type="button" aria-label={language === 'vi' ? 'Đóng' : 'Close'} onClick={() => setDeleteTargetCv(null)}><XCircle size={20} /></button>
            </div>
            <p>{language === 'vi' ? `CV “${deleteTargetCv.displayName}” sẽ bị xóa vĩnh viễn.` : `“${deleteTargetCv.displayName}” will be permanently deleted.`}</p>
            <div className="filter-modal-actions">
              <button type="button" onClick={() => setDeleteTargetCv(null)}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button>
              <button className="danger-action" type="button" disabled={Boolean(deletingCvId)} onClick={deleteCv}>
                <Trash2 size={16} />{deletingCvId ? (language === 'vi' ? 'Đang xóa...' : 'Deleting...') : (language === 'vi' ? 'Xóa CV' : 'Delete CV')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type PortfolioEditor =
  | { kind: 'link'; item?: PortfolioLinkDto }
  | { kind: 'project'; item?: PortfolioProjectDto };

function PortfolioManager() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<PortfolioEditor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'link' | 'project'; id: string; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data: portfolio, isLoading, error } = useQuery<any>({
    queryKey: ['candidate-portfolio'],
    queryFn: careerfitApi.getPortfolio,
  });

  const vi = language === 'vi';
  const links = portfolio?.links ?? [];
  const projects = portfolio?.projects ?? [];

  async function refreshPortfolio() {
    await queryClient.invalidateQueries({ queryKey: ['candidate-portfolio'] });
  }

  async function saveLink(payload: PortfolioLinkPayload) {
    setSubmitting(true);
    setActionMessage(null);
    try {
      if (editor?.kind === 'link' && editor.item) await careerfitApi.updatePortfolioLink(editor.item.id, payload);
      else await careerfitApi.createPortfolioLink(payload);
      await refreshPortfolio();
      setEditor(null);
      setActionMessage({ tone: 'success', text: vi ? 'Đã lưu liên kết portfolio.' : 'Portfolio link saved.' });
    } catch (saveError) {
      setActionMessage({ tone: 'error', text: readableError(saveError, vi ? 'Không thể lưu liên kết.' : 'Could not save link.', language) });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProject(payload: PortfolioProjectPayload) {
    setSubmitting(true);
    setActionMessage(null);
    try {
      if (editor?.kind === 'project' && editor.item) await careerfitApi.updatePortfolioProject(editor.item.id, payload);
      else await careerfitApi.createPortfolioProject(payload);
      await refreshPortfolio();
      setEditor(null);
      setActionMessage({ tone: 'success', text: vi ? 'Đã lưu dự án portfolio.' : 'Portfolio project saved.' });
    } catch (saveError) {
      setActionMessage({ tone: 'error', text: readableError(saveError, vi ? 'Không thể lưu dự án.' : 'Could not save project.', language) });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      if (deleteTarget.kind === 'link') await careerfitApi.deletePortfolioLink(deleteTarget.id);
      else await careerfitApi.deletePortfolioProject(deleteTarget.id);
      await refreshPortfolio();
      setDeleteTarget(null);
      setActionMessage({ tone: 'success', text: vi ? 'Đã xóa mục portfolio.' : 'Portfolio item deleted.' });
    } catch (deleteError) {
      setActionMessage({ tone: 'error', text: readableError(deleteError, vi ? 'Không thể xóa mục này.' : 'Could not delete item.', language) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="portfolio-view">
      {actionMessage ? <ActionMessage {...actionMessage} /> : null}
      <div className="profile-cv-note">
        <Briefcase size={18} />
        <span>{vi ? 'Portfolio bổ trợ hồ sơ IT bằng dự án, sản phẩm và bằng chứng năng lực.' : 'Portfolio projects and links provide evidence of your technical capability.'}</span>
      </div>

      <section className="portfolio-links-card">
        <div className="inline-heading">
          <div className="manual-card-title">
            <Globe size={22} />
            <div><h3>{vi ? 'Liên kết cá nhân' : 'Personal links'}</h3><p>{vi ? 'GitHub, LinkedIn, website hoặc trang demo.' : 'GitHub, LinkedIn, website, or demo page.'}</p></div>
          </div>
          <button type="button" onClick={() => setEditor({ kind: 'link' })}><Plus size={17} />{vi ? 'Thêm liên kết' : 'Add link'}</button>
        </div>
        {isLoading ? <p>{vi ? 'Đang tải portfolio...' : 'Loading portfolio...'}</p> : null}
        {error ? <p className="form-error">{readableError(error, vi ? 'Không thể tải portfolio.' : 'Could not load portfolio.', language)}</p> : null}
        {!isLoading && !error && links.length === 0 ? <div className="portfolio-empty"><Globe size={22} /><p>{vi ? 'Chưa có liên kết cá nhân.' : 'No personal links yet.'}</p></div> : null}
        <div className="portfolio-link-list">
          {links.map((link: any) => (
            <article className="portfolio-link-row" key={link.id}>
              <div><strong>{link.type}</strong><a href={link.url} target="_blank" rel="noreferrer">{link.url}</a></div>
              <div className="portfolio-project-actions">
                <button type="button" aria-label={vi ? 'Sửa liên kết' : 'Edit link'} onClick={() => setEditor({ kind: 'link', item: link })}><Edit3 size={16} />{vi ? 'Sửa' : 'Edit'}</button>
                <button className="danger-action" type="button" aria-label={vi ? 'Xóa liên kết' : 'Delete link'} onClick={() => setDeleteTarget({ kind: 'link', id: link.id, label: link.url })}><Trash2 size={16} />{vi ? 'Xóa' : 'Delete'}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-projects-section">
        <div className="inline-heading">
          <div><p className="eyebrow">Portfolio</p><h3>{vi ? 'Dự án nổi bật' : 'Featured projects'}</h3></div>
          <button type="button" onClick={() => setEditor({ kind: 'project' })}><Plus size={17} />{vi ? 'Thêm dự án' : 'Add project'}</button>
        </div>
        {!isLoading && !error && projects.length === 0 ? <div className="portfolio-empty"><Briefcase size={22} /><p>{vi ? 'Chưa có dự án portfolio.' : 'No portfolio projects yet.'}</p></div> : null}
        <div className="portfolio-project-list">
          {projects.map((project: any) => (
            <article className="portfolio-project-card" key={project.id}>
              <div><p className="eyebrow">{project.role || (vi ? 'Dự án cá nhân' : 'Personal project')}</p><h3>{project.name}</h3>{project.summary ? <p>{project.summary}</p> : null}</div>
              {project.techStack?.length ? <ReasonChips reasons={project.techStack} /> : null}
              <div className="portfolio-project-meta">
                {project.projectUrl ? <a href={project.projectUrl} target="_blank" rel="noreferrer"><Globe size={15} />{project.projectUrl}</a> : null}
                {project.impact ? <strong>{project.impact}</strong> : null}
              </div>
              <div className="portfolio-project-actions">
                <button type="button" onClick={() => setEditor({ kind: 'project', item: project })}><Edit3 size={16} />{vi ? 'Sửa' : 'Edit'}</button>
                <button className="danger-action" type="button" onClick={() => setDeleteTarget({ kind: 'project', id: project.id, label: project.name })}><Trash2 size={16} />{vi ? 'Xóa' : 'Delete'}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editor?.kind === 'link' ? <PortfolioLinkModal item={editor.item} language={language} submitting={submitting} onClose={() => setEditor(null)} onSubmit={saveLink} /> : null}
      {editor?.kind === 'project' ? <PortfolioProjectModal item={editor.item} language={language} submitting={submitting} onClose={() => setEditor(null)} onSubmit={saveProject} /> : null}
      {deleteTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={vi ? 'Xác nhận xóa' : 'Confirm deletion'} onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <section className="candidate-review-modal portfolio-confirm-modal">
            <div><p className="eyebrow">Portfolio</p><h2>{vi ? 'Xóa mục này?' : 'Delete this item?'}</h2><p>{deleteTarget.label}</p></div>
            <div className="filter-modal-actions"><button type="button" onClick={() => setDeleteTarget(null)}>{vi ? 'Hủy' : 'Cancel'}</button><button className="danger-action" type="button" disabled={submitting} onClick={confirmDelete}><Trash2 size={17} />{submitting ? '...' : (vi ? 'Xóa' : 'Delete')}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PortfolioLinkModal({ item, language, submitting, onClose, onSubmit }: { item?: PortfolioLinkDto; language: 'vi' | 'en'; submitting: boolean; onClose: () => void; onSubmit: (payload: PortfolioLinkPayload) => Promise<void> }) {
  const vi = language === 'vi';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    return onSubmit({ type: String(form.get('type')), url: String(form.get('url')).trim() });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="candidate-review-modal portfolio-editor-modal" onSubmit={submit}><div className="section-heading inline-heading"><div><p className="eyebrow">Portfolio</p><h2>{item ? (vi ? 'Sửa liên kết' : 'Edit link') : (vi ? 'Thêm liên kết' : 'Add link')}</h2></div><button type="button" aria-label={vi ? 'Đóng' : 'Close'} onClick={onClose}><XCircle size={19} /></button></div><div className="settings-grid"><label>{vi ? 'Loại liên kết' : 'Link type'}<select name="type" defaultValue={item?.type ?? 'GITHUB'}><option value="GITHUB">GitHub</option><option value="LINKEDIN">LinkedIn</option><option value="PORTFOLIO">Portfolio</option><option value="BLOG">Blog</option><option value="OTHER">Other</option></select></label><label>URL<input name="url" type="url" required maxLength={500} defaultValue={item?.url ?? ''} placeholder="https://github.com/username" /></label></div><div className="filter-modal-actions"><button type="button" onClick={onClose}>{vi ? 'Hủy' : 'Cancel'}</button><button className="primary-action" disabled={submitting}><Save size={17} />{submitting ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu' : 'Save')}</button></div></form></div>;
}

function PortfolioProjectModal({ item, language, submitting, onClose, onSubmit }: { item?: PortfolioProjectDto; language: 'vi' | 'en'; submitting: boolean; onClose: () => void; onSubmit: (payload: PortfolioProjectPayload) => Promise<void> }) {
  const vi = language === 'vi';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    return onSubmit({ name: value('name'), role: value('role'), summary: value('summary'), techStack: value('techStack').split(',').map((skill) => skill.trim()).filter(Boolean), projectUrl: value('projectUrl'), impact: value('impact') });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="candidate-review-modal portfolio-editor-modal" onSubmit={submit}><div className="section-heading inline-heading"><div><p className="eyebrow">Portfolio</p><h2>{item ? (vi ? 'Sửa dự án' : 'Edit project') : (vi ? 'Thêm dự án' : 'Add project')}</h2></div><button type="button" aria-label={vi ? 'Đóng' : 'Close'} onClick={onClose}><XCircle size={19} /></button></div><div className="settings-grid"><label>{vi ? 'Tên dự án' : 'Project name'}<input name="name" required maxLength={255} defaultValue={item?.name ?? ''} /></label><label>{vi ? 'Vai trò' : 'Role'}<input name="role" maxLength={255} defaultValue={item?.role ?? ''} /></label><label className="settings-grid-wide">{vi ? 'Tóm tắt' : 'Summary'}<textarea name="summary" rows={3} defaultValue={item?.summary ?? ''} /></label><label>{vi ? 'Công nghệ, cách nhau bằng dấu phẩy' : 'Technologies, comma separated'}<input name="techStack" defaultValue={item?.techStack?.join(', ') ?? ''} /></label><label>{vi ? 'Liên kết dự án' : 'Project URL'}<input name="projectUrl" type="url" maxLength={500} defaultValue={item?.projectUrl ?? ''} placeholder="https://example.com/project" /></label><label className="settings-grid-wide">{vi ? 'Kết quả hoặc tác động' : 'Result or impact'}<textarea name="impact" rows={2} defaultValue={item?.impact ?? ''} /></label></div><div className="filter-modal-actions"><button type="button" onClick={onClose}>{vi ? 'Hủy' : 'Cancel'}</button><button className="primary-action" disabled={submitting}><Save size={17} />{submitting ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu' : 'Save')}</button></div></form></div>;
}

function RecommendationsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => careerfitApi.getRecommendations(20),
  });
  const recommendedJobs = (recommendationsQuery.data ?? []).filter((job) => !hiddenJobIds.includes(job.id));

  async function applyToJob(job: Job) {
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language),
      });
    }
  }

  async function skipJob(id: string, options?: { feedbackSaved?: boolean }) {
    const job = recommendedJobs.find((item) => item.id === id);
    setActionMessage(null);
    try {
      if (!options?.feedbackSaved && job?.matchingId) {
        await careerfitApi.submitMatchFeedback(job.matchingId, 'NOT_INTERESTED');
      }
      setHiddenJobIds((current) => [...current, id]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã ghi nhận phản hồi và ẩn công việc này.' : 'Feedback saved and job hidden.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ghi nhận phản hồi.' : 'Could not save feedback.', language),
      });
    }
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <p className="eyebrow">{t('recommendations')}</p>
        <h2>{t('recommendationsTitle')}</h2>
      </section>
      {actionMessage ? <ActionMessage {...actionMessage} /> : null}
      {recommendationsQuery.isError ? (
        <section className="query-error-panel">
          <ActionMessage tone="error" text={readableError(recommendationsQuery.error, language === 'vi' ? 'Không thể tải gợi ý việc làm.' : 'Could not load job recommendations.', language)} />
          <button type="button" onClick={() => recommendationsQuery.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
        </section>
      ) : null}
      <JobListWithPreview
        jobs={recommendedJobs}
        isLoading={recommendationsQuery.isLoading || recommendationsQuery.isFetching}
        onOpen={(job) => navigate(`/candidate/jobs/${job.id}`)}
        onApply={applyToJob}
        onSkip={skipJob}
        emptyTitle={t('noMatchingJobs')}
        emptyCopy={t('noMatchingJobsCopy')}
        emptyActions={<button onClick={() => navigate('/candidate/jobs')}>{t('viewAll')}</button>}
      />
    </div>
  );
}

function ApplicationsPage() {
  const { t, language } = useLanguage();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data: applicationPage, refetch } = useQuery<any>({
    queryKey: ['my-applications'],
    queryFn: () => careerfitApi.getMyApplications(),
    refetchInterval: 60_000,
  });
  const applicationRows = applicationPage?.content || applicationPage?.applications || (Array.isArray(applicationPage) ? applicationPage : []);

  async function withdraw(applicationId: string) {
    setWithdrawingId(applicationId);
    setActionMessage(null);
    try {
      await careerfitApi.withdrawApplication(applicationId);
      await refetch();
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã rút đơn ứng tuyển.' : 'Application withdrawn.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể rút đơn ứng tuyển.' : 'Could not withdraw application.', language),
      });
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{t('applications')}</p>
          <h2>{t('applicationsTitle')}</h2>
        </div>
        {actionMessage ? <ActionMessage {...actionMessage} /> : null}
        <div className="timeline">
          {applicationRows.map((application: any) => {
            const appId = application.id || application.applicationId;
            const isAutopilot = application.source === 'autopilot' || application.autoApplied;
            return (
              <article key={appId} className="application-card">
                <h3>{application.jobTitle}</h3>
                <p>{application.company} · {formatApplicationStatus(application.status, language)} · {formatApplicationTimestamp(application.updatedAt, language)}</p>
                <small>{isAutopilot ? t('autoFitAuditAvailable') : t('manualApplication')}</small>
                {['Applied', 'Invited', 'Auto-applied', 'Reviewing', 'PENDING', 'AUTO_APPLIED'].includes(application.status) ? (
                  <button className="withdraw-action" disabled={withdrawingId === appId} onClick={() => withdraw(appId)}>
                    {withdrawingId === appId ? t('processing') : (language === 'vi' ? 'Rút đơn' : 'Withdraw')}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AutomationPage() {
  const { language, t } = useLanguage();
  const [draftPolicy, setDraftPolicy] = useState<AutomationPolicy>(automationPolicy);
  const [isSaving, setIsSaving] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [policyMessage, setPolicyMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data: backendPolicy } = useQuery<any>({
    queryKey: ['automation-policy'],
    queryFn: () => careerfitApi.getAutomationPolicy(),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (backendPolicy) {
      setDraftPolicy(backendPolicy);
    }
  }, [backendPolicy]);

  async function updatePolicy(patch: Partial<AutomationPolicy>) {
    const previousPolicy = draftPolicy;
    const nextPolicy = { ...draftPolicy, ...patch };
    setDraftPolicy(nextPolicy);
    setIsSaving(true);
    setPolicyMessage(null);
    try {
      const saved = 'emailNotificationsEnabled' in patch && Object.keys(patch).length === 1
        ? await careerfitApi.updateEmailNotifications(Boolean(patch.emailNotificationsEnabled))
        : await careerfitApi.updateAutomationPolicy(patch);
      setDraftPolicy(saved);
      setPolicyMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã lưu chính sách tự động hóa.' : 'Automation policy saved.',
      });
    } catch (error) {
      setDraftPolicy(previousPolicy);
      setPolicyMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể lưu chính sách.' : 'Could not save automation policy.', language),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function runAutoApplyNow() {
    setIsSaving(true);
    setAutoApplyResult(null);
    try {
      const result = await careerfitApi.runAutoApplyNow();
      setAutoApplyResult({
        tone: 'success',
        text: t('autoApplyRunSuccess')
          .replace('{count}', String(result.created))
          .replace('{reason}', formatAutomationReason(result.reason, language)),
      });
    } catch {
      setAutoApplyResult({ tone: 'error', text: t('autoApplyRunFailed') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <AutomationPolicyPanel policy={draftPolicy} onUpdate={updatePolicy} isSaving={isSaving} />
      {policyMessage ? <ActionMessage {...policyMessage} /> : null}
      <section className="panel">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">AutoFit</p>
            <h2>{t('manualRun')}</h2>
          </div>
          <button className="primary-action" disabled={isSaving || !draftPolicy.autoApplyEnabled} onClick={runAutoApplyNow}>
            {t('runNow')}
          </button>
        </div>
        {autoApplyResult ? <ActionMessage {...autoApplyResult} /> : null}
      </section>
    </div>
  );
}

function CandidateSettingsPageUnused({
  onLogout,
  onDeleteAccount,
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return <ConnectedSettingsPage role="candidate" onLogout={() => { onLogout(); navigate('/'); }} onDeleteAccount={() => { onDeleteAccount(); navigate('/'); }} />;

  /* Legacy static markup retained below only for translation reference. */
  /* c8 ignore start */
  return (
    <SettingsSurface
      eyebrow={t('candidateSettings')}
      title={t('candidateSettingsTitle')}
      copy={t('candidateSettingsCopy')}
      sideTitle={t('matchingReadiness')}
      sideItems={[
        [t('defaultMatchingCv'), 'Frontend_CV_2026.pdf'],
        [t('jobAlerts'), 'High-match >= 90%'],
        [t('privacyVisibility'), t('recruiter')],
      ]}
      accountActions={
        <AccountDangerActions
          onLogout={() => {
            onLogout();
            navigate('/');
          }}
          onDeleteAccount={() => {
            onDeleteAccount();
            navigate('/');
          }}
        />
      }
    >
      <SettingsSection icon={<UserRound size={20} />} title={t('accountDisplay')}>
        <div className="settings-grid">
          <label>
            {t('displayName')}
            <input defaultValue={candidate.name} />
          </label>
          <label>
            {t('publicHeadline')}
            <input defaultValue={candidate.headline} />
          </label>
          <label>
            {t('primaryEmail')}
            <input defaultValue={candidate.email} type="email" />
          </label>
          <label>
            {t('location')}
            <input defaultValue={candidate.location} />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Bell size={20} />} title={t('jobAlerts')}>
        <div className="settings-option-grid">
          <SettingToggle title={t('highMatchEmail')} detail={t('viHighMatchEmailDetail')} checked />
          <SettingToggle title={t('dailyDigest')} detail={t('viWeeklyDigestDetail')} checked />
          <SettingToggle title={t('recruiterInviteAlerts')} detail={t('viRecruiterInviteDetail')} checked />
        </div>
        <div className="settings-grid">
          <label>
            {t('alertThreshold')}
            <input defaultValue="90%" />
          </label>
          <label>
            {t('digestTime')}
            <input defaultValue="08:00" type="time" />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection icon={<ShieldCheck size={20} />} title={t('privacyVisibility')}>
        <div className="settings-option-grid">
          <SettingToggle title={t('showPortfolioAfterApply')} detail={t('showPortfolioAfterApplyDetail')} checked />
          <SettingToggle title={t('allowPotentialDiscovery')} detail={t('allowPotentialDiscoveryDetail')} />
          <SettingToggle title={t('hidePhoneUntilInvite')} detail={t('hidePhoneUntilInviteDetail')} checked />
        </div>
      </SettingsSection>

      <SettingsSection icon={<KeyRound size={20} />} title={t('security')}>
        <div className="settings-grid">
          <label>
            {t('passwordlessLogin')}
            <select defaultValue={t('enabled')}>
              <option>{t('enabled')}</option>
              <option>{t('disabled')}</option>
            </select>
          </label>
          <label>
            {t('sessionTimeout')}
            <select defaultValue="30 days">
              <option value="7 days">{t('sevenDays')}</option>
              <option value="30 days">{t('thirtyDays')}</option>
              <option value="90 days">{t('ninetyDays')}</option>
            </select>
          </label>
        </div>
      </SettingsSection>
    </SettingsSurface>
  );
}

function RecruiterSettingsPageUnused({
  onLogout,
  onDeleteAccount,
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return <ConnectedSettingsPage role="recruiter" onLogout={() => { onLogout(); navigate('/'); }} onDeleteAccount={() => { onDeleteAccount(); navigate('/'); }} />;

  /* Legacy static markup retained below only for translation reference. */
  return (
    <SettingsSurface
      eyebrow={t('recruiterSettings')}
      title={t('recruiterSettingsTitle')}
      copy={t('recruiterSettingsCopy')}
      sideTitle={t('workspaceStatus')}
      sideItems={[
        [t('companyProfile'), t('published')],
        [t('teamSeats'), `6 ${t('activeMembers')}`],
        [t('defaultSla'), t('reviewIn48h')],
      ]}
      accountActions={
        <AccountDangerActions
          onLogout={() => {
            onLogout();
            navigate('/');
          }}
          onDeleteAccount={() => {
            onDeleteAccount();
            navigate('/');
          }}
        />
      }
    >
      <SettingsSection icon={<Building2 size={20} />} title={t('companyProfile')}>
        <div className="settings-grid">
          <label>
            {t('companyName')}
            <input defaultValue="Northstar HealthTech" />
          </label>
          <label>
            {t('website')}
            <input defaultValue="northstar.example.com" />
          </label>
          <label>
            {t('industry')}
            <input defaultValue="Healthcare automation" />
          </label>
          <label>
            {t('companySize')}
            <select defaultValue="150-300">
              <option>50-150</option>
              <option>150-300</option>
              <option>300-600</option>
              <option>600+</option>
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Users size={20} />} title={t('teamPermissions')}>
        <div className="settings-option-grid">
          <SettingToggle title={t('hiringManagerReview')} detail={t('hiringManagerReviewDetail')} checked />
          <SettingToggle title={t('sharedCandidateNotes')} detail={t('sharedCandidateNotesDetail')} checked />
          <SettingToggle title={t('restrictSalaryVisibility')} detail={t('restrictSalaryVisibilityDetail')} />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Briefcase size={20} />} title={t('jdDefaults')}>
        <div className="settings-grid">
          <label>
            {t('defaultWorkingModel')}
            <select defaultValue="Hybrid">
              <option value="Hybrid">{t('hybrid')}</option>
              <option value="Remote">{t('remote')}</option>
              <option value="Onsite">{t('onsite')}</option>
            </select>
          </label>
          <label>
            {t('defaultSalaryMode')}
            <select defaultValue="Range">
              <option value="Range">{t('salaryModeRange')}</option>
              <option value="Negotiable">{t('negotiable')}</option>
              <option value="Hidden">{t('hidden')}</option>
            </select>
          </label>
          <label>
            {t('candidateReviewSla')}
            <select defaultValue="48 hours">
              <option value="24 hours">{t('hours24')}</option>
              <option value="48 hours">{t('hours48')}</option>
              <option value="72 hours">{t('hours72')}</option>
            </select>
          </label>
          <label>
            {t('defaultLanguage')}
            <select defaultValue="Vietnamese / English">
              <option value="Vietnamese">{t('vietnamese')}</option>
              <option value="English">{t('english')}</option>
              <option value="Vietnamese / English">{t('bilingual')}</option>
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Clock3 size={20} />} title={t('recruitingNotifications')}>
        <div className="settings-option-grid">
          <SettingToggle title={t('highMatchCvAlert')} detail={t('highMatchCvAlertDetail')} checked />
          <SettingToggle title={t('dailyApprovalDigest')} detail={t('dailyApprovalDigestDetail')} checked />
          <SettingToggle title={t('jobClosingReminders')} detail={t('jobClosingRemindersDetail')} checked />
        </div>
      </SettingsSection>
    </SettingsSurface>
  );
}

function ConnectedSettingsPage({ role, onLogout, onDeleteAccount }: { role: 'candidate' | 'recruiter'; onLogout: () => void; onDeleteAccount: () => void }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const vi = language === 'vi';
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data, isLoading, error } = useQuery<any>({ queryKey: ['settings', role], queryFn: careerfitApi.getSettings });

  useEffect(() => { if (data) setDraft((data as any).values || {}); }, [data]);
  const setValue = (key: string, value: string | number | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  async function save() {
    setSaving(true); setMessage(null);
    try {
      await careerfitApi.updateSettings(draft);
      await queryClient.invalidateQueries({ queryKey: ['settings', role] });
      setMessage({ tone: 'success', text: vi ? 'Đã lưu cài đặt.' : 'Settings saved.' });
    } catch (saveError) {
      setMessage({ tone: 'error', text: readableError(saveError, vi ? 'Không thể lưu cài đặt.' : 'Could not save settings.', language) });
    } finally { setSaving(false); }
  }

  const toggle = (key: string, title: string, detail: string) => <SettingToggle title={title} detail={detail} checked={Boolean(draft[key])} onChange={(checked) => setValue(key, checked)} />;
  return <SettingsSurface
    eyebrow={role === 'candidate' ? (vi ? 'Cài đặt ứng viên' : 'Candidate settings') : (vi ? 'Cài đặt nhà tuyển dụng' : 'Recruiter settings')}
    title={vi ? 'Cấu hình tài khoản và thông báo' : 'Account and notification preferences'}
    copy={vi ? 'Các thay đổi được lưu vào backend và giữ nguyên sau khi đăng nhập lại.' : 'Changes are persisted by the backend across sessions.'}
    sideTitle={vi ? 'Trạng thái lưu trữ' : 'Persistence status'}
    sideItems={[[vi ? 'Vai trò' : 'Role', role], [vi ? 'Cập nhật gần nhất' : 'Last updated', (data as any)?.updatedAt ? new Date((data as any).updatedAt).toLocaleString() : '-']]}
    onSave={save} saving={saving}
    accountActions={<AccountDangerActions onLogout={onLogout} onDeleteAccount={onDeleteAccount} deleteDisabled />}
  >
    {message ? <ActionMessage {...message} /> : null}
    {isLoading ? <p>{vi ? 'Đang tải cài đặt...' : 'Loading settings...'}</p> : null}
    {error ? <p className="form-error">{readableError(error, vi ? 'Không thể tải cài đặt.' : 'Could not load settings.', language)}</p> : null}
    {!isLoading && !error && role === 'candidate' ? <>
      <SettingsSection icon={<Bell size={20} />} title={vi ? 'Thông báo việc làm' : 'Job notifications'}>
        <div className="settings-option-grid">
          {toggle('highMatchEmail', vi ? 'Email match cao' : 'High-match email', vi ? 'Nhận email khi có JD điểm cao.' : 'Email for strong job matches.')}
          {toggle('dailyDigest', vi ? 'Tổng hợp hằng ngày' : 'Daily digest', vi ? 'Nhận bản tóm tắt mỗi ngày.' : 'Receive a daily summary.')}
          {toggle('recruiterInviteAlerts', vi ? 'Lời mời recruiter' : 'Recruiter invitations', vi ? 'Thông báo khi recruiter mời ứng tuyển.' : 'Alert on recruiter invitations.')}
        </div>
        <div className="settings-grid"><label>{vi ? 'Ngưỡng cảnh báo' : 'Alert threshold'}<input type="number" min="0" max="100" value={Number(draft.alertThreshold ?? 90)} onChange={(e) => setValue('alertThreshold', Number(e.target.value))} /></label><label>{vi ? 'Giờ tổng hợp' : 'Digest time'}<input type="time" value={String(draft.digestTime ?? '08:00')} onChange={(e) => setValue('digestTime', e.target.value)} /></label></div>
      </SettingsSection>
      <SettingsSection icon={<ShieldCheck size={20} />} title={vi ? 'Quyền riêng tư' : 'Privacy'}><div className="settings-option-grid">{toggle('showPortfolioAfterApply', vi ? 'Hiện portfolio sau apply' : 'Show portfolio after apply', vi ? 'Cho recruiter xem portfolio sau khi ứng tuyển.' : 'Reveal portfolio after applying.')}{toggle('allowPotentialDiscovery', vi ? 'Cho phép tìm ứng viên tiềm năng' : 'Allow potential discovery', vi ? 'Xuất hiện trong discovery tiềm năng.' : 'Appear in potential discovery.')}{toggle('hidePhoneUntilInvite', vi ? 'Ẩn số điện thoại' : 'Hide phone until invite', vi ? 'Chỉ hiện số điện thoại sau lời mời.' : 'Reveal phone only after invite.')}</div></SettingsSection>
      <SettingsSection icon={<KeyRound size={20} />} title={vi ? 'Phiên đăng nhập' : 'Login session'}><div className="settings-option-grid">{toggle('passwordlessEnabled', vi ? 'Đăng nhập không mật khẩu' : 'Passwordless login', vi ? 'Cho phép magic link.' : 'Allow magic-link login.')}</div><div className="settings-grid"><label>{vi ? 'Thời hạn phiên (ngày)' : 'Session duration (days)'}<input type="number" min="1" max="90" value={Number(draft.sessionTimeoutDays ?? 30)} onChange={(e) => setValue('sessionTimeoutDays', Number(e.target.value))} /></label></div></SettingsSection>
    </> : null}
    {!isLoading && !error && role === 'recruiter' ? <>
      <SettingsSection icon={<Users size={20} />} title={vi ? 'Quy trình tuyển dụng' : 'Recruiting workflow'}><div className="settings-option-grid">{toggle('hiringManagerReview', vi ? 'Hiring manager duyệt' : 'Hiring manager review', vi ? 'Yêu cầu bước duyệt nội bộ.' : 'Require internal review.')}{toggle('sharedCandidateNotes', vi ? 'Chia sẻ ghi chú' : 'Shared candidate notes', vi ? 'Cho nhóm xem ghi chú ứng viên.' : 'Share candidate notes with team.')}{toggle('restrictSalaryVisibility', vi ? 'Giới hạn xem lương' : 'Restrict salary visibility', vi ? 'Ẩn lương với thành viên không được phép.' : 'Limit salary visibility.')}</div></SettingsSection>
      <SettingsSection icon={<Briefcase size={20} />} title={vi ? 'Mặc định JD' : 'JD defaults'}><div className="settings-grid"><label>{vi ? 'Mô hình làm việc' : 'Work model'}<select value={String(draft.defaultWorkingModel ?? 'HYBRID')} onChange={(e) => setValue('defaultWorkingModel', e.target.value)}><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label><label>{vi ? 'Kiểu lương' : 'Salary mode'}<select value={String(draft.defaultSalaryMode ?? 'RANGE')} onChange={(e) => setValue('defaultSalaryMode', e.target.value)}><option value="RANGE">Range</option><option value="NEGOTIABLE">Negotiable</option><option value="HIDDEN">Hidden</option></select></label><label>{vi ? 'SLA duyệt (giờ)' : 'Review SLA (hours)'}<input type="number" min="1" max="168" value={Number(draft.candidateReviewSlaHours ?? 48)} onChange={(e) => setValue('candidateReviewSlaHours', Number(e.target.value))} /></label><label>{vi ? 'Ngôn ngữ mặc định' : 'Default language'}<select value={String(draft.defaultLanguage ?? 'BILINGUAL')} onChange={(e) => setValue('defaultLanguage', e.target.value)}><option value="VI">Vietnamese</option><option value="EN">English</option><option value="BILINGUAL">Bilingual</option></select></label></div></SettingsSection>
      <SettingsSection icon={<Bell size={20} />} title={vi ? 'Thông báo tuyển dụng' : 'Recruiting notifications'}><div className="settings-option-grid">{toggle('highMatchCvAlert', vi ? 'CV điểm cao' : 'High-match CV alert', vi ? 'Thông báo CV phù hợp cao.' : 'Alert for high-scoring CVs.')}{toggle('dailyApprovalDigest', vi ? 'Tổng hợp chờ duyệt' : 'Approval digest', vi ? 'Tổng hợp hồ sơ chờ duyệt.' : 'Digest pending approvals.')}{toggle('jobClosingReminders', vi ? 'Nhắc JD sắp đóng' : 'Job closing reminders', vi ? 'Nhắc trước khi JD đóng.' : 'Reminder before job closes.')}</div></SettingsSection>
    </> : null}
  </SettingsSurface>;
}

function SettingsSurface({
  eyebrow,
  title,
  copy,
  sideTitle,
  sideItems,
  accountActions,
  children,
  onSave,
  saving = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  sideTitle: string;
  sideItems: Array<[string, string]>;
  accountActions?: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="page-stack settings-route">
      <section className="settings-hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </section>

      <section className="settings-layout">
        <div className="settings-main-stack">{children}</div>
        <aside className="settings-side-panel">
          <p className="eyebrow">{t('currentSetup')}</p>
          <h3>{sideTitle}</h3>
          <div className="settings-side-list">
            {sideItems.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <button className="primary-action full" onClick={onSave} disabled={!onSave || saving}>
            <Save size={17} />
            {saving ? '...' : t('saveSettings')}
          </button>
          {accountActions}
        </aside>
      </section>
    </div>
  );
}

function AccountDangerActions({
  onLogout,
  onDeleteAccount,
  deleteDisabled = false,
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
  deleteDisabled?: boolean;
}) {
  const { language, t } = useLanguage();

  return (
    <div className="account-danger-actions">
      <button onClick={onLogout}>
        <LogOut size={17} />
        {t('logout')}
      </button>
      <button
        className="danger-action"
        onClick={onDeleteAccount}
        disabled={deleteDisabled}
        title={deleteDisabled ? (language === 'vi' ? 'Backend chưa hỗ trợ xóa tài khoản.' : 'Account deletion is not supported by the backend yet.') : undefined}
      >
        <Trash2 size={17} />
        {t('deleteAccount')}
      </button>
    </div>
  );
}

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="settings-section-card">
      <div className="settings-section-title">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SettingToggle({ title, detail, checked = false, onChange }: { title: string; detail: string; checked?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange?.(event.target.checked)} readOnly={!onChange} />
    </label>
  );
}

function RecruiterHomePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [candidateQuery, setCandidateQuery] = useState('');
  const { data: summary } = useRecruiterSummary();
  return (
    <div className="page-stack">
      <SearchHero
        eyebrow={t('recruiter')}
        title={t('identifyTalent')}
        copy={t('recruiterHomeCopy')}
        placeholder={t('searchPlaceholder')}
        actionLabel={t('searchCandidates')}
        value={candidateQuery}
        onChange={setCandidateQuery}
        onSearch={() => navigate(`/recruiter/jobs${candidateQuery.trim() ? `?q=${encodeURIComponent(candidateQuery.trim())}` : ''}`)}
        onFilter={() => navigate('/recruiter/jobs')}
        centered
      />
      <JobMarketDashboard />
      <section className="stats-grid feature-stats recruiter-feature-stats">
        <StatCard label={t('activeJobs')} value={summary?.activeJobs ?? 0} detail={t('fourClosingThisWeek')} />
        <StatCard label={t('pendingApprovals')} value={summary?.pendingApprovals ?? 0} detail="HITL queue" />
        <StatCard label={t('highMatches')} value={summary?.highMatches ?? 0} detail="score >= 85%" />
        <StatCard label={t('invitesSent')} value={summary?.invitesSent ?? 0} detail={t('lastSevenDays')} />
      </section>
      <RecruiterOverviewPanel />
    </div>
  );
}

function RecruiterOverviewPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: recruiterJobs = [] } = useRecruiterJobs();

  return (
    <section className="panel recruiter-workspace-panel">
      <div className="section-heading inline-heading">
        <div>
          <p className="eyebrow">{t('recruiter')}</p>
          <h2>{t('rankingPoolTitle')}</h2>
        </div>
        <div className="actions">
          <button onClick={() => navigate('/recruiter/jobs?create=1')}>{t('createJd')}</button>
          <button className="primary-action" onClick={() => downloadRecruiterJobs()}>{t('exportRanking')}</button>
        </div>
      </div>

      <div className="top-filter-bar recruiter-filter-bar">
        <button onClick={() => navigate('/recruiter/jobs')}>{t('role')} ▾</button>
        <button onClick={() => navigate('/recruiter/jobs?status=active')}>{t('status')} ▾</button>
        <button onClick={() => navigate('/recruiter/jobs?match=HIGH')}>{t('score')} ▾</button>
        <button onClick={() => navigate('/recruiter/jobs?match=POTENTIAL')}>{t('potential')} ▾</button>
        <button className="filter-button" onClick={() => navigate('/recruiter/jobs')}>
          <SlidersHorizontal size={16} />
          {t('filter')}
        </button>
      </div>

      <div className="ranking-table recruiter-table">
        <div className="table-row table-head">
          <span>{t('jobs')}</span>
          <span>{t('topScore')}</span>
          <span>{t('applicants')}</span>
          <span>{t('potential')}</span>
          <span>{t('status')}</span>
        </div>
        {recruiterJobs.map((job) => (
          <button className="table-row recruiter-row" key={job.id} onClick={() => navigate(`/recruiter/jobs/${job.id}/ranking`)}>
            <span>
              {job.title}
              <small>{job.company}</small>
            </span>
            <span>
              <MatchingBadge score={job.normalizedScore} label={job.label} />
            </span>
            <span>{job.applicantCount ?? 0}</span>
            <span>{job.matchCount ?? 0}</span>
            <span>{job.postingStatus ?? 'ACTIVE'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CreateJobModal({ language, onClose, onSubmit, submitting, initial }: {
  language: 'vi' | 'en';
  onClose: () => void;
  onSubmit: (payload: CreateJobPayload) => Promise<void>;
  submitting: boolean;
  initial?: Job;
}) {
  const [salaryMin, setSalaryMin] = useState(initial?.salaryMin?.toLocaleString('en-US') ?? '');
  const [salaryMax, setSalaryMax] = useState(initial?.salaryMax?.toLocaleString('en-US') ?? '');

  function formatSalaryInput(value: string) {
    const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    return digits ? Number(digits).toLocaleString('en-US') : '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const csv = (name: string) => String(form.get(name) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const nullableNumber = (name: string) => {
      const value = String(form.get(name) ?? '').replace(/,/g, '').trim();
      return value ? Number(value) : null;
    };
    await onSubmit({
      title: String(form.get('title') ?? '').trim(), company: String(form.get('company') ?? '').trim(),
      originalText: String(form.get('originalText') ?? '').trim(), requiredSkills: csv('requiredSkills'),
      niceToHaveSkills: csv('niceToHaveSkills'), seniorityLevel: String(form.get('seniorityLevel') ?? ''),
      employmentType: String(form.get('employmentType') ?? ''), location: String(form.get('location') ?? '').trim(),
      remoteType: String(form.get('remoteType') ?? ''), salaryMode: String(form.get('salaryMode') ?? 'NEGOTIABLE'),
      salaryMin: nullableNumber('salaryMin'), salaryMax: nullableNumber('salaryMax'),
      salaryCurrency: String(form.get('salaryCurrency') ?? 'VND'), salaryType: 'MONTHLY', salaryIsVisible: true,
      domain: String(form.get('domain') ?? '').trim(), language,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="candidate-review-modal create-job-modal" onSubmit={submit}>
        <div className="section-heading inline-heading">
          <div><p className="eyebrow">Recruiter</p><h2>{initial ? (language === 'vi' ? 'Sửa công việc' : 'Edit job') : (language === 'vi' ? 'Đăng công việc mới' : 'Post a new job')}</h2></div>
          <button type="button" aria-label={language === 'vi' ? 'Đóng' : 'Close'} onClick={onClose}><XCircle size={19} /></button>
        </div>
        <div className="settings-grid">
          <label>{language === 'vi' ? 'Chức danh' : 'Title'}<input name="title" required maxLength={255} defaultValue={initial?.title ?? ''} /></label>
          <label>{language === 'vi' ? 'Công ty' : 'Company'}<input name="company" required maxLength={255} defaultValue={initial?.company ?? ''} readOnly={Boolean(initial)} /></label>
          <label>{language === 'vi' ? 'Kỹ năng bắt buộc' : 'Required skills'}<input name="requiredSkills" placeholder="Java, Spring Boot, PostgreSQL" required defaultValue={initial?.requiredSkills.join(', ') ?? ''} /></label>
          <label>{language === 'vi' ? 'Kỹ năng ưu tiên' : 'Nice-to-have skills'}<input name="niceToHaveSkills" placeholder="Docker, AWS" defaultValue={initial?.optionalSkills.join(', ') ?? ''} /></label>
          <label>{language === 'vi' ? 'Cấp bậc' : 'Seniority'}<select name="seniorityLevel" defaultValue={initial?.seniority ?? 'MID'}><option value="INTERN">Intern</option><option value="FRESHER">Fresher</option><option value="JUNIOR">Junior</option><option value="MID">Mid</option><option value="SENIOR">Senior</option><option value="LEAD">Lead</option></select></label>
          <label>{language === 'vi' ? 'Loại việc làm' : 'Employment type'}<select name="employmentType" defaultValue={initial?.employmentType ?? 'FULL_TIME'}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></select></label>
          <label>{language === 'vi' ? 'Địa điểm' : 'Location'}<input name="location" defaultValue={initial?.location.split(',')[0] ?? ''} /></label>
          <label>{language === 'vi' ? 'Hình thức làm việc' : 'Work model'}<select name="remoteType" defaultValue={initial?.remoteType ?? 'HYBRID'}><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label>
          <label>{language === 'vi' ? 'Kiểu lương' : 'Salary mode'}<select name="salaryMode" defaultValue={initial?.salaryMode ?? 'RANGE'}><option value="NEGOTIABLE">Negotiable</option><option value="RANGE">Range</option><option value="UP_TO">Up to</option><option value="FROM">From</option><option value="HIDDEN">Hidden</option></select></label>
          <label>{language === 'vi' ? 'Lương tối thiểu' : 'Minimum salary'}<input name="salaryMin" inputMode="numeric" value={salaryMin} onChange={(event) => setSalaryMin(formatSalaryInput(event.target.value))} placeholder="15,000,000" /></label>
          <label>{language === 'vi' ? 'Lương tối đa' : 'Maximum salary'}<input name="salaryMax" inputMode="numeric" value={salaryMax} onChange={(event) => setSalaryMax(formatSalaryInput(event.target.value))} placeholder="25,000,000" /></label>
          <label>{language === 'vi' ? 'Đơn vị tiền tệ' : 'Currency'}<select name="salaryCurrency" defaultValue={initial?.salaryCurrency ?? 'VND'}><option value="VND">VND</option><option value="USD">USD</option></select></label>
          <label>{language === 'vi' ? 'Lĩnh vực' : 'Domain'}<input name="domain" placeholder="Software" defaultValue={initial?.domain ?? ''} /></label>
          <label className="settings-grid-wide">{language === 'vi' ? 'Mô tả công việc đầy đủ' : 'Full job description'}<textarea name="originalText" rows={7} required defaultValue={initial?.description ?? ''} /></label>
        </div>
        <div className="filter-modal-actions">
          <button type="button" onClick={onClose}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button>
          <button className="primary-action" disabled={submitting}>{submitting ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : initial ? (language === 'vi' ? 'Lưu thay đổi' : 'Save changes') : (language === 'vi' ? 'Đăng công việc' : 'Post job')}</button>
        </div>
      </form>
    </div>
  );
}

function RecruiterJobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { jobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const recruiterSubview = getRecruiterSubview(location.pathname);
  const recruiterSearchParamsKey = searchParams.toString();
  const recruiterQuery = useMemo(
    () => getRecruiterJobsQuery(new URLSearchParams(recruiterSearchParamsKey)),
    [recruiterSearchParamsKey],
  );
  const { data: recruiterJobs = [], refetch: refetchRecruiterJobs } = useRecruiterJobs();
  const [showCreateJob, setShowCreateJob] = useState(searchParams.get('create') === '1');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const selectedJob = recruiterJobs.find((job) => job.id === jobId) ?? recruiterJobs[0] ?? null;
  const candidateOptions = useMemo(() => recruiterDiscoveryOptions(recruiterQuery), [recruiterQuery]);
  const [invitingCandidateId, setInvitingCandidateId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidateItem | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowCreateJob(true);
  }, [searchParams]);

  async function createJob(payload: CreateJobPayload) {
    setCreatingJob(true);
    setActionMessage(null);
    try {
      await careerfitApi.createJob(payload);
      await refetchRecruiterJobs();
      setShowCreateJob(false);
      const params = new URLSearchParams(searchParams);
      params.delete('create');
      setSearchParams(params);
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã tạo công việc mới.' : 'New job created.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể tạo công việc.' : 'Could not create job.', language) });
    } finally {
      setCreatingJob(false);
    }
  }

  async function saveEditedJob(payload: CreateJobPayload) {
    if (!editingJob) return;
    setCreatingJob(true);
    setActionMessage(null);
    try {
      const { company: _company, ...update } = payload;
      await careerfitApi.updateJob(editingJob.id, update);
      await refetchRecruiterJobs();
      setEditingJob(null);
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã cập nhật công việc.' : 'Job updated.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể cập nhật công việc.' : 'Could not update job.', language) });
    } finally {
      setCreatingJob(false);
    }
  }

  async function changeJobStatus(status: 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'PAUSED') {
    if (!selectedJob) return;
    setActionMessage(null);
    try {
      await careerfitApi.updateJobStatus(selectedJob.id, status);
      await refetchRecruiterJobs();
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã đổi trạng thái công việc.' : 'Job status updated.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể đổi trạng thái.' : 'Could not update status.', language) });
    }
  }

  async function confirmDeleteJob() {
    if (!deletingJob) return;
    setCreatingJob(true);
    setActionMessage(null);
    try {
      await careerfitApi.deleteJob(deletingJob.id);
      await refetchRecruiterJobs();
      setDeletingJob(null);
      navigate('/recruiter/jobs');
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã xóa công việc.' : 'Job deleted.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể xóa. Job có ứng viên nên được đóng thay vì xóa.' : 'Could not delete. Close jobs with applications instead.', language) });
    } finally {
      setCreatingJob(false);
    }
  }

  async function exportJobs() {
    try {
      await downloadRecruiterJobs();
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã xuất danh sách JD.' : 'Jobs exported.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể xuất JD.' : 'Could not export jobs.', language) });
    }
  }

  function closeCreateJob() {
    setShowCreateJob(false);
    const params = new URLSearchParams(searchParams);
    params.delete('create');
    setSearchParams(params);
  }
  const { data: discoveredCandidates = [], refetch: refetchCandidates, isLoading: isCandidatesLoading, isError: candidateLoadFailed } = useQuery<any>({
    queryKey: ['recruiter-candidates', selectedJob?.id, candidateOptions],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterCandidates(selectedJob!.id, candidateOptions).then((page) => page.candidates),
    refetchInterval: 60_000,
  });
  const visibleRecruiterJobs = useMemo(() => {
    const normalized = recruiterQuery.q.trim().toLowerCase();
    return recruiterJobs
      .filter((job, index) => {
        if (recruiterQuery.status === 'active' && index === 1) return false;
        if (recruiterQuery.status === 'draft' && index !== 1) return false;
        if (!normalized) return true;
        return [job.title, job.company, job.location, job.seniority, ...job.requiredSkills].join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (recruiterQuery.sort === 'newest') return recruiterJobs.indexOf(a) - recruiterJobs.indexOf(b);
        if (recruiterQuery.sort === 'applicants_desc') return recruiterJobs.indexOf(b) - recruiterJobs.indexOf(a);
        return b.normalizedScore - a.normalizedScore;
      });
  }, [recruiterJobs, recruiterQuery.q, recruiterQuery.status, recruiterQuery.sort]);
  const candidates: RecruiterCandidateItem[] = discoveredCandidates;
  const candidateTieScores = useMemo(() => {
    const counts = new Map<number, number>();
    candidates.forEach((item) => counts.set(item.score, (counts.get(item.score) ?? 0) + 1));
    return counts;
  }, [candidates]);
  const visibleCandidates = useMemo(() => {
    const normalized = recruiterQuery.q.trim().toLowerCase();
    return candidates
      .filter((item) => !normalized || [item.name, item.title].join(' ').toLowerCase().includes(normalized))
      .filter((item) => recruiterQuery.status === 'all' || (recruiterQuery.status === 'active' ? item.score >= 85 : item.score < 85))
      .filter((item) => matchesRecruiterCandidateFilter(item, recruiterQuery.match))
      .sort((a, b) => {
        if (recruiterQuery.sort === 'newest') return candidates.indexOf(a) - candidates.indexOf(b);
        return sortRecruiterCandidates(a, b, candidates);
      });
  }, [candidates, recruiterQuery.match, recruiterQuery.q, recruiterQuery.status, recruiterQuery.sort]);

  function updateRecruiterQuery(key: 'q' | 'status' | 'sort' | 'match', value: string) {
    const params = new URLSearchParams(searchParams);
    const defaults = { q: '', status: 'all', sort: 'score_desc', match: 'all' };
    setOrDeleteParam(params, key, value, defaults[key]);
    setSearchParams(params);
  }

  function navigateRecruiterSubview(job: Job, subview: RecruiterSubview = recruiterSubview) {
    const suffix = subview === 'ranking' ? 'ranking' : subview;
    const search = searchParams.toString();
    navigate({ pathname: `/recruiter/jobs/${job.id}/${suffix}`, search: search ? `?${search}` : '' });
  }

  async function inviteCandidate(item: RecruiterCandidateItem) {
    if (!selectedJob) return;
    setInvitingCandidateId(item.candidateId);
    setActionMessage(null);
    try {
      await careerfitApi.inviteCandidate(selectedJob.id, item.candidateId);
      await refetchCandidates();
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? `Đã gửi lời mời đến ${item.name}.` : `Invitation sent to ${item.name}.`,
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể gửi lời mời.' : 'Could not send invitation.', language),
      });
    } finally {
      setInvitingCandidateId(null);
    }
  }

  async function updateCandidateStatus(item: RecruiterCandidateItem, status: 'APPROVED' | 'REJECTED') {
    if (!item.applicationId) {
      setActionMessage({ tone: 'error', text: language === 'vi' ? 'Ứng viên chưa có hồ sơ ứng tuyển để cập nhật.' : 'Candidate has no application to update.' });
      return;
    }
    setInvitingCandidateId(item.candidateId);
    setActionMessage(null);
    try {
      await careerfitApi.updateApplicationStatus(item.applicationId, status);
      await refetchCandidates();
      setActionMessage({
        tone: 'success',
        text: status === 'APPROVED'
          ? (language === 'vi' ? `Đã duyệt hồ sơ của ${item.name}.` : `${item.name} approved.`)
          : (language === 'vi' ? `Đã từ chối hồ sơ của ${item.name}.` : `${item.name} rejected.`),
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể cập nhật trạng thái.' : 'Could not update status.', language),
      });
    } finally {
      setInvitingCandidateId(null);
    }
  }

  if (!selectedJob) {
    return (
      <section className="panel empty-state">
        <h2>{language === 'vi' ? 'Chưa có công việc' : 'No jobs yet'}</h2>
        <p>{language === 'vi' ? 'Tạo JD đầu tiên để bắt đầu tìm ứng viên.' : 'Create the first job to start candidate discovery.'}</p>
        <button className="primary-action" onClick={() => setShowCreateJob(true)}><Plus size={17} />{t('postJob')}</button>
        {showCreateJob ? <CreateJobModal language={language} onClose={closeCreateJob} onSubmit={createJob} submitting={creatingJob} /> : null}
      </section>
    );
  }

  return (
    <section className="recruiter-hr-dashboard">
      <div className="recruiter-hr-header">
        <div>
          <p className="eyebrow">{t('recruiterWorkspace')}</p>
          <h2>{t('jobsManagement')}</h2>
        </div>
        <div className="recruiter-hr-actions">
          <label className="recruiter-search-field">
            <Search size={17} />
            <input
              value={recruiterQuery.q}
              onChange={(event) => updateRecruiterQuery('q', event.target.value)}
              placeholder={t('searchJobs')}
            />
          </label>
          <select value={recruiterQuery.status} onChange={(event) => updateRecruiterQuery('status', event.target.value)}>
            <option value="all">{t('status')}</option>
            <option value="active">{t('active')}</option>
            <option value="draft">{t('draft')}</option>
          </select>
          <select value={recruiterQuery.sort} onChange={(event) => updateRecruiterQuery('sort', event.target.value)}>
            <option value="score_desc">{t('score')}</option>
            <option value="applicants_desc">{t('applicants')}</option>
            <option value="newest">{t('newJobs')}</option>
          </select>
          <button className="primary-action" onClick={() => setShowCreateJob(true)}>
            <Plus size={17} />
            {t('postJob')}
          </button>
          <button onClick={exportJobs}><FileText size={17} />{language === 'vi' ? 'Xuất CSV' : 'Export CSV'}</button>
        </div>
      </div>

      {showCreateJob ? <CreateJobModal language={language} onClose={closeCreateJob} onSubmit={createJob} submitting={creatingJob} /> : null}
      {editingJob ? <CreateJobModal language={language} initial={editingJob} onClose={() => setEditingJob(null)} onSubmit={saveEditedJob} submitting={creatingJob} /> : null}

      <div className="recruiter-hr-grid">
        <aside className="recruiter-requisition-panel">
          <div className="requisition-panel-head">
            <h3>{t('activeRequisitions')}</h3>
            <button aria-label={t('postJob')} onClick={() => setShowCreateJob(true)}>
              <Plus size={18} />
            </button>
          </div>
          <div className="requisition-list">
            {visibleRecruiterJobs.map((job) => {
              return (
              <button
                className={job.id === selectedJob.id ? 'requisition-row active' : 'requisition-row'}
                key={job.id}
                onClick={() => navigateRecruiterSubview(job)}
              >
                <span className="requisition-row-top">
                  <strong>{job.title}</strong>
                  <em>{job.postingStatus ?? 'DRAFT'}</em>
                </span>
                <span className="requisition-row-meta">
                  <span>
                    <MapPin size={14} />
                    {localizeUiMetadata(job.location.split(',')[0], language)}
                  </span>
                  <span>
                    <Users size={14} />
                    {job.applicantCount ?? 0} {t('applicants')}
                  </span>
                </span>
              </button>
              );
            })}
          </div>
        </aside>

        <section className="recruiter-detail-workspace">
          <article className="recruiter-job-detail-card">
            <div className="recruiter-detail-top">
              <div>
                <h3>{selectedJob.title}</h3>
                <p>
                  <Building2 size={16} />
                  {selectedJob.company}
                  <span />
                  <Briefcase size={16} />
                  {selectedJob.seniority}
                  <span />
                  <CalendarDays size={16} />
                  {selectedJob.salary}
                </p>
              </div>
              <div className="recruiter-icon-actions">
                <button aria-label={t('edit')} onClick={() => setEditingJob(selectedJob)}>
                  <Edit3 size={17} />
                </button>
                <button aria-label={t('delete')} onClick={() => setDeletingJob(selectedJob)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <ReasonChips reasons={[...selectedJob.requiredSkills, t('fiveYearsExp')].slice(0, 5)} />
            <label className="recruiter-job-status-control">
              <span>{t('status')}</span>
              <select value={selectedJob.postingStatus ?? 'DRAFT'} onChange={(event) => changeJobStatus(event.target.value as 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'PAUSED')}>
                <option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="PAUSED">PAUSED</option><option value="CLOSED">CLOSED</option>
              </select>
            </label>
          </article>

          <div className="candidate-tabs">
            <button className={recruiterSubview === 'applicants' || recruiterSubview === 'ranking' ? 'active' : ''} onClick={() => navigateRecruiterSubview(selectedJob, 'applicants')}>
              {t('appliedCvs')} ({selectedJob.applicantCount ?? 0})
            </button>
            <button className={recruiterSubview === 'potential' ? 'active' : ''} onClick={() => navigateRecruiterSubview(selectedJob, 'potential')}>
              {t('aiPotentialMatches')} ({selectedJob.matchCount ?? 0})
            </button>
          </div>

          <div className="candidate-match-filter-bar">
            <span>
              <SlidersHorizontal size={15} />
              {t('candidateMatchFilter')}
            </span>
            {(['all', 'HIGH', 'POTENTIAL', 'HIGH_OR_POTENTIAL', 'APPLIED', 'NOT_APPLIED'] as RecruiterMatchFilter[]).map((filter) => (
              <button
                className={recruiterQuery.match === filter ? 'active' : ''}
                key={filter}
                onClick={() => updateRecruiterQuery('match', filter)}
                type="button"
              >
                {filter === 'all' ? t('allMatches') : t(`matchFilter${filter}`)}
              </button>
            ))}
          </div>

          {actionMessage ? <ActionMessage {...actionMessage} /> : null}

          <div className="recruiter-candidate-list">
            {isCandidatesLoading ? (
              <section className="empty-state recruiter-empty-state"><p>{t('loading')}</p></section>
            ) : candidateLoadFailed ? (
              <section className="empty-state recruiter-empty-state">
                <h3>{language === 'vi' ? 'Không thể tải ứng viên' : 'Could not load candidates'}</h3>
                <button onClick={() => refetchCandidates()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
              </section>
            ) : visibleCandidates.length === 0 ? (
              <section className="empty-state recruiter-empty-state">
                <h3>{t('noCandidatesForFilter')}</h3>
                <p>{t('noCandidatesForFilterCopy')}</p>
                <div className="empty-actions">
                  <button onClick={() => updateRecruiterQuery('match', 'all')}>{t('viewAllRanking')}</button>
                  <button onClick={() => updateRecruiterQuery('q', '')}>{t('clearSearch')}</button>
                </div>
              </section>
            ) : visibleCandidates.map((item) => (
              <article className="candidate-review-card" key={item.name}>
                <div className="candidate-review-main">
                  <div className="candidate-avatar">{item.initials}</div>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.title}</p>
                    <small>
                      {item.appliedAt} · {item.hasApplied ? t('applied') : item.applicationStatus === 'INVITED' ? (language === 'vi' ? 'Đã mời' : 'Invited') : t('notApplied')}
                    </small>
                    {item.isPotential ? <PotentialBadge /> : null}
                  </div>
                </div>
                <div className="candidate-score-block">
                  <span>{t('matchScore')}</span>
                  <div>
                    <i>
                      <b style={{ width: `${item.score}%` }} />
                    </i>
                    <strong>{item.score}%</strong>
                  </div>
                </div>
                <div className="candidate-review-actions">
                  {!item.hasApplied && (item.label === 'HIGH' || item.isPotential) ? (
                    <>
                      <button disabled={invitingCandidateId === item.candidateId} onClick={() => inviteCandidate(item)}>{t('invite')}</button>
                      <button onClick={() => setSelectedCandidate(item)}>{t('review')}</button>
                    </>
                  ) : null}
                  {item.hasApplied && item.applicationId ? (
                    <>
                      <button disabled={invitingCandidateId === item.candidateId} onClick={() => updateCandidateStatus(item, 'APPROVED')}>{t('approve')}</button>
                      <button disabled={invitingCandidateId === item.candidateId} onClick={() => updateCandidateStatus(item, 'REJECTED')}>{t('reject')}</button>
                    </>
                  ) : null}
                  <button onClick={() => setSelectedCandidate(item)}>{t('viewCv')}</button>
                </div>
                {item.tie?.tied || candidateTieScores.get(item.score)! > 1 ? (
                  <div className="tie-break-note">
                    <Sparkles size={15} />
                    <span>{item.tieBreakReason ?? t('stableRankingApplied')}</span>
                    <small>
                      {item.tie ? `${item.tie.tieGroupSize} ${t('score')}` : item.skillOverlapCount ? `${item.skillOverlapCount} ${t('skills')}` : t('score')}
                      {' · '}
                      {item.tie ? `${item.tie.sortKey}` : item.jobFreshness ?? t('updatedToday')}
                      {' · '}
                      {item.salaryFit ?? t('salary')}
                      {' · '}
                      {item.locationFit ?? t('location')}
                    </small>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
      {selectedCandidate ? <CandidateReviewModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} /> : null}
      {deletingJob ? <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Xác nhận xóa JD' : 'Confirm job deletion'}><section className="candidate-review-modal portfolio-confirm-modal"><div><p className="eyebrow">Recruiter</p><h2>{language === 'vi' ? 'Xóa công việc?' : 'Delete job?'}</h2><p>{deletingJob.title}</p></div><div className="filter-modal-actions"><button onClick={() => setDeletingJob(null)}>{t('cancel')}</button><button className="danger-action" disabled={creatingJob} onClick={confirmDeleteJob}><Trash2 size={17} />{t('delete')}</button></div></section></div> : null}
    </section>
  );
}

async function downloadRecruiterJobs() {
  const blob = await careerfitApi.exportRecruiterJobs();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `careerfit-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AnalyticsPage() {
  const { t, language } = useLanguage();
  const market = useAdvancedMarketAnalytics(30);
  const chartData = market.trends.map((item) => ({
    ...item,
    label: new Date(item.date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }),
  }));
  return (
    <div className="page-stack">
      <section className="panel chart-panel">
        <div className="section-heading">
          <p className="eyebrow">{t('analytics')}</p>
          <h2>{t('jobTrend')}</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="matches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#006a62" stopOpacity={0.36} />
                <stop offset="95%" stopColor="#006a62" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.12)" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="matches" stroke="#006a62" fill="url(#matches)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <section className="panel chart-panel">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.12)" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="jobs" fill="#00446e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

const emptyAdvancedTrends: AdvancedTrendPoint[] = [];
const emptyAdvancedMarket: AdvancedMarketOverview = {
  activeJobs: 0, totalJobs: 0, newJobsInRange: 0, employers: 0,
  jobViews: 0, jobSearches: 0, applications: 0, matchings: 0,
  topSkills: [], salaryDistribution: [],
};
const emptyCandidateAnalytics: CandidateAnalyticsOverview = {
  profileCompleteness: 0, cvCount: 0, scoringDoneCvCount: 0, totalMatches: 0,
  highMatches: 0, potentialMatches: 0, averageMatchScore: 0, bestMatchScore: 0,
  totalApplications: 0, applicationFunnel: {}, skillDemand: [], profileGaps: [],
};
const emptyRecruiterAnalytics: RecruiterAnalyticsOverview = {
  totalJobs: 0, activeJobs: 0, totalApplicants: 0, pendingReview: 0,
  approved: 0, rejected: 0, invited: 0, autoApplied: 0, totalMatchings: 0,
  highMatchings: 0, potentialMatchings: 0, averageMatchScore: 0, jobViews: 0, topJobs: [],
};

function AdvancedAnalyticsPage({ role }: { role: Role }) {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeDays = getRangeDays(searchParams);
  const market = useAdvancedMarketAnalytics(rangeDays);
  const candidate = useCandidateAdvancedAnalytics(role === 'candidate', rangeDays);
  const recruiter = useRecruiterAdvancedAnalytics(role === 'recruiter', rangeDays);
  const numberFormat = useMemo(() => new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US'), [language]);
  const salaryData = market.salaryDistribution.slice(0, 6).map((item) => ({
    label: item.seniority || item.currency,
    jobs: item.jobCount,
    averageSalary: Number(item.averageSalary),
  }));

  function updateRangeDays(nextRangeDays: number) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'rangeDays', String(nextRangeDays), '30');
    setSearchParams(params);
  }

  return (
    <div className="page-stack advanced-analytics-route">
      <section className="advanced-analytics-hero">
        <div>
          <p className="eyebrow">{t('advancedAnalytics')}</p>
          <h2>{t('advancedAnalyticsTitle')}</h2>
          <p>{t('advancedAnalyticsCopy')}</p>
        </div>
        <div className="advanced-hero-meter">
          <span>{t('marketIntelligence')}</span>
          <strong>{numberFormat.format(market.activeJobs)}</strong>
          <small>{t('openJobs')}</small>
          <label className="advanced-range-control">
            {t('range')}
            <select value={rangeDays} onChange={(event) => updateRangeDays(Number(event.target.value))}>
              <option value={7}>{t('sevenDays')}</option>
              <option value={30}>{t('thirtyDays')}</option>
              <option value={90}>{t('ninetyDays')}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="advanced-metric-grid">
        <StatCard label={t('activeJobs')} value={numberFormat.format(market.activeJobs)} detail={`${numberFormat.format(market.newJobsInRange)} ${t('newJobs')}`} />
        <StatCard label={t('jobViews')} value={numberFormat.format(market.jobViews)} detail={`${numberFormat.format(market.jobSearches)} ${t('jobSearches')}`} />
        <StatCard label={t('applications')} value={numberFormat.format(market.applications)} detail={`${numberFormat.format(market.matchings)} ${t('matchings')}`} />
        <StatCard label={t('companiesHiring')} value={numberFormat.format(market.employers)} detail={t('verifiedEmployers')} />
      </section>

      <section className="advanced-chart-grid">
        <article className="advanced-panel wide">
          <div className="section-heading">
            <p className="eyebrow">{t('engagementTrend')}</p>
            <h2>{t('marketIntelligence')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={market.trends}>
              <defs>
                <linearGradient id="advanced-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006a62" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#006a62" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="advanced-apps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00446e" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#00446e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.12)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="#006a62" strokeWidth={3} fill="url(#advanced-views)" />
              <Area type="monotone" dataKey="applications" stroke="#00446e" strokeWidth={3} fill="url(#advanced-apps)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="advanced-panel">
          <div className="section-heading">
            <p className="eyebrow">{t('topDemandSkills')}</p>
            <h2>{t('skills')}</h2>
          </div>
          <div className="skill-demand-list">
            {market.topSkills.slice(0, 6).map((item) => (
              <ProgressRow key={item.skill} label={item.skill} value={item.jobCount} max={market.topSkills[0]?.jobCount ?? 1} />
            ))}
          </div>
        </article>
      </section>

      <section className="advanced-chart-grid">
        <article className="advanced-panel">
          <div className="section-heading">
            <p className="eyebrow">{t('salaryDistribution')}</p>
            <h2>{t('salary')}</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salaryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.1)" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="jobs" fill="#006a62" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="advanced-panel wide">
          <div className="section-heading">
            <p className="eyebrow">{t('roleAnalytics')}</p>
            <h2>{role === 'candidate' ? t('candidate') : t('recruiter')}</h2>
          </div>
          {role === 'candidate' ? (
            <CandidateAdvancedPanel data={candidate.overview} trends={candidate.trends} />
          ) : (
            <RecruiterAdvancedPanel data={recruiter.overview} trends={recruiter.trends} />
          )}
        </article>
      </section>
    </div>
  );
}

function CandidateAdvancedPanel({ data, trends }: { data: CandidateAnalyticsOverview; trends: AdvancedTrendPoint[] }) {
  const { t } = useLanguage();
  return (
    <div className="role-analytics-layout">
      <div className="role-kpi-grid">
        <StatCard label={t('profileCompleteness')} value={`${data.profileCompleteness}%`} detail={`${data.cvCount} CV`} />
        <StatCard label={t('scoringDoneCv')} value={data.scoringDoneCvCount} detail={`${data.totalMatches} ${t('matchings')}`} />
        <StatCard label={t('averageScore')} value={`${Math.round(data.averageMatchScore)}%`} detail={`${t('bestScore')}: ${Math.round(data.bestMatchScore)}%`} />
      </div>
      <div className="role-detail-grid">
        <div>
          <h3>{t('profileGaps')}</h3>
          <div className="skill-demand-list compact">
            {data.profileGaps.slice(0, 5).map((item) => (
              <ProgressRow key={item.skill} label={item.skill} value={item.marketDemand} max={data.profileGaps[0]?.marketDemand ?? 1} />
            ))}
          </div>
        </div>
        <div>
          <h3>{t('engagementTrend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.1)" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="matches" stroke="#006a62" strokeWidth={3} fill="rgba(0,106,98,.14)" />
              <Area type="monotone" dataKey="applications" stroke="#00446e" strokeWidth={3} fill="rgba(0,68,110,.12)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RecruiterAdvancedPanel({ data, trends }: { data: RecruiterAnalyticsOverview; trends: AdvancedTrendPoint[] }) {
  const { t } = useLanguage();
  return (
    <div className="role-analytics-layout">
      <div className="role-kpi-grid">
        <StatCard label={t('activeJobs')} value={data.activeJobs} detail={`${data.totalJobs} ${t('jobs')}`} />
        <StatCard label={t('applicants')} value={data.totalApplicants} detail={`${data.pendingReview} ${t('pendingApprovals')}`} />
        <StatCard label={t('averageScore')} value={`${Math.round(data.averageMatchScore)}%`} detail={`${data.highMatchings} ${t('highMatches')}`} />
      </div>
      <div className="role-detail-grid">
        <div>
          <h3>{t('topPerformingJobs')}</h3>
          <div className="advanced-job-list">
            {data.topJobs.slice(0, 4).map((job) => (
              <article key={job.jobId}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.status} · {job.applications} {t('applications')}</span>
                </div>
                <b>{Math.round(job.avgMatchScore)}%</b>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h3>{t('engagementTrend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.1)" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="#006a62" strokeWidth={3} fill="rgba(0,106,98,.14)" />
              <Area type="monotone" dataKey="matches" stroke="#00446e" strokeWidth={3} fill="rgba(0,68,110,.12)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max }: { label: string; value: number; max: number }) {
  const { language } = useLanguage();
  const width = max <= 0 ? 0 : Math.max(8, Math.min(100, (value / max) * 100));
  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</strong>
      </div>
      <i>
        <b style={{ width: `${width}%` }} />
      </i>
    </div>
  );
}

function RefineSearchPanelUnused() {
  const { t } = useLanguage();
  return (
    <aside className="filter-panel">
      <p className="eyebrow">{t('refineSearch')}</p>
      <label>
        {t('specialization')}
        <select defaultValue="Frontend Engineering">
          <option>Frontend Engineering</option>
          <option>Fullstack TypeScript</option>
          <option>UI Platform</option>
        </select>
      </label>
      <label>
        {t('scoreConfidence')}
        <input type="range" min="60" max="100" defaultValue="88" />
      </label>
      <label>
        {t('workingModel')}
        <select defaultValue="Hybrid">
          <option value="Hybrid">{t('hybrid')}</option>
          <option value="Remote">{t('remote')}</option>
          <option value="Onsite">{t('onsite')}</option>
        </select>
      </label>
      <ReasonChips reasons={['React', 'TypeScript', 'Design System']} />
    </aside>
  );
}

function TopEmployers() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { data: employers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['featured-employers'],
    queryFn: careerfitApi.getFeaturedEmployers,
    staleTime: 5 * 60_000,
  });

  return (
    <section className="top-employers">
      <div className="inline-heading">
        <h3>{t('featuredEmployers')}</h3>
        <div className="employer-controls" aria-hidden="true">
          <span>‹</span>
          <span>›</span>
        </div>
      </div>
      <div className="employer-strip">
        {isLoading ? <p>{language === 'vi' ? 'Đang tải nhà tuyển dụng...' : 'Loading employers...'}</p> : null}
        {isError ? (
          <div className="employer-load-error" role="alert">
            <span>{language === 'vi' ? 'Không thể tải nhà tuyển dụng nổi bật.' : 'Could not load featured employers.'}</span>
            <button type="button" onClick={() => void refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
          </div>
        ) : null}
        {employers.map((employer) => (
          <button className="employer-card" key={employer.id} onClick={() => navigate(`/candidate/employers/${employer.slug}`)} title={employer.companyName} aria-label={employer.companyName}>
            <span className="employer-mark">
              {employer.logoUrl ? <img src={employer.logoUrl} alt="" /> : employerInitials(employer)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function employerInitials(employer: Pick<EmployerDetailDto, 'companyName'>) {
  return employer.companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CF';
}

function MatchingEdgeCaseNotice({
  type,
  jobs: affectedJobs,
  onPrimary,
  onSecondary,
  onTertiary,
}: {
  type: 'low';
  jobs: Job[];
  onPrimary: () => void;
  onSecondary: () => void;
  onTertiary: () => void;
}) {
  const { t } = useLanguage();
  const topReasons = affectedJobs.slice(0, 3).flatMap(getLowMatchReasonKeys).slice(0, 4).map((key) => t(key));

  return (
    <section className={`matching-edge-notice ${type}`}>
      <div>
        <p className="eyebrow">{t('matchQuality')}</p>
        <h3>{t('lowMatchOnlyTitle')}</h3>
        <p>{t('lowMatchOnlyCopy')}</p>
        <ReasonChips reasons={topReasons.length ? topReasons : [t('missingSkills'), t('locationMismatch'), t('seniorityMismatch')]} />
      </div>
      <div className="edge-actions">
        <button className="primary-action" onClick={onPrimary}>{t('improveCv')}</button>
        <button onClick={onSecondary}>{t('relaxPreferences')}</button>
        <button onClick={onTertiary}>{t('showBroaderJobs')}</button>
      </div>
    </section>
  );
}

function TieBreakNote({ job }: { job: Job }) {
  const { language, t } = useLanguage();
  return (
    <div className="tie-break-note">
      <Sparkles size={15} />
      <span>{job.tieBreakReason ?? t('stableRankingApplied')}</span>
      <small>
        {job.skillOverlapCount ? `${job.skillOverlapCount} ${t('skills')}` : `${job.requiredSkills.length} ${t('skills')}`}
        {' · '}
        {localizeUiMetadata(job.jobFreshness ?? job.postedAt, language)}
        {' · '}
        {job.salaryFit ?? t('salary')}
        {' · '}
        {job.locationFit ? localizeUiMetadata(job.locationFit, language) : t('location')}
      </small>
    </div>
  );
}

function JobListWithPreview({
  jobs: list,
  isLoading = false,
  onOpen,
  onSkip,
  onApply,
  showMatchMeta = true,
  scoreCounts,
  emptyTitle,
  emptyCopy,
  emptyActions,
}: {
  jobs: Job[];
  isLoading?: boolean;
  onOpen: (job: Job) => void;
  onSkip?: (id: string, options?: { feedbackSaved?: boolean }) => void;
  onApply?: (job: Job) => void;
  showMatchMeta?: boolean;
  scoreCounts?: Map<number, number>;
  emptyTitle?: string;
  emptyCopy?: string;
  emptyActions?: ReactNode;
}) {
  const { t } = useLanguage();
  const [hoveredJob, setHoveredJob] = useState<Job | null>(null);
  const hoverTimer = useRef<number | null>(null);

  function schedulePreview(job: Job) {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
    }
    hoverTimer.current = window.setTimeout(() => setHoveredJob(job), 420);
  }

  function closePreview() {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
    }
    setHoveredJob(null);
  }

  if (isLoading && list.length === 0) {
    return (
      <section className="job-list market-list">
        <JobListSkeleton />
      </section>
    );
  }

  if (list.length === 0) {
    return (
      <section className="empty-state">
        <h3>{emptyTitle ?? t('noMatchingJobs')}</h3>
        <p>{emptyCopy ?? t('noMatchingJobsCopy')}</p>
        {emptyActions}
      </section>
    );
  }

  return (
    <section className="job-list market-list">
      {list.map((job) => (
        <div
          className="job-hover-shell"
          key={job.id}
          onMouseEnter={() => schedulePreview(job)}
          onMouseLeave={closePreview}
        >
          <JobCard
            job={job}
            onOpen={onOpen}
            onSkip={onSkip}
            onApply={onApply}
            showMatchMeta={showMatchMeta}
            feedbackSlot={
              <>
                {(scoreCounts?.get(job.normalizedScore) ?? 0) > 1 ? <TieBreakNote job={job} /> : null}
                {showMatchMeta && job.matchingId ? (
                  <FeedbackBar
                    matchingId={job.matchingId}
                    initialFeedback={job.feedback}
                    onNotInterested={() => onSkip?.(job.id, { feedbackSaved: true })}
                  />
                ) : null}
              </>
            }
          />
          {hoveredJob?.id === job.id ? <JobHoverPreview job={job} onOpen={onOpen} onApply={onApply} /> : null}
        </div>
      ))}
    </section>
  );
}

function JobListSkeleton() {
  return (
    <div className="job-list-skeleton" aria-hidden="true">
      {[0, 1].map((item) => (
        <article className="job-card skeleton-card" key={item}>
          <div className="skeleton-card-head">
            <span className="skeleton avatar" />
            <div>
              <span className="skeleton line short" />
              <span className="skeleton line title" />
              <span className="skeleton line medium" />
            </div>
          </div>
          <span className="skeleton line full" />
          <span className="skeleton line wide" />
          <div className="skeleton-actions">
            <span className="skeleton pill" />
            <span className="skeleton pill" />
            <span className="skeleton pill" />
          </div>
        </article>
      ))}
    </div>
  );
}

function JobHoverPreview({ job, onOpen, onApply }: { job: Job; onOpen: (job: Job) => void; onApply?: (job: Job) => void }) {
  const { language, t } = useLanguage();
  return (
    <aside className="job-hover-preview">
      <div className="hover-company">
        <div className="company-logo">{job.company.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">{job.company}</p>
          <h3>{job.title}</h3>
        </div>
      </div>
      <div className="hover-meta-grid">
        <strong>{localizeUiMetadata(job.salary, language)}</strong>
        <span>{localizeUiMetadata(job.location, language)}</span>
        <span>{t('updatedToday')}</span>
        <span>{t('deadline')}: 15/06/2026</span>
      </div>
      <div className="hover-scroll-content">
        <section>
          <h4>{t('jobDescription')}</h4>
          <ul>
            <li>{job.description}</li>
            <li>{t('jdHoverResponsibilityOne')}</li>
            <li>{t('jdHoverResponsibilityTwo')}</li>
            <li>{t('jdHoverResponsibilityThree')}</li>
          </ul>
        </section>
        <section>
          <h4>{t('jobRequirements')}</h4>
          <ul>
            <li>{t('provenExperienceWith')} {job.requiredSkills.slice(0, 3).join(', ')}.</li>
            <li>{t('strongAnalytical')}</li>
            <li>{t('ownWorkflows')}</li>
            <li>{t('qualificationExperience')}</li>
          </ul>
        </section>
      </div>
      <div className="hover-actions">
        <button onClick={() => onApply?.(job)}>{t('apply')}</button>
        <button className="primary-action" onClick={() => onOpen(job)}>
          {t('viewDetail')}
        </button>
      </div>
    </aside>
  );
}

function FilterModal({
  filters,
  keyword,
  onApply,
  onReset,
  onClose,
}: {
  filters: JobFilters;
  keyword: string;
  onApply: (filters: JobFilters, keyword: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { language, t } = useLanguage();
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [draftFilters, setDraftFilters] = useState<JobFilters>(filters);

  function updateDraftFilter(key: JobFilterKey, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('filter')}>
      <section className="filter-modal">
        <div className="inline-heading">
          <div>
            <p className="eyebrow">{t('filter')}</p>
            <h2>{t('jobSearchConditions')}</h2>
          </div>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <div className="settings-grid">
          <label>
            {t('keyword')}
            <input value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} placeholder="React, TypeScript, UI Platform" />
          </label>
          <label>
            {t('location')}
            <select value={draftFilters.city} onChange={(event) => updateDraftFilter('city', event.target.value)}>
              {jobFilterOptions.city.map(([value, label]) => (
                <option value={value} key={value}>{value === 'all' ? t('allCities') : localizeFilterOption('city', value, label, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('seniority')}
            <select value={draftFilters.level} onChange={(event) => updateDraftFilter('level', event.target.value)}>
              {jobFilterOptions.level.map(([value, label]) => (
                <option value={value} key={value}>{localizeFilterOption('level', value, label, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('minimumScore')}
            <input type="range" min="60" max="100" defaultValue="85" />
          </label>
          <label>
            {t('salaryRange')}
            <select value={draftFilters.salary} onChange={(event) => updateDraftFilter('salary', event.target.value)}>
              {jobFilterOptions.salary.map(([value, label]) => (
                <option value={value} key={value}>{localizeFilterOption('salary', value, label, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('workingModel')}
            <select value={draftFilters.workModel} onChange={(event) => updateDraftFilter('workModel', event.target.value)}>
              {jobFilterOptions.workModel.map(([value, label]) => (
                <option value={value} key={value}>{localizeFilterOption('workModel', value, label, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('jobDomain')}
            <select value={draftFilters.domain} onChange={(event) => updateDraftFilter('domain', event.target.value)}>
              {jobFilterOptions.domain.map(([value, label]) => (
                <option value={value} key={value}>{localizeFilterOption('domain', value, label, language)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-modal-actions">
          <button onClick={onReset}>{t('reset')}</button>
          <button className="primary-action" onClick={() => onApply(draftFilters, draftKeyword)}>{t('applyFilters')}</button>
        </div>
      </section>
    </div>
  );
}

function LoginPromptModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const nextPath = `${location.pathname}${location.search}`;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('loginRequiredTitle')}>
      <section className="login-prompt-modal">
        <div>
          <p className="eyebrow">{t('loginRequiredEyebrow')}</p>
          <h2>{t('loginRequiredTitle')}</h2>
          <p>{t('applyLoginRequiredCopy')}</p>
        </div>
        <div className="filter-modal-actions">
          <button onClick={onClose}>{t('cancel')}</button>
          <button className="primary-action" onClick={() => navigate(`/login?next=${encodeURIComponent(nextPath)}`)}>
            <LogIn size={17} />
            {t('login')}
          </button>
        </div>
      </section>
    </div>
  );
}

function CandidateReviewModal({ candidate, onClose }: { candidate: RecruiterCandidateItem; onClose: () => void }) {
  const { t, language } = useLanguage();
  const portfolioLinks = candidate.portfolio?.links ?? [];
  const portfolioProjects = candidate.portfolio?.projects ?? [];
  const hasPortfolio = portfolioLinks.length > 0 || portfolioProjects.length > 0;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${t('viewCv')} ${candidate.name}`} onClick={onClose}>
      <section className="candidate-review-modal" onClick={(event) => event.stopPropagation()}>
        <div className="inline-heading">
          <div>
            <p className="eyebrow">{t('viewCv')}</p>
            <h2>{candidate.name}</h2>
          </div>
          <button onClick={onClose}>{t('close')}</button>
        </div>
        <dl className="candidate-review-facts">
          <div><dt>Email</dt><dd>{candidate.email ?? (language === 'vi' ? 'Chưa cung cấp' : 'Not provided')}</dd></div>
          <div><dt>{t('location')}</dt><dd>{candidate.location ?? (language === 'vi' ? 'Chưa cung cấp' : 'Not provided')}</dd></div>
          <div><dt>{t('experience')}</dt><dd>{candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} ${language === 'vi' ? 'năm' : 'years'}` : (language === 'vi' ? 'Chưa cung cấp' : 'Not provided')}</dd></div>
          <div><dt>{t('matchScore')}</dt><dd>{candidate.score}%</dd></div>
        </dl>
        <div>
          <h3>{t('technicalSkills')}</h3>
          <ReasonChips reasons={candidate.topSkills?.length ? candidate.topSkills : [language === 'vi' ? 'Chưa có dữ liệu kỹ năng' : 'No skill data']} />
        </div>
        <div>
          <h3>{language === 'vi' ? 'Tóm tắt CV' : 'CV summary'}</h3>
          <p>{candidate.cvSummary ?? (language === 'vi' ? 'CV chưa có phần tóm tắt.' : 'No CV summary available.')}</p>
        </div>
        {candidate.portfolioVisible ? (
          <div className="recruiter-portfolio-section">
            <h3>{language === 'vi' ? 'Portfolio ứng viên' : 'Candidate portfolio'}</h3>
            {!hasPortfolio ? <p>{language === 'vi' ? 'Ứng viên chưa thêm link hoặc dự án portfolio.' : 'The candidate has not added portfolio links or projects yet.'}</p> : null}
            {portfolioLinks.length > 0 ? (
              <div className="recruiter-portfolio-links">
                {portfolioLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                    {link.type || (language === 'vi' ? 'Liên kết' : 'Link')}
                  </a>
                ))}
              </div>
            ) : null}
            {portfolioProjects.length > 0 ? (
              <div className="recruiter-portfolio-projects">
                {portfolioProjects.map((project) => (
                  <article key={project.id}>
                    <strong>{project.name}</strong>
                    {project.role ? <span>{project.role}</span> : null}
                    {project.summary ? <p>{project.summary}</p> : null}
                    {project.techStack?.length ? <ReasonChips reasons={project.techStack.slice(0, 6)} /> : null}
                    {project.projectUrl ? <a href={project.projectUrl} target="_blank" rel="noreferrer">{language === 'vi' ? 'Mở dự án' : 'Open project'}</a> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : candidate.hasApplied && candidate.portfolioHiddenReason ? (
          <div className="recruiter-portfolio-hidden">
            {language === 'vi' ? 'Ứng viên đang ẩn portfolio cho nhà tuyển dụng.' : 'The candidate has hidden portfolio details from recruiters.'}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function readableError(error: unknown, fallback: string, language: 'vi' | 'en') {
  if (language === 'vi') return fallback;
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatApplicationStatus(status: string, language: 'vi' | 'en') {
  if (language === 'en') return status;
  const labels: Record<string, string> = {
    Applied: 'Đã ứng tuyển',
    Invited: 'Đã được mời',
    'Auto-applied': 'AutoFit đã ứng tuyển',
    Reviewing: 'Đang xem xét',
    Withdrawn: 'Đã rút đơn',
    Rejected: 'Đã từ chối',
  };
  return labels[status] ?? status;
}

function formatApplicationTimestamp(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  if (value.startsWith('Today')) return value.replace('Today', 'Hôm nay');
  if (value === 'Yesterday') return 'Hôm qua';
  const monthMatch = value.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!monthMatch) return value;
  const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  return `${monthMatch[2]}/${months[monthMatch[1]] ?? monthMatch[1]}`;
}

function formatAutomationReason(reason: string, language: 'vi' | 'en') {
  if (language === 'en') return reason.replace(/_/g, ' ').toLowerCase();
  const labels: Record<string, string> = {
    CREATED_APPLICATIONS: 'đã tạo đơn ứng tuyển',
    NO_ELIGIBLE_MATCHES: 'không có kết quả đủ điều kiện',
    AUTO_APPLY_DISABLED: 'tự động ứng tuyển đang tắt',
  };
  return labels[reason] ?? reason.replace(/_/g, ' ').toLowerCase();
}

function localizeUiMetadata(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  return value
    .replace(/Ho Chi Minh City/gi, 'TP. Hồ Chí Minh')
    .replace(/Ha Noi/gi, 'Hà Nội')
    .replace(/Remote Vietnam/gi, 'Từ xa tại Việt Nam')
    .replace(/\bHybrid\b/gi, 'Kết hợp')
    .replace(/\bRemote\b/gi, 'Từ xa')
    .replace(/\bOnsite\b/gi, 'Tại văn phòng')
    .replace(/\bMid-Senior\b/gi, 'Trung - cao cấp')
    .replace(/\bSenior\b/gi, 'Cao cấp')
    .replace(/\bLead\b/gi, 'Trưởng nhóm')
    .replace(/\bVietnamese\b/gi, 'Tiếng Việt')
    .replace(/\bEnglish\b/gi, 'Tiếng Anh')
    .replace(/Unknown Location/gi, 'Chưa xác định địa điểm')
    .replace(/^UNKNOWN$/gi, 'Chưa xác định')
    .replace(/\bNegotiable\b/gi, 'Thỏa thuận')
    .replace(/^(\d+)h ago$/i, '$1 giờ trước')
    .replace(/^(\d+)d ago$/i, '$1 ngày trước');
}

function SearchSuggestions({
  suggestions,
  onPick,
}: {
  suggestions: Array<{ group: string; items: string[] }>;
  onPick: (value: string) => void;
}) {
  const { t } = useLanguage();

  if (!suggestions.some((group) => group.items.length > 0)) {
    return null;
  }

  return (
    <div className="search-suggestions">
      {suggestions.map((group) =>
        group.items.length > 0 ? (
          <section key={group.group}>
            <p>{t(group.group)}</p>
            {group.items.map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onPick(item);
                }}
              >
                {item}
              </button>
            ))}
          </section>
        ) : null,
      )}
    </div>
  );
}

function JobDetailContent({ job, showMatchMeta = true, onApply }: { job: Job; showMatchMeta?: boolean; onApply?: () => void }) {
  const { language, t } = useLanguage();

  return (
    <article className="jd-detail-page">
      <section className="jd-detail-hero">
        <div className="company-logo large">{job.company.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">{job.company}</p>
          <h1>{job.title}</h1>
          <p>{localizeUiMetadata(job.location, language)} · {localizeUiMetadata(job.seniority, language)} · {localizeUiMetadata(job.language, language)}</p>
        </div>
        {showMatchMeta ? <MatchingBadge score={job.normalizedScore} label={job.label} /> : null}
      </section>

      <section className="jd-summary-grid">
        <div>
          <span>{t('salary')}</span>
          <strong>{localizeUiMetadata(job.salary, language)}</strong>
        </div>
        <div>
          <span>{t('updated')}</span>
          <strong>15/05/2026</strong>
        </div>
        <div>
          <span>{t('deadline')}</span>
          <strong>15/06/2026</strong>
        </div>
        {showMatchMeta ? (
          <div>
            <span>{t('matchStatus')}</span>
            <strong>{job.isPotential ? t('potential') : t('highConfidence')}</strong>
          </div>
        ) : null}
      </section>

      <section className="jd-content-grid">
        <div className="jd-main-content">
          <h2>{t('jobDescription')}</h2>
          <p>{job.description}</p>
          <ul>
            <li>{t('jdDetailTaskOne')}</li>
            <li>{t('jdDetailTaskTwo')}</li>
            <li>{t('jdDetailTaskThree')}</li>
            <li>{t('jdDetailTaskFour')}</li>
          </ul>
          <h2>{t('jobRequirements')}</h2>
          <ReasonChips reasons={job.requiredSkills} />
          <p>{t('jdRequirementCopy')}</p>
          <h2>{t('benefits')}</h2>
          <ul>
            <li>{t('benefitOne')}</li>
            <li>{t('benefitTwo')}</li>
            <li>{t('benefitThree')}</li>
          </ul>
        </div>
        <aside className="jd-side-content">
          <button className="primary-action full" onClick={onApply}>{t('apply')}</button>
          {showMatchMeta && job.matchingId ? (
            <FeedbackBar matchingId={job.matchingId} initialFeedback={job.feedback} />
          ) : null}
          {showMatchMeta ? (
            <>
              <h3>{t('whyThisMatches')}</h3>
              <ReasonChips reasons={job.reasons} />
            </>
          ) : null}
          <h3>{t('optionalSkills')}</h3>
          <ReasonChips reasons={job.optionalSkills} />
          <h3>{t('applicationState')}</h3>
          <p>{t('applicationStateCopy')}</p>
        </aside>
      </section>
    </article>
  );
}

function StickyApplyBar({ onApply, onSimilar }: { onApply?: () => void; onSimilar?: () => void }) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  return (
    <div className="sticky-apply-bar">
      <button className="bolt-action" aria-label="AutoFit" onClick={() => navigate('/candidate/automation')}>
        <Zap size={22} />
      </button>
      <button disabled title={language === 'vi' ? 'Backend chưa hỗ trợ lưu việc làm.' : 'Saving jobs is not supported by the backend yet.'}>
        <Bookmark size={17} />
        {t('save')}
      </button>
      <button onClick={onSimilar}>
        <Mail size={17} />
        {t('similarJobs')}
      </button>
      <button disabled title={language === 'vi' ? 'Backend chưa hỗ trợ báo cáo việc làm.' : 'Reporting jobs is not supported by the backend yet.'}>
        <Flag size={17} />
        {t('report')}
      </button>
      <button className="primary-apply" onClick={onApply}>{t('apply').toUpperCase()}</button>
    </div>
  );
}

function AutomationConfirmPage() {
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const token = searchParams.get('token');

  function continueToBackend() {
    if (!token) return;
    window.location.assign(`/api/email-action/redeem?token=${encodeURIComponent(token)}`);
  }

  return (
    <main className="confirm-page">
      <section className="confirm-card">
        <p className="eyebrow">{t('confirmTitle')}</p>
        <h1>{token ? (language === 'vi' ? 'Tiếp tục xác nhận trên backend' : 'Continue to backend confirmation') : (language === 'vi' ? 'Thiếu token xác nhận' : 'Confirmation token is missing')}</h1>
        <p>{token
          ? (language === 'vi' ? 'Backend sẽ kiểm tra thời hạn và trạng thái token trước khi cho phép thực hiện hành động.' : 'The backend will validate token expiry and state before executing the action.')
          : (language === 'vi' ? 'Liên kết không hợp lệ. Hãy mở lại liên kết đầy đủ từ email.' : 'This link is invalid. Open the complete link from the email.')}</p>
        <button className="primary-action" disabled={!token} onClick={continueToBackend}>
          <CheckCircle2 size={16} />
          {t('confirm')}
        </button>
      </section>
    </main>
  );
}

function AutomationResultPage() {
  const { t } = useLanguage();
  return (
    <main className="confirm-page">
      <section className="confirm-card result">
        <CheckCircle2 size={44} />
        <p className="eyebrow">{t('resultTitle')}</p>
        <h1>{t('actionProcessed')}</h1>
        <p>{t('actionProcessedCopy')}</p>
      </section>
    </main>
  );
}

function SearchHero({
  eyebrow,
  title,
  copy,
  placeholder,
  actionLabel,
  centered = false,
  value,
  onChange,
  onFilter,
  onSearch,
  suggestions = [],
  variant = 'signed',
}: {
  eyebrow: string;
  title: string;
  copy: string;
  placeholder: string;
  actionLabel: string;
  centered?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFilter?: () => void;
  onSearch?: () => void;
  suggestions?: Array<{ group: string; items: string[] }>;
  variant?: 'guest' | 'signed';
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { t } = useLanguage();

  return (
    <section className={`${centered ? 'portal-hero centered' : 'portal-hero'} ${variant === 'guest' ? 'guest-hero' : 'signed-hero'}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <label className="hero-search">
        <Search size={18} />
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              setIsSearchFocused(false);
              onSearch?.();
            }
          }}
          placeholder={placeholder}
        />
        {onFilter ? (
          <button type="button" onClick={onFilter}>
            <SlidersHorizontal size={16} />
            {t('filter')}
          </button>
        ) : null}
        <button
          type="button"
          className="primary-action"
          onClick={() => {
            setIsSearchFocused(false);
            onSearch?.();
          }}
        >
          {actionLabel}
        </button>
        {isSearchFocused ? <SearchSuggestions suggestions={suggestions} onPick={(nextValue) => onChange?.(nextValue)} /> : null}
      </label>
    </section>
  );
}

function JobMarketDashboard() {
  const { language, t } = useLanguage();
  const [demandMode, setDemandMode] = useState<'job' | 'salary'>('job');
  const statsQuery = useQuery({ queryKey: ['market-stats'], queryFn: careerfitApi.getMarketStats });
  const trendQuery = useQuery({ queryKey: ['market-trend', 7], queryFn: () => careerfitApi.getMarketTrend(7) });
  const rolesQuery = useQuery({ queryKey: ['market-roles', 6], queryFn: () => careerfitApi.getMarketRoles(6) });
  const salaryQuery = useQuery({ queryKey: ['market-salary'], queryFn: careerfitApi.getAdvancedMarketSalary });
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const colors = ['#20d488', '#3f8cff', '#f49a20', '#21d8d0', '#ffd51f', '#72f8e8'];
  const jobPostingTrend = (trendQuery.data ?? []).map((point) => ({
    day: new Date(`${point.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' }),
    postings: point.activeJobs,
  }));
  const itDemandData = Object.entries(rolesQuery.data ?? {}).map(([label, value], index) => ({
    label,
    value: Number(value),
    color: colors[index % colors.length],
  }));
  const salaryDemandData = (salaryQuery.data ?? []).slice(0, 6).map((bucket, index) => ({
    label: `${bucket.seniority || (language === 'vi' ? 'Không rõ' : 'Unspecified')} · ${bucket.currency}`,
    value: bucket.jobCount,
    color: colors[index % colors.length],
  }));
  const activeDemandData = demandMode === 'job' ? itDemandData : salaryDemandData;
  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading || trendQuery.isLoading || rolesQuery.isLoading || salaryQuery.isLoading;
  const hasError = statsQuery.isError || trendQuery.isError || rolesQuery.isError || salaryQuery.isError;
  const number = (value?: number) => Number(value ?? 0).toLocaleString(locale);

  function retryMarketData() {
    void Promise.all([statsQuery.refetch(), trendQuery.refetch(), rolesQuery.refetch(), salaryQuery.refetch()]);
  }
  return (
    <section className="market-dashboard">
      <div className="market-dashboard-heading">
        <h2>
          {t('marketToday')} <span>{new Date().toLocaleDateString(locale)}</span>
        </h2>
      </div>

      <div className="market-stats-row">
        <StatCard label={t('newJobs24h')} value={isLoading ? '...' : number(stats?.newJobsToday)} detail={t('itRolesRefreshed')} />
        <StatCard label={t('openJobs')} value={isLoading ? '...' : number(stats?.activeJobs)} detail={`${number(stats?.totalJobs)} ${language === 'vi' ? 'việc làm đã đăng' : 'jobs posted'}`} />
        <StatCard label={t('companiesHiring')} value={isLoading ? '...' : number(stats?.employers)} detail={t('verifiedEmployers')} />
      </div>

      {hasError ? (
        <div className="market-query-state market-query-error" role="alert">
          <span>{language === 'vi' ? 'Không thể tải đầy đủ dữ liệu thị trường việc làm.' : 'The job market data could not be fully loaded.'}</span>
          <button type="button" onClick={retryMarketData}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
        </div>
      ) : null}

      {isLoading ? <div className="market-query-state">{language === 'vi' ? 'Đang đồng bộ số liệu thị trường...' : 'Loading live market data...'}</div> : null}

      <div className="market-chart-grid">
        <section className="market-chart-card">
          <div className="market-chart-title">
            <span className="trend-dot">↗</span>
            <h3>{t('jobGrowth')}</h3>
          </div>
          {!isLoading && jobPostingTrend.length === 0 ? (
            <div className="market-chart-empty">{language === 'vi' ? 'Chưa có dữ liệu xu hướng cho khoảng thời gian này.' : 'No trend data is available for this period.'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={jobPostingTrend}>
              <defs>
                <linearGradient id="market-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20d488" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#20d488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,.14)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,.82)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,.82)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<MarketLineTooltip />} cursor={{ stroke: 'rgba(255,255,255,.65)' }} />
              <Area type="monotone" dataKey="postings" stroke="#20d488" strokeWidth={4} fill="url(#market-growth)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="market-chart-card">
          <div className="market-chart-title">
            <span className="trend-dot">↗</span>
            <h3>{t('demandBy')}</h3>
            <select value={demandMode} onChange={(event) => setDemandMode(event.target.value as 'job' | 'salary')}>
              <option value="job">{t('industryOption')}</option>
              <option value="salary">{t('salaryOption')}</option>
            </select>
          </div>
          <div className="bar-chart-wrap">
            {!isLoading && activeDemandData.length === 0 ? (
              <div className="market-chart-empty">{language === 'vi' ? 'Chưa có dữ liệu phân bổ cho lựa chọn này.' : 'No distribution data is available for this selection.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={activeDemandData}>
                <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,.14)" />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.82)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,.82)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<MarketBarTooltip />} cursor={{ fill: 'rgba(255,255,255,.06)' }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {activeDemandData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="market-legend">
            {activeDemandData.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MarketLineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  const { t, language } = useLanguage();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="market-bar-tooltip">
      <span>{label}</span>
      <strong>{Number(payload[0].value ?? 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} {t('postedJobs')}</strong>
    </div>
  );
}

function MarketBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  const { t, language } = useLanguage();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="market-bar-tooltip">
      <span>{label}</span>
      <strong>{Number(payload[0].value ?? 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} {t('jobs')}</strong>
    </div>
  );
}

function useFilteredJobs(sourceJobs: Job[], query: string) {
  return useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sourceJobs;
    return sourceJobs.filter((job) =>
      [
        job.title,
        job.company,
        job.location,
        job.seniority,
        job.language,
        ...job.requiredSkills,
        ...job.optionalSkills,
        ...job.reasons,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [sourceJobs, query]);
}

function applyJobFilters(sourceJobs: Job[], filters: JobFilters) {
  return sourceJobs.filter((job) => {
    const haystack = [
      job.title,
      job.company,
      job.location,
      job.seniority,
      job.salary,
      ...job.requiredSkills,
      ...job.optionalSkills,
    ].join(' ').toLowerCase();

    if (filters.city === 'hcm' && !job.location.toLowerCase().includes('ho chi minh')) return false;
    if (filters.city === 'hanoi' && !job.location.toLowerCase().includes('ha noi')) return false;
    if (filters.city === 'remote' && !job.location.toLowerCase().includes('remote')) return false;
    if (filters.level !== 'all' && !job.seniority.toLowerCase().includes(filters.level)) return false;
    if (filters.workModel === 'hybrid' && !job.location.toLowerCase().includes('hybrid')) return false;
    if (filters.workModel === 'remote' && !job.location.toLowerCase().includes('remote')) return false;
    if (filters.workModel === 'onsite' && (job.location.toLowerCase().includes('remote') || job.location.toLowerCase().includes('hybrid'))) return false;
    if (filters.salary === 'negotiable' && !job.salary.toLowerCase().includes('thỏa thuận') && !job.salary.toLowerCase().includes('negotiable')) return false;
    if (['2500', '3000', '4000'].includes(filters.salary) && getSalaryMax(job.salary) < Number(filters.salary)) return false;
    if (filters.domain !== 'all') {
      const domainNeedle = filters.domain === 'data-ai' ? 'data' : filters.domain === 'qa' ? 'test' : filters.domain;
      if (!haystack.includes(domainNeedle)) return false;
    }
    return true;
  });
}

function sortJobsStable(sourceJobs: Job[]) {
  const labelPriority: Record<Job['label'], number> = {
    High: 4,
    Potential: 3,
    Medium: 2,
    Low: 1,
  };
  return [...sourceJobs].sort((a, b) => {
    const scoreDiff = b.normalizedScore - a.normalizedScore;
    if (scoreDiff !== 0) return scoreDiff;
    const labelDiff = labelPriority[b.label] - labelPriority[a.label];
    if (labelDiff !== 0) return labelDiff;
    return a.title.localeCompare(b.title) || a.company.localeCompare(b.company);
  });
}

function getScoreCounts(sourceJobs: Job[]) {
  const counts = new Map<number, number>();
  sourceJobs.forEach((job) => counts.set(job.normalizedScore, (counts.get(job.normalizedScore) ?? 0) + 1));
  return counts;
}

function isLowMatchJob(job: Job) {
  return job.label === 'Low' || job.normalizedScore < 70;
}

function getLowMatchReasonKeys(job: Job) {
  const reasons: string[] = [];
  if (!job.requiredSkills.some((skill) => preference.skills.includes(skill))) {
    reasons.push('missingSkills');
  }
  if (!job.location.toLowerCase().includes('ho chi minh') && !job.location.toLowerCase().includes('remote')) {
    reasons.push('locationMismatch');
  }
  if (!job.seniority.toLowerCase().includes('senior')) {
    reasons.push('seniorityMismatch');
  }
  return reasons;
}

function getSalaryMax(salary: string) {
  const numbers = salary.match(/\d[\d,.]*/g)?.map((item) => Number(item.replace(/,/g, ''))) ?? [];
  return numbers.length ? Math.max(...numbers) : 0;
}

function useSearchSuggestions(query: string) {
  const { data } = useQuery({
    queryKey: ['job-search-suggestions', query],
    enabled: query.trim().length > 0,
    queryFn: () => careerfitApi.getSearchSuggestions(query),
    staleTime: 60_000,
    retry: false,
  });

  return data ?? [];
}

function useJobs({ isPublic, keyword = '', enabled = true }: { isPublic: boolean; keyword?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: [isPublic ? 'public-jobs' : 'candidate-jobs', keyword],
    enabled,
    queryFn: () => isPublic ? careerfitApi.searchJobs(keyword) : careerfitApi.getCandidateJobs(),
    refetchInterval: 60_000,
    retry: 1,
  });
}

function useJobDetail(jobId: string | undefined, isPublic: boolean) {
  return useQuery({
    queryKey: ['job-detail', jobId, isPublic ? 'public' : 'candidate'],
    enabled: Boolean(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job id is required');
      const [publicJob, candidateJobs] = await Promise.all([
        careerfitApi.getJob(jobId),
        isPublic ? Promise.resolve([]) : careerfitApi.getCandidateJobs(),
      ]);
      const personalizedJob = candidateJobs.find((item) => item.id === jobId);
      return personalizedJob
        ? {
            ...publicJob,
            normalizedScore: personalizedJob.normalizedScore,
            label: personalizedJob.label,
            isPotential: personalizedJob.isPotential,
            reasons: personalizedJob.reasons,
            matchingId: personalizedJob.matchingId,
            feedback: personalizedJob.feedback,
          }
        : publicJob;
    },
  });
}

function useRecruiterSummary() {
  return useQuery({
    queryKey: ['recruiter-summary'],
    queryFn: () => careerfitApi.getRecruiterDashboard(),
    refetchInterval: 60_000,
  });
}

function useRecruiterJobs() {
  return useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: () => careerfitApi.getRecruiterJobs(),
    refetchInterval: 60_000,
  });
}

function useAdvancedMarketAnalytics(rangeDays: number) {
  const overview = useQuery({
    queryKey: ['advanced-market-overview', rangeDays],
    queryFn: () => careerfitApi.getAdvancedMarketOverview(rangeDays),
    refetchInterval: 60_000,
  });
  const skills = useQuery({
    queryKey: ['advanced-market-skills'],
    queryFn: () => careerfitApi.getAdvancedMarketSkills(12),
  });
  const salary = useQuery({
    queryKey: ['advanced-market-salary'],
    queryFn: () => careerfitApi.getAdvancedMarketSalary(),
  });
  const trends = useQuery({
    queryKey: ['advanced-market-trends', rangeDays],
    queryFn: () => careerfitApi.getAdvancedMarketTrends(rangeDays),
  });

  return {
    ...(overview.data ?? emptyAdvancedMarket),
    topSkills: skills.data ?? overview.data?.topSkills ?? [],
    salaryDistribution: salary.data ?? overview.data?.salaryDistribution ?? [],
    trends: trends.data ?? emptyAdvancedTrends,
  };
}

function useCandidateAdvancedAnalytics(enabled: boolean, rangeDays: number) {
  const overview = useQuery({
    queryKey: ['candidate-advanced-overview'],
    enabled,
    queryFn: () => careerfitApi.getCandidateAdvancedOverview(),
    refetchInterval: 60_000,
  });
  const trends = useQuery({
    queryKey: ['candidate-advanced-trends', rangeDays],
    enabled,
    queryFn: () => careerfitApi.getCandidateAdvancedTrends(rangeDays),
  });

  return {
    overview: overview.data ?? emptyCandidateAnalytics,
    trends: trends.data ?? emptyAdvancedTrends,
  };
}

function useRecruiterAdvancedAnalytics(enabled: boolean, rangeDays: number) {
  const overview = useQuery({
    queryKey: ['recruiter-advanced-overview', rangeDays],
    enabled,
    queryFn: () => careerfitApi.getRecruiterAdvancedOverview(rangeDays),
    refetchInterval: 60_000,
  });
  const trends = useQuery({
    queryKey: ['recruiter-advanced-trends', rangeDays],
    enabled,
    queryFn: () => careerfitApi.getRecruiterAdvancedTrends(rangeDays),
  });

  return {
    overview: overview.data ?? emptyRecruiterAnalytics,
    trends: trends.data ?? emptyAdvancedTrends,
  };
}
