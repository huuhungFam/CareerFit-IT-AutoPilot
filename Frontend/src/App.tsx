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
  KeyRound, RefreshCcw,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Moon,
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
  Sun,
  XCircle,
  Zap,
} from 'lucide-react';
import { AppShell } from './components/AppShell';
import { AutomationPolicyPanel } from './components/AutomationPolicyPanel';
import { JobAutocompleteInput } from './components/JobAutocompleteInput';
import { MatchingBadge, PotentialBadge, ReasonChips } from './components/Badges';
import { SkillAutocompleteInput } from './components/SkillAutocompleteInput';
import { JobCard } from './components/JobCard';
import { LoginRequiredModal } from './components/LoginRequiredModal';
import { ModalAccessibilityBoundary } from './components/ModalAccessibilityBoundary';
import { StatCard } from './components/StatCard';
import { ToastMessage as ActionMessage } from './components/ToastMessage';
import { useLanguage } from './i18n/LanguageProvider';
import { useTheme } from './theme/context';
import { parseJobDescription } from './lib/jobDescription';
import { AdminDashboardPage, AdminUsersPage, AdminJobsPage, AdminAuditLogsPage, AdminEmailMonitorPage } from './pages/AdminPages';
import { AdminReportsPage } from './pages/AdminReportsPage';
import {
  careerfitApi,
  type ContentReportSummary,
  type AdvancedMarketOverview,
  type AdvancedTrendPoint,
  type CandidateAnalyticsOverview,
  type CandidateCvDto,
  type CvStatus,
  type CvReviewIssueDto,
  type CandidateJobPage,
  type CandidateProfileDto,
  type CreateJobPayload,
  type EmployerDetailDto,
  type EmployerProfileUpsertPayload,
  type ManualCvPayload,
  type PortfolioLinkDto,
  type PortfolioLinkPayload,
  type PortfolioProjectDto,
  type PortfolioProjectPayload,
  type RecruiterAnalyticsOverview,
  type RecruiterJobFunnel,
  type RecruiterJobSkillGapItem,
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

const cvProcessingStatuses = new Set<CvStatus>(['UPLOADED', 'VALIDATING', 'PROCESSING']);

function isCvProcessingStatus(status?: CvStatus) {
  return status ? cvProcessingStatuses.has(status) : false;
}

function formatCvStatus(status: CvStatus | undefined, language: 'vi' | 'en') {
  if (!status) return language === 'vi' ? 'Đang cập nhật trạng thái' : 'Updating status';
  const labels: Record<CvStatus, [string, string]> = {
    UPLOADED: ['Đã tải lên', 'Uploaded'],
    VALIDATING: ['Đang kiểm tra', 'Validating'],
    REVIEW_REQUIRED: ['Cần xem lại', 'Review required'],
    DRAFT: ['Bản nháp', 'Draft'],
    PROCESSING: ['Đang xử lý', 'Processing'],
    SCORING_DONE: ['Đã chấm điểm', 'Scoring complete'],
    FAILED: ['Xử lý thất bại', 'Processing failed'],
    BANNED: ['Không thể sử dụng', 'Unavailable'],
  };
  return labels[status][language === 'vi' ? 0 : 1];
}

function hasRequiredEmployerProfile(employer?: EmployerDetailDto) {
  return Boolean(
    employer?.companyName?.trim()
    && employer.industry?.trim()
    && employer.companySize?.trim()
    && employer.location?.trim(),
  );
}

const employerIndustries = ['Phần mềm', 'Fintech', 'Thương mại điện tử', 'AI / Dữ liệu', 'Viễn thông', 'Gia công phần mềm', 'Công nghệ giáo dục', 'Công nghệ y tế'];
const employerCompanySizes = ['1-9 nhân viên', '10-49 nhân viên', '50-199 nhân viên', '200-499 nhân viên', '500-999 nhân viên', '1.000+ nhân viên'];

function EmployerProfileSuggestionLists() {
  return <>
    <datalist id="employer-industry-suggestions">{employerIndustries.map((industry) => <option key={industry} value={industry} />)}</datalist>
    <datalist id="employer-company-size-suggestions">{employerCompanySizes.map((size) => <option key={size} value={size} />)}</datalist>
  </>;
}

type JobFilterKey = keyof typeof jobFilterOptions;
type JobFilters = Record<JobFilterKey, string> & { minScore: number };
type CatalogSort = 'recent' | 'oldest' | 'popular' | 'urgent' | 'match_desc';
type UploadTab = 'parser' | 'manual';
type ProfileTab = 'cv' | 'profile' | 'portfolio';
type RecruiterSubview = 'ranking' | 'applicants';
type RecruiterMatchFilter = 'all' | 'HIGH' | 'POTENTIAL' | 'HIGH_OR_POTENTIAL' | 'APPLIED' | 'NOT_APPLIED';

const defaultJobFilters: JobFilters = {
  city: 'all',
  level: 'all',
  workModel: 'all',
  salary: 'all',
  domain: 'all',
  minScore: 0,
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
    // Salary is intentionally not part of the public catalog filter UI.
    salary: defaultJobFilters.salary,
    domain: isOptionValue('domain', searchParams.get('domain')) ? searchParams.get('domain')! : defaultJobFilters.domain,
    minScore: Math.min(100, Math.max(0, Number(searchParams.get('minScore')) || 0)),
  };
}

function getOptionLabel(key: JobFilterKey, value: string) {
  return jobFilterOptions[key].find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function getCatalogSort(searchParams: URLSearchParams): CatalogSort {
  const sort = searchParams.get('sort');
  return sort === 'oldest' || sort === 'popular' || sort === 'urgent' || sort === 'match_desc' ? sort : 'recent';
}

function getCatalogPage(searchParams: URLSearchParams) {
  const page = Number(searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function writeJobSearchParams(keyword: string, filters: JobFilters, sort: CatalogSort = 'recent', page = 1) {
  const params = new URLSearchParams();
  if (keyword.trim()) params.set('keyword', keyword.trim());
  (Object.keys(jobFilterOptions) as JobFilterKey[]).forEach((key) => {
    if (key === 'salary') return;
    if (filters[key] !== defaultJobFilters[key]) {
      params.set(key, filters[key]);
    }
  });
  if (filters.minScore > 0) params.set('minScore', String(filters.minScore));
  if (sort !== 'recent') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
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
  return 'ranking';
}

function getRecruiterJobsQuery(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const sort = searchParams.get('sort');
  const match = searchParams.get('match');
  return {
    q: searchParams.get('q') ?? '',
    status: status === 'active' || status === 'draft' || status === 'closed' || status === 'urgent' ? status : 'all',
    sort: sort === 'newest' || sort === 'applicants_desc' ? sort : 'newest',
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

  async function handleDeleteAccount() {
    await careerfitApi.deleteMyAccount();
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
    <>
      <ModalAccessibilityBoundary />
      <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} onRegister={handleRegister} />} />
      <Route path="/register" element={<LoginPage mode="register" onLogin={handleLogin} onRegister={handleRegister} />} />
      <Route path="/auth/magic-link/verify" element={<MagicLinkPage onAuthenticated={setAccount} />} />
      <Route path="/automation/confirm" element={<AutomationConfirmPage />} />
      <Route path="/automation/result" element={<AutomationResultPage />} />
      <Route element={<AppShell role={account?.role ?? 'guest'} />}>
        <Route index element={<CandidateHomePage isPublic />} />
        <Route path="/jobs" element={<CatalogJobsPage mode="guest" />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage isPublic={!account} />} />
        <Route path="/candidate" element={protectedRoute('candidate', <CandidateHomePage />)} />
        <Route path="/candidate/jobs" element={protectedRoute('candidate', <CatalogJobsPage mode="candidate" />)} />
        <Route path="/candidate/jobs/:jobId" element={protectedRoute('candidate', <JobDetailPage />)} />
        <Route path="/candidate/employers/:employerId" element={<EmployerDetailPage isPublic={!account} />} />
        <Route path="/candidate/upload" element={protectedRoute('candidate', <UploadPage />)} />
        <Route path="/candidate/profile" element={protectedRoute('candidate', <ProfilePage />)} />
        <Route path="/candidate/profile/cvs/:cvId/review" element={protectedRoute('candidate', <CvReviewPage />)} />
        <Route path="/candidate/recommendations" element={protectedRoute('candidate', <RecommendationsPage />)} />
        <Route path="/candidate/advanced-analytics" element={protectedRoute('candidate', <AdvancedAnalyticsPage role="candidate" />)} />
        <Route path="/candidate/applications" element={protectedRoute('candidate', <ApplicationsPage />)} />
        <Route path="/candidate/automation" element={protectedRoute('candidate', <AutomationPage />)} />
        <Route
          path="/candidate/settings"
          element={protectedRoute('candidate', <ConnectedSettingsPage role="candidate" onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />)}
        />
        <Route path="/recruiter" element={protectedRoute('recruiter', <RecruiterHomePage />)} />
        <Route path="/recruiter/company-setup" element={protectedRoute('recruiter', <RecruiterCompanySetupPage />)} />
        <Route path="/recruiter/jobs" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/ranking" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/applicants" element={protectedRoute('recruiter', <RecruiterJobsPage />)} />
        <Route path="/recruiter/jobs/:jobId/potential" element={protectedRoute('recruiter', <RecruiterPotentialRedirect />)} />
        <Route path="/recruiter/talent-pool" element={protectedRoute('recruiter', <RecruiterTalentPoolPage />)} />
        <Route path="/recruiter/analytics" element={protectedRoute('recruiter', <AnalyticsPage />)} />
        <Route path="/recruiter/advanced-analytics" element={protectedRoute('recruiter', <AdvancedAnalyticsPage role="recruiter" />)} />
        <Route path="/recruiter/automation" element={protectedRoute('recruiter', <Navigate to="/recruiter" replace />)} />
        <Route
          path="/recruiter/settings"
          element={protectedRoute('recruiter', <ConnectedSettingsPage role="recruiter" onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />)}
        />
        {/* Admin Routes */}
        <Route path="/admin" element={protectedRoute('admin', <AdminDashboardPage marketDashboard={<JobMarketDashboard />} />)} />
        <Route path="/admin/users" element={protectedRoute('admin', <AdminUsersPage />)} />
        <Route path="/admin/jobs" element={protectedRoute('admin', <AdminJobsPage />)} />
        <Route path="/admin/reports" element={protectedRoute('admin', <AdminReportsPage />)} />
        <Route path="/admin/audit-logs" element={protectedRoute('admin', <AdminAuditLogsPage />)} />
        <Route path="/admin/email-monitor" element={protectedRoute('admin', <AdminEmailMonitorPage />)} />
        <Route path="/admin/settings" element={protectedRoute('admin', <AdminSettingsPage onLogout={handleLogout} />)} />
      </Route>
      </Routes>
    </>
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

      navigate(mode === 'register' && account.role === 'recruiter'
        ? '/recruiter/company-setup'
        : resolvePostLoginPath(account, nextPath));
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
            placeholder={mode === 'register' ? '••••••••' : '12345678'}
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
        <button className="primary-action full" disabled={isSubmitting} type="submit">
          {mode === 'register' ? t('register') : t('signIn')}
        </button>
        {mode === 'login' ? <small>{t('testLoginHint')}</small> : null}
        {mode === 'login' ? <button className="secondary-action full guest-continue-action" type="button" onClick={() => navigate('/')}><Globe size={17} />{t('continueAsGuest')}</button> : null}
        <button className="auth-mode-link" type="button" onClick={() => navigate(mode === 'login' ? '/register' : '/login')}>
          {mode === 'login'
            ? (language === 'vi' ? 'Chưa có tài khoản? Đăng ký' : 'New to CareerFit? Register')
            : (language === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in')}
        </button>
      </form>
    </main>
  );
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
    } catch (requestError) {
      setVerifyError(readableError(requestError, language === 'vi' ? 'Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.' : 'This sign-in link is invalid or has expired.', language));
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
        <p>{language === 'vi' ? 'Kiểm tra liên kết bảo mật trước khi mở không gian làm việc.' : 'Verify this secure link before opening your workspace.'}</p>
      </section>
      <section className="auth-card magic-link-card">
        {inspection.isLoading ? <div className="magic-link-state"><Clock3 size={24} /><strong>{language === 'vi' ? 'Đang kiểm tra liên kết...' : 'Checking your link...'}</strong></div> : null}
        {invalidToken && !inspection.isLoading ? <><ActionMessage tone="error" text={language === 'vi' ? 'Liên kết không hợp lệ hoặc đã hết hạn.' : 'This sign-in link is invalid or has expired.'} /><button type="button" onClick={() => navigate('/login')}>{language === 'vi' ? 'Quay lại đăng nhập' : 'Back to sign in'}</button></> : null}
        {!inspection.isLoading && !invalidToken ? <><div className="magic-link-state"><ShieldCheck size={26} /><strong>{language === 'vi' ? 'Liên kết hợp lệ' : 'Link verified'}</strong></div><p>{inspection.data}</p>{verifyError ? <ActionMessage tone="error" text={verifyError} /> : null}<button className="primary-action full" type="button" disabled={isVerifying} onClick={() => void completeLogin()}><LogIn size={17} />{isVerifying ? (language === 'vi' ? 'Đang đăng nhập...' : 'Signing in...') : (language === 'vi' ? 'Tiếp tục đăng nhập' : 'Continue signing in')}</button></> : null}
      </section>
    </main>
  );
}

function resolvePostLoginPath(account: MockAccount, nextPath: string | null) {
  if (nextPath?.startsWith('/candidate') && account.role === 'candidate') return nextPath;
  if (nextPath?.startsWith('/recruiter') && account.role === 'recruiter') return nextPath;
  if (nextPath?.startsWith('/admin') && account.role === 'admin') return nextPath;

  return getRoleHomePath(account.role);
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
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const { data = [], isLoading: isJobsLoading } = useJobs({ isPublic });
  const urgentJobsQuery = useQuery({
    queryKey: ['dashboard-urgent-jobs', isPublic ? 'guest' : 'candidate'],
    queryFn: async () => {
      const page = isPublic
        ? await careerfitApi.getPublicJobCatalog({ sort: 'urgent', size: 6 })
        : await careerfitApi.getCandidateJobCatalog({ sort: 'urgent', size: 6 });
      return page.jobs.filter((job) => job.isUrgent);
    },
    retry: 1,
    refetchInterval: 60_000,
  });
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
    <div className="page-stack candidate-dashboard-scale">
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

      {(urgentJobsQuery.isLoading || (urgentJobsQuery.data?.length ?? 0) > 0) ? (
        <section className="panel job-market-panel urgent-jobs-panel">
          <div className="section-heading inline-heading">
            <div>
              <p className="eyebrow"><Zap size={14} />{language === 'vi' ? 'ƯU TIÊN' : 'PRIORITY'}</p>
              <h2>{language === 'vi' ? 'Cần tuyển gấp' : 'Urgent hiring'}</h2>
            </div>
            <button onClick={() => navigate(`${isPublic ? '/jobs' : '/candidate/jobs'}?sort=urgent`)}>{t('viewAll')}</button>
          </div>
          <JobListWithPreview
            jobs={urgentJobsQuery.data ?? []}
            isLoading={urgentJobsQuery.isLoading}
            onOpen={(job) => navigate(isPublic ? `/jobs/${job.id}` : `/candidate/jobs/${job.id}`)}
            onApply={applyToJob}
            showMatchMeta={!isPublic}
            compact
          />
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
      {isLoginPromptOpen ? <LoginRequiredModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function CatalogJobsPage({ mode }: { mode: 'guest' | 'candidate' }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const isCandidate = mode === 'candidate';
  const requestedSort = getCatalogSort(searchParams);
  const sort = !isCandidate && requestedSort === 'match_desc' ? 'recent' : requestedSort;
  const currentPage = getCatalogPage(searchParams);
  const [query, setQuery] = useState(keyword);
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const filters = useMemo(() => getJobFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const candidateSettingsQuery = useQuery<any>({
    queryKey: ['settings', 'candidate-catalog'],
    queryFn: () => careerfitApi.getSettings(),
    enabled: isCandidate,
    staleTime: 30_000,
  });
  const candidateCatalogPollInterval = candidateSettingsQuery.data?.demoModeEnabled ? 5_000 : 300_000;
  const catalogQuery = useQuery({
    queryKey: [isCandidate ? 'candidate-job-catalog' : 'public-job-catalog', keyword, filters, sort, currentPage],
    queryFn: () => (isCandidate ? careerfitApi.getCandidateJobCatalog : careerfitApi.getPublicJobCatalog)({
      keyword,
      ...filters,
      sort,
      page: currentPage - 1,
      size: 20,
    }),
    retry: 1,
    refetchInterval: isCandidate ? candidateCatalogPollInterval : false,
  });

  useEffect(() => { setQuery(keyword); }, [keyword]);
  const jobs = catalogQuery.data?.jobs ?? [];
  const total = catalogQuery.data?.total ?? 0;
  const totalPages = catalogQuery.data?.totalPages ?? 0;

  function runSearch() {
    setSearchParams(writeJobSearchParams(query.trim(), filters, sort, 1));
  }
  function applyFilters(nextFilters: JobFilters, nextKeyword = query) {
    setQuery(nextKeyword);
    setSearchParams(writeJobSearchParams(nextKeyword, nextFilters, sort, 1));
    setFilterOpen(false);
  }
  function updateSort(nextSort: CatalogSort) {
    setSearchParams(writeJobSearchParams(keyword, filters, nextSort, 1));
  }
  function updatePage(nextPage: number) {
    setSearchParams(writeJobSearchParams(keyword, filters, sort, nextPage));
  }
  async function apply(job: Job) {
    if (job.applicationMode === 'EXTERNAL') {
      if (job.sourceUrl) {
        window.open(job.sourceUrl, '_blank', 'noopener,noreferrer');
      } else {
        setActionMessage({ tone: 'error', text: language === 'vi' ? 'Việc làm này được đăng từ nguồn bên ngoài.' : 'This job is hosted by an external source.' });
      }
      return;
    }
    if (!isCandidate) {
      setIsLoginPromptOpen(true);
      return;
    }
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language) });
    }
  }

  async function toggleSavedJob(job: Job) {
    if (savingJobId) return;
    const isSaved = Boolean(job.isSaved);
    setSavingJobId(job.id);
    try {
      if (isSaved) await careerfitApi.removeSavedJob(job.id);
      else await careerfitApi.saveJob(job.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-job-cards'] }),
      ]);
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể cập nhật việc làm đã lưu.' : 'Could not update saved jobs.', language) });
    } finally {
      setSavingJobId(null);
    }
  }

  async function markNotInterested(jobId: string, options?: { feedbackSaved?: boolean }) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job?.matchingId) {
      setActionMessage({ tone: 'error', text: language === 'vi' ? 'Chưa có dữ liệu phù hợp để ghi nhận phản hồi cho việc làm này.' : 'There is no matching data available for this feedback.' });
      return;
    }
    try {
      if (!options?.feedbackSaved) {
        await careerfitApi.submitMatchFeedback(job.matchingId, 'NOT_INTERESTED');
      }
      await queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã ghi nhận phản hồi để cải thiện gợi ý việc làm.' : 'Your feedback was saved to improve job recommendations.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể ghi nhận phản hồi.' : 'Could not save feedback.', language) });
    }
  }

  return <div className="page-stack">
    <section className="result-search-hero catalog-search-hero">
      <div className="location-select">
        <MapPin size={18} />
        <select aria-label={language === 'vi' ? 'Chọn địa điểm' : 'Select location'} value={filters.city} onChange={(event) => applyFilters({ ...filters, city: event.target.value }, query)}>
          {jobFilterOptions.city.map(([value, label]) => <option key={value} value={value}>{value === 'all' ? t('allCities') : localizeFilterOption('city', value, label, language)}</option>)}
        </select>
      </div>
      <div className="result-search-input"><Search size={18} /><JobAutocompleteInput field="search" value={query} onValueChange={setQuery} onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); }} placeholder={t('searchPlaceholder')} language={language} /></div>
      <button className="primary-action" onClick={runSearch}><Search size={17} />{t('search')}</button>
    </section>
    <section className="search-results-page">
      <div className="result-heading catalog-result-heading"><div><h2>{total} <span>{query || 'IT'}</span> {t('jobsInVietnam')}</h2><p className="result-subtitle">{language === 'vi' ? `Trang ${currentPage}${totalPages ? ` / ${totalPages}` : ''} · ${total} việc làm` : `Page ${currentPage}${totalPages ? ` of ${totalPages}` : ''} · ${total} jobs`}</p></div><div className="catalog-result-controls">{isCandidate ? <button className="filter-button catalog-filter-button" type="button" onClick={() => void catalogQuery.refetch()} disabled={catalogQuery.isFetching}><RefreshCcw size={16} />{language === 'vi' ? 'Làm mới' : 'Refresh'}</button> : null}<button className="filter-button catalog-filter-button" type="button" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} />{t('filter')}</button><label className="catalog-sort-control">{language === 'vi' ? 'Sắp xếp' : 'Sort'}<select aria-label={language === 'vi' ? 'Sắp xếp việc làm' : 'Sort jobs'} value={sort} onChange={(event) => updateSort(event.target.value as CatalogSort)}><option value="recent">{language === 'vi' ? 'Mới nhất' : 'Newest'}</option><option value="oldest">{language === 'vi' ? 'Cũ nhất' : 'Oldest'}</option><option value="popular">{language === 'vi' ? 'Phổ biến nhất' : 'Most popular'}</option><option value="urgent">{language === 'vi' ? 'Cần tuyển gấp' : 'Urgent hiring'}</option>{isCandidate ? <option value="match_desc">{language === 'vi' ? 'Điểm phù hợp cao nhất' : 'Highest match score'}</option> : null}</select></label></div></div>
      {catalogQuery.isError ? <section className="empty-state" role="alert"><h3>{language === 'vi' ? 'Không thể tải danh sách việc làm' : 'Could not load jobs'}</h3><p>{language === 'vi' ? 'Kiểm tra kết nối rồi thử lại.' : 'Check your connection and try again.'}</p><button type="button" onClick={() => void catalogQuery.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button></section> : <>
      {actionMessage ? <ActionMessage {...actionMessage} /> : null}
      <JobListWithPreview jobs={jobs} isLoading={catalogQuery.isLoading} onOpen={(job) => navigate(`${isCandidate ? '/candidate/jobs' : '/jobs'}/${job.id}`)} onApply={apply} onSave={isCandidate ? toggleSavedJob : () => setIsLoginPromptOpen(true)} onSkip={isCandidate ? markNotInterested : () => setIsLoginPromptOpen(true)} isSaved={(jobId) => Boolean(jobs.find((job) => job.id === jobId)?.isSaved)} savingJobId={savingJobId} showMatchMeta={isCandidate} compact emptyTitle={language === 'vi' ? 'Không có việc làm phù hợp bộ lọc.' : 'No jobs match these filters.'} />
      {totalPages > 1 ? <div className="catalog-pagination"><button type="button" disabled={currentPage <= 1} onClick={() => updatePage(currentPage - 1)}>{language === 'vi' ? 'Trang trước' : 'Previous'}</button><span>{currentPage} / {totalPages}</span><button className="primary-action" type="button" disabled={currentPage >= totalPages} onClick={() => updatePage(currentPage + 1)}>{language === 'vi' ? 'Trang sau' : 'Next'}</button></div> : null}
      </>}
    </section>
    {filterOpen ? <FilterModal filters={filters} keyword={query} showScoreFilter={isCandidate} onApply={applyFilters} onReset={() => applyFilters(defaultJobFilters, query)} onClose={() => setFilterOpen(false)} /> : null}
    {isLoginPromptOpen ? <LoginRequiredModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
  </div>;
}

function CandidateJobsPageUnused({ isPublic = false }: { isPublic?: boolean }) {
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
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [candidatePages, setCandidatePages] = useState<CandidateJobPage[]>([]);
  const [isLoadingMoreJobs, setIsLoadingMoreJobs] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const savedJobIdsQuery = useQuery({
    queryKey: ['saved-job-ids'],
    queryFn: () => careerfitApi.getSavedJobIds(),
    enabled: !isPublic,
    retry: 1,
  });
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
    queryKey: ['candidate-jobs-page', 0, filters.minScore],
    enabled: !isPublic,
    queryFn: () => careerfitApi.getCandidateJobsPage({ page: 0, size: 20, minScore: filters.minScore || undefined }),
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
  const activeFilterCount = (Object.keys(jobFilterOptions) as JobFilterKey[]).filter((key) => filters[key] !== defaultJobFilters[key]).length + (filters.minScore > 0 ? 1 : 0);
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

  async function toggleSavedJob(job: Job) {
    if (isPublic || savingJobId) return;
    const isSaved = (savedJobIdsQuery.data ?? []).includes(job.id);
    setSavingJobId(job.id);
    setActionMessage(null);
    try {
      if (isSaved) {
        await careerfitApi.removeSavedJob(job.id);
      } else {
        await careerfitApi.saveJob(job.id);
      }
      await queryClient.invalidateQueries({ queryKey: ['saved-job-ids'] });
      setActionMessage({
        tone: 'success',
        text: language === 'vi'
          ? (isSaved ? 'Đã bỏ lưu việc làm.' : 'Đã lưu việc làm.')
          : (isSaved ? 'Job removed from saved jobs.' : 'Job saved.'),
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể cập nhật việc làm đã lưu.' : 'Could not update saved jobs.', language),
      });
    } finally {
      setSavingJobId(null);
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
        minScore: filters.minScore || undefined,
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
          onSave={isPublic ? undefined : toggleSavedJob}
          isSaved={(jobId) => (savedJobIdsQuery.data ?? []).includes(jobId)}
          savingJobId={savingJobId}
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
          showScoreFilter={!isPublic}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      ) : null}
      {isLoginPromptOpen ? <LoginRequiredModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
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
      {job.isPotential ? <PotentialBadge jobTitle={job.title} /> : null}
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
  const [showLowMatchConfirm, setShowLowMatchConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const similarJobsRef = useRef<HTMLElement>(null);
  const shouldScrollToSimilarRef = useRef(false);
  const { data: job, isLoading, isError } = useJobDetail(jobId, isPublic);
  const { data: jobReportSummary, refetch: refetchJobReportSummary } = useQuery({
    queryKey: ['job-report-summary', jobId],
    enabled: Boolean(jobId) && !isPublic,
    queryFn: () => careerfitApi.getJobReportSummary(jobId!),
  });
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

  useEffect(() => {
    if (!showSimilarJobs || !shouldScrollToSimilarRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      similarJobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollToSimilarRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showSimilarJobs]);

  if (isLoading) return <section className="panel empty-state"><p>{t('loading')}</p></section>;
  if (isError || !job) return <section className="panel empty-state"><p>{language === 'vi' ? 'Không thể tải công việc này.' : 'Could not load this job.'}</p></section>;
  const currentJob = job;
  const hasApplied = Boolean(currentJob.applicationStatus);

  function requestApply() {
    if (!isPublic && currentJob.label === 'Low' && !hasApplied) {
      setShowLowMatchConfirm(true);
      return;
    }
    void applyToCurrentJob();
  }

  async function applyToCurrentJob() {
    if (hasApplied) return;
    if (currentJob.applicationMode === 'EXTERNAL') {
      if (currentJob.sourceUrl) {
        window.open(currentJob.sourceUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setApplyError(language === 'vi' ? 'Việc làm này được đăng từ nguồn bên ngoài.' : 'This job is hosted by an external source.');
      return;
    }
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

  async function toggleSavedJob() {
    if (isPublic) {
      setIsLoginPromptOpen(true);
      return;
    }
    setSavingJob(true);
    try {
      if (currentJob.isSaved) await careerfitApi.removeSavedJob(currentJob.id);
      else await careerfitApi.saveJob(currentJob.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-detail', jobId] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-job-cards'] }),
      ]);
    } catch (error) {
      setApplyError(readableError(error, language === 'vi' ? 'Không thể cập nhật việc làm đã lưu.' : 'Could not update the saved job.', language));
    } finally {
      setSavingJob(false);
    }
  }

  function openSimilarJobs() {
    if (showSimilarJobs) {
      similarJobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    shouldScrollToSimilarRef.current = true;
    setShowSimilarJobs(true);
  }

  return (
    <div className="jd-detail-route">
      <button className="back-button" onClick={() => navigate(isPublic ? '/jobs' : '/candidate/jobs')}>
        <ArrowLeft size={17} />
        {t('backToJobs')}
      </button>
      {isApplying ? <p className="validation-message">{t('submittingApplication')}</p> : null}
      {applyError ? <ActionMessage tone="error" text={applyError} /> : null}
      <JobDetailContent job={job} reportSummary={jobReportSummary} showMatchMeta={!isPublic && job.hasMatching !== false} onApply={hasApplied ? undefined : requestApply} onSave={toggleSavedJob} savingJob={savingJob} onReport={() => isPublic ? setIsLoginPromptOpen(true) : setShowReportDialog(true)} />
      {showSimilarJobs ? (
        <section className="panel similar-jobs-panel" id="similar-jobs" ref={similarJobsRef}>
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
      {showStickyBar ? <StickyApplyBar isSaved={Boolean(currentJob.isSaved)} isApplying={isApplying} hasApplied={hasApplied} onSave={toggleSavedJob} onApply={hasApplied ? undefined : requestApply} onSimilar={openSimilarJobs} onReport={() => isPublic ? setIsLoginPromptOpen(true) : setShowReportDialog(true)} /> : null}
      {showLowMatchConfirm ? <LowMatchConfirmModal language={language} onClose={() => setShowLowMatchConfirm(false)} onConfirm={() => { setShowLowMatchConfirm(false); void applyToCurrentJob(); }} /> : null}
      {showReportDialog ? <JobReportModal jobId={currentJob.id} language={language} onClose={() => setShowReportDialog(false)} onSuccess={() => { setShowReportDialog(false); void refetchJobReportSummary(); }} /> : null}
      {isLoginPromptOpen ? <LoginRequiredModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
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
          <CompanyLogo company={employer.companyName} logoUrl={employer.logoUrl ?? undefined} className="employer-logo-large" />
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
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [isSavingManualCv, setIsSavingManualCv] = useState(false);
  const [pendingCvId, setPendingCvId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: manualProfile } = useQuery<any>({ queryKey: ['candidate-profile'], queryFn: careerfitApi.getCandidateProfile });
  const { data: matchedJobs = [] } = useJobs({ isPublic: false });
  const activeUploadTab: UploadTab = searchParams.get('tab') === 'manual' ? 'manual' : 'parser';
  const skillChips = ['React', 'TypeScript', 'Design System', 'Testing', 'Accessibility'];

  function setActiveUploadTab(tab: UploadTab) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'tab', tab, 'parser');
    setSearchParams(params);
  }

  async function uploadSelectedCv(file?: File) {
    if (!file) return;
    setState('uploading');
    setActionMessage(null);
    try {
      const result = await careerfitApi.uploadCv(file);
      if (result.status === 'FAILED') {
        setState('failed');
        setPendingCvId(result.id);
        setActionMessage({
          tone: 'error',
          text: language === 'vi' ? 'CV đã tải lên nhưng không thể trích xuất nội dung. Hãy thử tệp PDF/DOCX rõ ràng hơn.' : 'The CV was uploaded but its content could not be extracted. Try a clearer PDF or DOCX file.',
        });
        return;
      }
      navigate(`/candidate/profile/cvs/${result.id}/review`);
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

  function readManualCvPayload(formElement: HTMLFormElement): ManualCvPayload {
    const form = new FormData(formElement);
    const skills = String(form.get('skills') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    return {
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
  }

  async function saveManualCv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingManualCv(true);
    setActionMessage(null);
    const payload = readManualCvPayload(event.currentTarget);
    try {
      const result = await careerfitApi.createManualCv(payload);
      if (result.status === 'FAILED') throw new Error(result.message || 'CV processing failed.');
      navigate(`/candidate/profile/cvs/${result.id}/review`);
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể tạo CV.' : 'Could not create CV.', language),
      });
    } finally {
      setIsSavingManualCv(false);
    }
  }

  async function saveManualCvDraft() {
    const form = document.getElementById('manual-cv-form') as HTMLFormElement | null;
    if (!form) return;
    setIsSavingManualCv(true);
    setActionMessage(null);
    try {
      await careerfitApi.saveManualCvDraft(readManualCvPayload(form));
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã lưu bản nháp CV. Bản nháp chưa được dùng để matching.' : 'CV draft saved. It is not used for matching yet.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể lưu bản nháp CV.' : 'Could not save the CV draft.', language) });
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
                <button className="cv-retry-action" type="button" onClick={async () => {
                  try {
                    const result = await careerfitApi.retryCv(pendingCvId);
                    navigate(`/candidate/profile/cvs/${result.id}/review`);
                  } catch (error) {
                    setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể thử lại CV.' : 'Could not retry the CV.', language) });
                  }
                }}>
                  {language === 'vi' ? 'Thử lại CV' : 'Retry CV'}
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
                <input name="fullName" autoComplete="name" defaultValue={manualProfile?.fullName ?? candidate.name} required />
              </label>
              <label>
                {t('currentJobTitle')}
                <JobAutocompleteInput field="title" name="desiredTitle" defaultValue={manualProfile?.desiredTitle ?? ''} required />
              </label>
              <label>
                {t('emailAddress')}
                <input name="email" autoComplete="email" defaultValue={manualProfile?.email?.includes('@') ? manualProfile.email : ''} type="email" />
              </label>
              <label>
                {t('phoneNumber')}
                <input name="phone" autoComplete="tel" defaultValue={manualProfile?.phone ?? ''} />
              </label>
              <label>
                {t('location')}
                <JobAutocompleteInput field="location" name="location" defaultValue={manualProfile?.location ?? ''} />
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
              <SkillAutocompleteInput name="skills" defaultValue={manualProfile?.desiredSkills?.join(', ') ?? skillChips.join(', ')} required />
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
                    <JobAutocompleteInput field="title" defaultValue="Senior Frontend Engineer" />
                  </label>
                  <label>
                    {t('company')}
                    <JobAutocompleteInput field="company" defaultValue="Northstar HealthTech" />
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
          <button type="button" onClick={saveManualCvDraft} disabled={isSavingManualCv}>{language === 'vi' ? 'Lưu nháp' : 'Save draft'}</button>
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

function CvReviewPage() {
  const { cvId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const vi = language === 'vi';
  const [sections, setSections] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const review = useQuery({
    queryKey: ['candidate-cv-detail', cvId],
    enabled: Boolean(cvId),
    queryFn: () => careerfitApi.getCv(cvId!),
  });

  useEffect(() => {
    if (!review.data) return;
    setDisplayName(review.data.displayName);
    setSections(review.data.reviewSections ?? {});
  }, [review.data]);

  function updateSection(key: string, value: string) {
    setSections((current) => ({ ...current, [key]: value }));
  }

  function applySuggestion(issue: CvReviewIssueDto) {
    if (!issue.targetText || !issue.replacementText) return;
    setSections((current) => ({
      ...current,
      [issue.sectionKey]: (current[issue.sectionKey] ?? '').replace(issue.targetText!, issue.replacementText!),
    }));
  }

  async function saveReview(showSuccess = true) {
    if (!cvId) return false;
    setSaving(true);
    try {
      const updated = await careerfitApi.updateCvReview(cvId, { displayName, sections });
      setSections(updated.reviewSections ?? sections);
      await queryClient.invalidateQueries({ queryKey: ['candidate-cv-detail', cvId] });
      if (showSuccess) setMessage({ tone: 'success', text: vi ? 'Đã lưu nội dung xem lại.' : 'Review content saved.' });
      return true;
    } catch (error) {
      setMessage({ tone: 'error', text: readableError(error, vi ? 'Không thể lưu nội dung CV.' : 'Could not save CV content.', language) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function confirmReview() {
    if (!cvId || !(await saveReview(false))) return;
    setConfirming(true);
    try {
      await careerfitApi.confirmCvReview(cvId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-cv-detail', cvId] }),
      ]);
      navigate(`/candidate/profile?tab=cvs&cv=${encodeURIComponent(cvId)}`);
    } catch (error) {
      setMessage({ tone: 'error', text: readableError(error, vi ? 'Không thể xác nhận CV.' : 'Could not confirm the CV.', language) });
    } finally {
      setConfirming(false);
    }
  }

  if (review.isLoading) return <section className="panel empty-state"><p>{vi ? 'Đang chuẩn bị màn xem lại CV...' : 'Preparing CV review...'}</p></section>;
  if (review.isError || !review.data) return <section className="panel empty-state" role="alert"><h2>{vi ? 'Không thể tải CV để xem lại' : 'Could not load CV for review'}</h2><button type="button" onClick={() => void review.refetch()}>{vi ? 'Thử lại' : 'Retry'}</button></section>;

  const issues = review.data.reviewIssues ?? [];
  const sectionLabels: Record<string, string> = {
    fullName: vi ? 'Họ và tên' : 'Full name', headline: vi ? 'Tiêu đề hồ sơ' : 'Headline', contact: vi ? 'Liên hệ' : 'Contact',
    summary: vi ? 'Giới thiệu' : 'Summary', skills: vi ? 'Kỹ năng' : 'Skills', additionalSkills: vi ? 'Kỹ năng bổ sung' : 'Additional skills',
    experience: vi ? 'Kinh nghiệm' : 'Experience', education: vi ? 'Học vấn' : 'Education', projects: vi ? 'Dự án' : 'Projects',
    certifications: vi ? 'Chứng chỉ' : 'Certifications', languages: vi ? 'Ngoại ngữ' : 'Languages', profile: vi ? 'Hồ sơ' : 'Profile',
  };

  return <div className="page-stack cv-review-route">
    <section className="cv-review-hero">
      <div><p className="eyebrow">CV review</p><h2>{vi ? 'Xem lại CV trước khi chấm điểm' : 'Review your CV before scoring'}</h2><p>{vi ? 'Kiểm tra nội dung đã trích xuất, áp dụng đề xuất khi phù hợp, rồi xác nhận để bắt đầu đối sánh việc làm.' : 'Review extracted content, apply relevant suggestions, then confirm to start job matching.'}</p></div>
      <button type="button" onClick={() => navigate('/candidate/upload')}>{vi ? 'Quay lại tải CV' : 'Back to upload'}</button>
    </section>
    {message ? <ActionMessage {...message} /> : null}
    <section className="cv-review-layout">
      <article className="cv-review-editor">
        <label>{vi ? 'Tên CV' : 'CV name'}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        {Object.entries(sections).map(([key, value]) => <label key={key}><span>{sectionLabels[key] ?? key}</span><textarea value={value} rows={key === 'summary' || key === 'experience' || key === 'projects' ? 6 : 3} onChange={(event) => updateSection(key, event.target.value)} /></label>)}
        {!Object.keys(sections).length ? <p>{vi ? 'Chưa trích xuất được phần nội dung có thể chỉnh sửa.' : 'No editable sections were extracted.'}</p> : null}
      </article>
      <aside className="cv-review-suggestions">
        <div><p className="eyebrow">{vi ? 'Kiểm tra nội dung' : 'Content check'}</p><h3>{vi ? 'Cảnh báo và đề xuất' : 'Warnings and suggestions'}</h3></div>
        {!issues.length ? <p>{vi ? 'Chưa phát hiện điểm nào cần chỉnh sửa. Bạn vẫn có thể sửa trực tiếp nội dung bên trái.' : 'No issues were detected. You can still edit the content directly.'}</p> : issues.map((issue) => <article className={`cv-review-issue ${issue.severity.toLowerCase()}`} key={issue.id}><strong>{issue.messageVi && vi ? issue.messageVi : issue.messageEn}</strong>{issue.targetText ? <small>{issue.targetText}{issue.replacementText ? ` → ${issue.replacementText}` : ''}</small> : null}{issue.targetText && issue.replacementText ? <button type="button" onClick={() => applySuggestion(issue)}>{vi ? 'Áp dụng đề xuất' : 'Apply suggestion'}</button> : null}</article>)}
      </aside>
    </section>
    <div className="manual-sticky-actions cv-review-actions"><button type="button" onClick={() => void saveReview()} disabled={saving || confirming}>{saving ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu bản xem lại' : 'Save review')}</button><button className="primary-action" type="button" onClick={() => void confirmReview()} disabled={saving || confirming}>{confirming ? (vi ? 'Đang xác nhận...' : 'Confirming...') : (vi ? 'Xác nhận và chấm điểm' : 'Confirm and score')}</button></div>
  </div>;
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
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [defaultingCvId, setDefaultingCvId] = useState<string | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [deleteTargetCv, setDeleteTargetCv] = useState<CandidateCvDto | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const [retryingCvId, setRetryingCvId] = useState<string | null>(null);
  const cvPollingStartedAtRef = useRef<number | null>(null);
  const synchronizedCvStatusRef = useRef<string | null>(null);
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
  const detailCvStatus = cvDetail.data?.status;
  const shouldPollCvStatus = Boolean(selectedCvId) && isCvProcessingStatus(detailCvStatus);
  const cvStatus = useQuery({
    queryKey: ['candidate-cv-status', selectedCvId],
    queryFn: () => careerfitApi.getCvStatus(selectedCvId!),
    enabled: shouldPollCvStatus,
    retry: 2,
    refetchInterval: () => {
      const startedAt = cvPollingStartedAtRef.current;
      return startedAt && Date.now() - startedAt < 90_000 ? 1_500 : false;
    },
  });
  const resolvedCvStatus = cvStatus.data?.status ?? detailCvStatus;
  const isCvProcessing = isCvProcessingStatus(resolvedCvStatus);
  const isCvPollingTimedOut = isCvProcessing && Boolean(cvPollingStartedAtRef.current && Date.now() - cvPollingStartedAtRef.current >= 90_000);
  const cvReportSummary = useQuery({
    queryKey: ['cv-report-summary', selectedCvId],
    queryFn: () => careerfitApi.getCvReportSummary(selectedCvId!),
    enabled: Boolean(selectedCvId),
    retry: false,
  });
  const cvMatches = useQuery({
    queryKey: ['candidate-cv-matches', selectedCvId],
    queryFn: () => careerfitApi.getCandidateJobsPage({ page: 0, size: 20, cvId: selectedCvId!, minScore: 60 }),
    enabled: Boolean(selectedCvId) && resolvedCvStatus === 'SCORING_DONE',
    retry: false,
  });
  const profileTab = profileTabParamToState[searchParams.get('tab') ?? ''] ?? 'cv';
  const rankedCvMatches = useMemo(() => (cvMatches.data?.jobs ?? []).filter((job) => job.normalizedScore >= 60).sort((left, right) => right.normalizedScore - left.normalizedScore), [cvMatches.data]);
  useEffect(() => {
    const cvId = searchParams.get('cv');
    if (cvId) setSelectedCvId(cvId);
  }, [searchParams]);
  useEffect(() => {
    cvPollingStartedAtRef.current = selectedCvId ? Date.now() : null;
    synchronizedCvStatusRef.current = null;
  }, [selectedCvId]);
  useEffect(() => {
    if (!selectedCvId || (resolvedCvStatus !== 'SCORING_DONE' && resolvedCvStatus !== 'FAILED')) return;
    const synchronizationKey = `${selectedCvId}:${resolvedCvStatus}`;
    if (synchronizedCvStatusRef.current === synchronizationKey) return;
    synchronizedCvStatusRef.current = synchronizationKey;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] }),
      queryClient.invalidateQueries({ queryKey: ['candidate-cv-detail', selectedCvId] }),
      queryClient.invalidateQueries({ queryKey: ['candidate-cv-matches', selectedCvId] }),
      queryClient.invalidateQueries({ queryKey: ['candidate-jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
    ]);
  }, [queryClient, resolvedCvStatus, selectedCvId]);
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

  async function retryCv(cv: Pick<CandidateCvDto, 'id'>) {
    setRetryingCvId(cv.id);
    try {
      const result = await careerfitApi.retryCv(cv.id);
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      await queryClient.removeQueries({ queryKey: ['candidate-cv-status', cv.id] });
      navigate(`/candidate/profile/cvs/${result.id}/review`);
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể thử lại CV.' : 'Could not retry this CV.', language) });
    } finally {
      setRetryingCvId(null);
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
                    <span>{cv.isDefault ? t('defaultMatchingCv') : formatCvStatus(cv.status, language)}</span>
                  </div>
                  <div className="cv-card-actions">
                    {cv.status === 'DRAFT' || cv.status === 'REVIEW_REQUIRED' ? <button type="button" className="primary-action" onClick={() => navigate(`/candidate/profile/cvs/${cv.id}/review`)}>
                      {language === 'vi' ? (cv.status === 'DRAFT' ? 'Tiếp tục nhập' : 'Xem lại CV') : (cv.status === 'DRAFT' ? 'Continue editing' : 'Review CV')}
                    </button> : null}
                    <button type="button" onClick={() => setSelectedCvId(cv.id)}>
                      {language === 'vi' ? 'Chi tiết' : 'Details'}
                    </button>
                    <button onClick={() => setDefaultCv(cv)} disabled={cv.isDefault || defaultingCvId === cv.id}>
                      {defaultingCvId === cv.id ? '...' : t('setDefault')}
                    </button>
                    {cv.status === 'FAILED' ? <button type="button" onClick={() => void retryCv(cv)} disabled={retryingCvId === cv.id}>{retryingCvId === cv.id ? '...' : (language === 'vi' ? 'Thử lại' : 'Retry')}</button> : null}
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
                <input autoComplete="name" value={profileDraft.fullName} onChange={(event) => updateProfileDraft('fullName', event.target.value)} />
              </label>
              <label>
                Email
                <input value={profile?.email ?? ''} type="email" disabled />
              </label>
              <label>
                {t('desiredTitle')}
                <JobAutocompleteInput field="title" value={profileDraft.desiredTitle} onValueChange={(value) => updateProfileDraft('desiredTitle', value)} />
              </label>
              <label>
                {t('skills')}
                <SkillAutocompleteInput value={profileDraft.desiredSkills} onValueChange={(value) => updateProfileDraft('desiredSkills', value)} />
                <ValidationSuggestion
                  severity="quality"
                  code="PROFILE_SKILL_SCOPE"
                  message={t('profileSkillScopeSuggestion')}
                />
              </label>
              <label>
                {t('location')}
                <JobAutocompleteInput field="location" value={profileDraft.location} onValueChange={(value) => updateProfileDraft('location', value)} />
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
                  <span>{formatCvStatus(resolvedCvStatus, language)}</span>
                  {cvDetail.data.isDefault ? <strong>{t('defaultMatchingCv')}</strong> : null}
                  <span>{new Date(cvDetail.data.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                  <PendingReportLabel summary={cvReportSummary.data} language={language} />
                </div>
                {isCvProcessing ? (
                  <div className="cv-processing-state" role="status" aria-live="polite">
                    <RefreshCcw size={18} aria-hidden="true" />
                    <div>
                      <strong>{language === 'vi' ? 'Đang trích xuất và chấm điểm CV' : 'Extracting and scoring this CV'}</strong>
                      <p>{isCvPollingTimedOut
                        ? (language === 'vi' ? 'Quá trình đang mất nhiều thời gian hơn dự kiến. Bạn có thể làm mới trạng thái để kiểm tra lại.' : 'Processing is taking longer than expected. Refresh the status to check again.')
                        : (language === 'vi' ? 'Trạng thái sẽ tự cập nhật khi hoàn tất. Bạn có thể tiếp tục sử dụng trang này.' : 'The status will update automatically when processing finishes. You can keep using this page.')}</p>
                    </div>
                    <button type="button" onClick={() => void cvStatus.refetch()}>{language === 'vi' ? 'Làm mới' : 'Refresh'}</button>
                  </div>
                ) : null}
                {cvStatus.isError ? (
                  <div className="cv-status-error">
                    <ActionMessage tone="error" text={readableError(cvStatus.error, language === 'vi' ? 'Không thể kiểm tra trạng thái xử lý CV.' : 'Could not check the CV processing status.', language)} />
                    <button type="button" onClick={() => void cvStatus.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
                  </div>
                ) : null}
                <div className="cv-detail-overview">
                  <section className="cv-detail-info-card cv-detail-skills-card">
                    <div className="cv-detail-card-heading"><Sparkles size={18} /><h3>{language === 'vi' ? 'Kỹ năng đã trích xuất' : 'Extracted skills'}</h3></div>
                    {cvDetail.data.topSkills.length ? <ReasonChips reasons={cvDetail.data.topSkills} /> : <p>{language === 'vi' ? 'Chưa có kỹ năng được trích xuất.' : 'No extracted skills yet.'}</p>}
                  </section>
                  <section className="cv-detail-info-card cv-detail-summary-card">
                    <div className="cv-detail-card-heading"><UserRound size={18} /><h3>{language === 'vi' ? 'Tóm tắt hồ sơ' : 'Profile summary'}</h3></div>
                    <p>{cvDetail.data.parsedSummary || (language === 'vi' ? 'Chưa có tóm tắt.' : 'No summary available.')}</p>
                  </section>
                </div>
                {resolvedCvStatus === 'FAILED' ? (
                  <div className="cv-status-error">
                    <ActionMessage tone="error" text={cvStatus.data?.failureReason || cvDetail.data.failureReason || (language === 'vi' ? 'Không thể xử lý CV này.' : 'This CV could not be processed.')} />
                    <button type="button" className="primary-action" disabled={retryingCvId === cvDetail.data.id} onClick={() => void retryCv(cvDetail.data)}>
                      <RefreshCcw size={16} />
                      {retryingCvId === cvDetail.data.id ? (language === 'vi' ? 'Đang thử lại...' : 'Retrying...') : (language === 'vi' ? 'Thử lại CV' : 'Retry CV')}
                    </button>
                  </div>
                ) : null}
                <section className="cv-detail-extracted-section">
                  <div className="cv-detail-section-heading"><div><FileText size={18} /><h3>{language === 'vi' ? 'Nội dung đã trích xuất' : 'Extracted content'}</h3></div><span>{language === 'vi' ? 'Có thể cuộn để xem toàn bộ' : 'Scroll to view all'}</span></div>
                  <pre className="cv-raw-text">{cvDetail.data.rawText || (language === 'vi' ? 'Chưa có nội dung trích xuất.' : 'No extracted content available.')}</pre>
                </section>
                <div className="cv-matches-section">
                  <div className="cv-matches-heading"><div><h3>{language === 'vi' ? 'Việc làm phù hợp với CV này' : 'Jobs matched to this CV'}</h3><p>{language === 'vi' ? 'Xếp theo điểm phù hợp từ cao xuống thấp.' : 'Ranked by match score from highest to lowest.'}</p></div><span>{language === 'vi' ? 'Từ 60%' : '60%+'}</span></div>
                  {resolvedCvStatus !== 'SCORING_DONE' ? <p>{language === 'vi' ? 'CV cần hoàn tất chấm điểm trước khi có kết quả matching.' : 'This CV must finish scoring before matches are available.'}</p> : null}
                  {cvMatches.isLoading ? <p>{language === 'vi' ? 'Đang tải việc làm phù hợp...' : 'Loading matched jobs...'}</p> : null}
                  {cvMatches.isError ? <ActionMessage tone="error" text={language === 'vi' ? 'Không thể tải matching cho CV này.' : 'Could not load matches for this CV.'} /> : null}
                  {cvMatches.data && rankedCvMatches.length === 0 ? <p>{language === 'vi' ? 'Chưa có việc làm đạt từ 60% phù hợp với CV này.' : 'No jobs at 60% or above match this CV yet.'}</p> : null}
                  <div className="cv-match-list">
                    {rankedCvMatches.map((job) => <button className="cv-match-link" type="button" key={job.id} onClick={() => navigate(`/candidate/jobs/${job.id}`)}>
                      <span className="cv-match-company-mark" aria-hidden="true">{job.company.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CF'}</span>
                      <span className="cv-match-copy"><strong>{job.title}</strong><small>{job.company} · {localizeUiMetadata(job.location, language)} · {localizeUiMetadata(job.seniority, language)}</small>{job.requiredSkills.length ? <span className="cv-match-skills">{job.requiredSkills.slice(0, 3).join(' · ')}</span> : null}</span>
                      <span className="cv-match-score"><strong>{job.normalizedScore}%</strong><small>{language === 'vi' ? 'phù hợp' : 'match'}</small></span>
                    </button>)}
                  </div>
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
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
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
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="candidate-review-modal portfolio-editor-modal" onSubmit={submit}><div className="section-heading inline-heading"><div><p className="eyebrow">Portfolio</p><h2>{item ? (vi ? 'Sửa dự án' : 'Edit project') : (vi ? 'Thêm dự án' : 'Add project')}</h2></div><button type="button" aria-label={vi ? 'Đóng' : 'Close'} onClick={onClose}><XCircle size={19} /></button></div><div className="settings-grid"><label>{vi ? 'Tên dự án' : 'Project name'}<input name="name" required maxLength={255} defaultValue={item?.name ?? ''} /></label><label>{vi ? 'Vai trò' : 'Role'}<JobAutocompleteInput field="title" name="role" maxLength={255} defaultValue={item?.role ?? ''} /></label><label className="settings-grid-wide">{vi ? 'Tóm tắt' : 'Summary'}<textarea name="summary" rows={3} defaultValue={item?.summary ?? ''} /></label><label>{vi ? 'Công nghệ, cách nhau bằng dấu phẩy' : 'Technologies, comma separated'}<SkillAutocompleteInput name="techStack" defaultValue={item?.techStack?.join(', ') ?? ''} /></label><label>{vi ? 'Liên kết dự án' : 'Project URL'}<input name="projectUrl" type="url" maxLength={500} defaultValue={item?.projectUrl ?? ''} placeholder="https://example.com/project" /></label><label className="settings-grid-wide">{vi ? 'Kết quả hoặc tác động' : 'Result or impact'}<textarea name="impact" rows={2} defaultValue={item?.impact ?? ''} /></label></div><div className="filter-modal-actions"><button type="button" onClick={onClose}>{vi ? 'Hủy' : 'Cancel'}</button><button className="primary-action" disabled={submitting}><Save size={17} />{submitting ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu' : 'Save')}</button></div></form></div>;
}

function RecommendationsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [optimisticallyAppliedJobIds, setOptimisticallyAppliedJobIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  const settingsQuery = useQuery<any>({
    queryKey: ['settings', 'candidate'],
    queryFn: () => careerfitApi.getSettings()
  });

  const demoModeEnabled = settingsQuery.data?.demoModeEnabled;
  const pollInterval = demoModeEnabled ? 5_000 : 300_000;

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => careerfitApi.getRecommendations(20),
    refetchInterval: pollInterval
  });

  const applicationsQuery = useQuery<any>({
    queryKey: ['my-applications', 'recommendations-sync'],
    queryFn: () => careerfitApi.getMyApplications(0, 50),
    staleTime: 30_000,
  });

  const appliedJobIds = useMemo(() => {
    const rows = Array.isArray(applicationsQuery.data)
      ? applicationsQuery.data
      : applicationsQuery.data?.applications ?? applicationsQuery.data?.content ?? [];
    return new Set([...rows.map((application: any) => String(application.jobId ?? '')), ...optimisticallyAppliedJobIds]);
  }, [applicationsQuery.data, optimisticallyAppliedJobIds]);
  const recommendedJobs = (recommendationsQuery.data?.jobs ?? [])
    .filter((job: any) => !hiddenJobIds.includes(job.id))
    .map((job: Job) => appliedJobIds.has(job.id) && !job.applicationStatus ? { ...job, applicationStatus: 'PENDING' } : job);
  const cvStatus = recommendationsQuery.data?.cvStatus;
  const cvMessage = recommendationsQuery.data?.message;

  const isRefetching = recommendationsQuery.isFetching;
  const lastRefresh = recommendationsQuery.dataUpdatedAt ? new Date(recommendationsQuery.dataUpdatedAt) : null;

  async function applyToJob(job: Job) {
    if (job.applicationStatus) return;
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      setOptimisticallyAppliedJobIds((current) => current.includes(job.id) ? current : [...current, job.id]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
      ]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã ứng tuyển. Công việc này đã được đánh dấu trong danh sách gợi ý.' : 'Application submitted. This job is now marked as applied in your recommendations.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language),
      });
    }
  }

  async function skipJob(id: string, options?: { feedbackSaved?: boolean }) {
    const job = recommendedJobs.find((item: any) => item.id === id);
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="secondary-action" onClick={() => recommendationsQuery.refetch()} disabled={isRefetching}>
          <RefreshCcw size={16} /> {language === 'vi' ? 'Làm mới' : 'Refresh'}
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {language === 'vi' ? 'Cập nhật lần cuối:' : 'Last updated:'} {lastRefresh?.toLocaleTimeString() ?? '-'}
          {isRefetching && ' (Đang tải...)'}
        </span>
      </div>

      {cvStatus !== 'SCORING_DONE' && cvStatus !== 'ACTIVE' && cvMessage && (
        <ActionMessage tone="info" text={cvMessage} />
      )}

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const activeTab = searchParams.get('tab') === 'invitations' || searchParams.get('tab') === 'invites'
    ? 'invitations'
    : searchParams.get('tab') === 'saved'
      ? 'saved'
      : 'history';
  const applicationsQuery = useQuery<any>({
    queryKey: ['my-applications', activeTab],
    queryFn: () => careerfitApi.getMyApplications(),
    enabled: activeTab !== 'saved',
    refetchInterval: 60_000,
  });
  const applicationPage = applicationsQuery.data;
  const applicationRows = applicationPage?.content || applicationPage?.applications || (Array.isArray(applicationPage) ? applicationPage : []);
  const savedJobsQuery = useQuery({
    queryKey: ['saved-job-cards'],
    queryFn: () => careerfitApi.getSavedJobCards(),
    enabled: activeTab === 'saved',
    refetchInterval: 60_000,
  });

  function selectTab(tab: 'history' | 'invitations' | 'saved') {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  }

  async function withdraw(applicationId: string) {
    setWithdrawingId(applicationId);
    setActionMessage(null);
    try {
      await careerfitApi.withdrawApplication(applicationId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
      ]);
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

  async function respondToInvitation(applicationId: string, response: 'ACCEPT' | 'DECLINE') {
    setRespondingInvitationId(applicationId);
    setActionMessage(null);
    try {
      await careerfitApi.respondToInvitation(applicationId, response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['recruiter-talent-invitations'] }),
      ]);
      setActionMessage({
        tone: 'success',
        text: response === 'ACCEPT'
          ? (language === 'vi' ? 'Đã chấp nhận lời mời. Đơn ứng tuyển của bạn đang chờ nhà tuyển dụng phản hồi.' : 'Invitation accepted. Your application is now pending recruiter review.')
          : (language === 'vi' ? 'Đã từ chối lời mời tuyển dụng.' : 'Invitation declined.'),
      });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể phản hồi lời mời.' : 'Could not respond to invitation.', language) });
    } finally {
      setRespondingInvitationId(null);
    }
  }

  async function removeSavedJob(job: Job) {
    setSavingJobId(job.id);
    setActionMessage(null);
    try {
      await careerfitApi.removeSavedJob(job.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saved-job-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['candidate-job-catalog'] }),
      ]);
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã bỏ lưu việc làm.' : 'Job removed from saved jobs.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể bỏ lưu việc làm.' : 'Could not remove the saved job.', language) });
    } finally {
      setSavingJobId(null);
    }
  }

  const visibleApplications = applicationRows.filter((application: any) => {
    const status = String(application.status ?? '').toUpperCase();
    return activeTab === 'invitations' ? status === 'INVITED' : status !== 'INVITED';
  });
  const activeTabTitle = activeTab === 'history'
    ? (language === 'vi' ? 'Lịch sử ứng tuyển' : 'Application history')
    : activeTab === 'invitations'
      ? (language === 'vi' ? 'Lời mời tuyển dụng' : 'Recruiter invitations')
      : (language === 'vi' ? 'Việc làm đã lưu' : 'Saved jobs');

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="application-tabs application-tabs-top" role="tablist" aria-label={t('applications')}>
          <button className={activeTab === 'history' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => selectTab('history')}>
            {language === 'vi' ? 'Lịch sử ứng tuyển' : 'Application history'}
          </button>
          <button className={activeTab === 'invitations' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'invitations'} onClick={() => selectTab('invitations')}>
            {language === 'vi' ? 'Lời mời' : 'Invitations'}
          </button>
          <button className={activeTab === 'saved' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'saved'} onClick={() => selectTab('saved')}>
            {language === 'vi' ? 'Việc đã lưu' : 'Saved jobs'}
          </button>
        </div>
        <div className="section-heading">
          <p className="eyebrow">{t('applications')}</p>
          <h2>{activeTabTitle}</h2>
        </div>
        {actionMessage ? <ActionMessage {...actionMessage} /> : null}
        {activeTab === 'saved' ? (
          savedJobsQuery.isError ? (
            <section className="empty-state" role="alert">
              <h3>{language === 'vi' ? 'Không thể tải việc đã lưu' : 'Could not load saved jobs'}</h3>
              <button type="button" onClick={() => void savedJobsQuery.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
            </section>
          ) : (
            <JobListWithPreview
              jobs={savedJobsQuery.data?.jobs ?? []}
              isLoading={savedJobsQuery.isLoading}
              onOpen={(job) => navigate(`/candidate/jobs/${job.id}`)}
              onSave={removeSavedJob}
              isSaved={() => true}
              savingJobId={savingJobId}
              showMatchMeta
              compact
              emptyTitle={language === 'vi' ? 'Chưa có việc làm đã lưu' : 'No saved jobs yet'}
              emptyCopy={language === 'vi' ? 'Lưu các việc làm phù hợp để xem lại và ứng tuyển sau.' : 'Save suitable jobs to review and apply later.'}
              emptyActions={<button type="button" onClick={() => navigate('/candidate/jobs')}>{t('viewAll')}</button>}
            />
          )
        ) : applicationsQuery.isLoading ? (
          <section className="empty-state" aria-live="polite"><p>{language === 'vi' ? 'Đang tải danh sách ứng tuyển...' : 'Loading applications...'}</p></section>
        ) : applicationsQuery.isError ? (
          <section className="empty-state" role="alert">
            <h3>{activeTab === 'invitations' ? (language === 'vi' ? 'Không thể tải lời mời' : 'Could not load invitations') : (language === 'vi' ? 'Không thể tải lịch sử ứng tuyển' : 'Could not load application history')}</h3>
            <p>{language === 'vi' ? 'Kiểm tra kết nối rồi thử lại.' : 'Check your connection and try again.'}</p>
            <button type="button" onClick={() => void applicationsQuery.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
          </section>
        ) : (
          <div className="timeline">
          {visibleApplications.map((application: any) => {
            const appId = application.id || application.applicationId;
            const isAutopilot = application.source === 'autopilot' || application.autoApplied;
            return (
              <article key={appId} className="application-card">
                <h3>{application.jobTitle}</h3>
                <p>{application.company} · {formatApplicationStatus(application.status, language)}</p>
                <small>{language === 'vi' ? `Nguồn: ${isAutopilot ? 'AutoFit' : 'Thủ công'} · Cập nhật ${formatApplicationTimestamp(application.updatedAt, language)}` : `Source: ${isAutopilot ? 'AutoFit' : 'Manual'} · Updated ${formatApplicationTimestamp(application.updatedAt, language)}`}</small>
                {activeTab === 'invitations' && String(application.status).toUpperCase() === 'INVITED' ? (
                  <div className="invitation-response-actions">
                    <button className="primary-action" disabled={respondingInvitationId === appId} onClick={() => respondToInvitation(appId, 'ACCEPT')}>
                      {respondingInvitationId === appId ? t('processing') : (language === 'vi' ? 'Chấp nhận' : 'Accept')}
                    </button>
                    <button disabled={respondingInvitationId === appId} onClick={() => respondToInvitation(appId, 'DECLINE')}>
                      {language === 'vi' ? 'Từ chối' : 'Decline'}
                    </button>
                  </div>
                ) : ['Applied', 'Invited', 'Auto-applied', 'Reviewing', 'PENDING', 'AUTO_APPLIED'].includes(application.status) ? (
                  <button className="withdraw-action" disabled={withdrawingId === appId} onClick={() => withdraw(appId)}>
                    {withdrawingId === appId ? t('processing') : (language === 'vi' ? 'Rút đơn' : 'Withdraw')}
                  </button>
                ) : null}
              </article>
            );
          })}
          {visibleApplications.length === 0 ? <section className="empty-state application-empty"><h3>{activeTab === 'invitations' ? (language === 'vi' ? 'Chưa có lời mời tuyển dụng' : 'No recruitment invitations') : (language === 'vi' ? 'Chưa có đơn ứng tuyển' : 'No applications yet')}</h3><p>{activeTab === 'invitations' ? (language === 'vi' ? 'Lời mời từ nhà tuyển dụng sẽ xuất hiện tại đây.' : 'Recruiter invitations will appear here.') : (language === 'vi' ? 'Khám phá việc làm và gửi đơn khi bạn đã sẵn sàng.' : 'Explore jobs and apply when you are ready.')}</p></section> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function AutomationPage() {
  const { language, t } = useLanguage();
  const [draftPolicy, setDraftPolicy] = useState<AutomationPolicy>(automationPolicy);
  const [isSaving, setIsSaving] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [policyMessage, setPolicyMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
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
  onDeleteAccount: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return <ConnectedSettingsPage role="candidate" onLogout={() => { onLogout(); navigate('/'); }} onDeleteAccount={async () => { await onDeleteAccount(); navigate('/'); }} />;

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
  onDeleteAccount: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return <ConnectedSettingsPage role="recruiter" onLogout={() => { onLogout(); navigate('/'); }} onDeleteAccount={async () => { await onDeleteAccount(); navigate('/'); }} />;

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

function DemoModeSettings({
  data,
  role: _role,
  onUpdate
}: {
  data: any;
  role: 'candidate' | 'recruiter';
  onUpdate: () => void;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoModeEnabled = Boolean(data?.demoModeEnabled);
  const timing = data?.effectiveTiming || {
    candidatePollIntervalSeconds: 5,
    firstSuggestionDelaySeconds: 12,
    subsequentSpacingSeconds: 30
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await careerfitApi.updateSettings({}, checked);
      onUpdate();
    } catch (err) {
      setError(readableError(err, vi ? 'Lỗi cập nhật Demo Mode.' : 'Failed to update Demo Mode.', language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <SettingsSection icon={<Zap size={20} />} title={vi ? 'Chế độ demo' : 'Demo mode'}>
        {error && <p className="form-error">{error}</p>}
        <div style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: demoModeEnabled ? 'color-mix(in srgb, var(--primary) 11%, var(--surface))' : 'var(--surface-muted)' }}>
          <strong style={{ display: 'block', color: 'var(--text)' }}>
            {demoModeEnabled ? (vi ? 'DEMO MODE đang bật' : 'DEMO MODE is enabled') : (vi ? 'Demo Mode đang tắt' : 'Demo Mode is disabled')}
          </strong>
          <span className="settings-inline-note" style={{ display: 'block', marginTop: 4 }}>
            {demoModeEnabled
              ? (vi ? `DEMO · quét/refresh ${timing.candidatePollIntervalSeconds}s · mail đầu ${timing.firstSuggestionDelaySeconds}s · mail tiếp theo ${timing.subsequentSpacingSeconds}s.` : `DEMO · poll/refresh ${timing.candidatePollIntervalSeconds}s · first email ${timing.firstSuggestionDelaySeconds}s · then ${timing.subsequentSpacingSeconds}s.`)
              : (vi ? 'Bật để áp dụng các mốc thời gian nhanh phục vụ demo.' : 'Enable it to apply the fast timings used for a live demo.')}
          </span>
        </div>
        <div className="settings-option-grid">
          <SettingToggle
            title={vi ? 'Bật chế độ demo' : 'Enable demo mode'}
            detail={vi ? 'Rút ngắn thời gian xử lý để thử nghiệm luồng chức năng.' : 'Shortens processing times for testing flows.'}
            checked={demoModeEnabled}
            onChange={handleToggle}
            disabled={loading}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

function RecruiterCompanySetupPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const vi = language === 'vi';
  const employer = useQuery({ queryKey: ['recruiter-employer-profile'], queryFn: careerfitApi.getMyEmployer, retry: false });
  const [draft, setDraft] = useState<Record<string, string>>({
    companyName: '', industry: '', companySize: '', location: '', websiteUrl: '', logoUrl: '', summary: '', description: '', benefits: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (!employer.data) return;
    setDraft({
      companyName: employer.data.companyName ?? '', industry: employer.data.industry ?? '', companySize: employer.data.companySize ?? '',
      location: employer.data.location ?? '', websiteUrl: employer.data.websiteUrl ?? '', logoUrl: employer.data.logoUrl ?? '',
      summary: employer.data.summary ?? '', description: employer.data.description ?? '', benefits: employer.data.benefits?.join(', ') ?? '',
    });
  }, [employer.data]);

  function setValue(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveCompanyProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFields = ['companyName', 'industry', 'companySize', 'location'] as const;
    if (requiredFields.some((field) => !draft[field].trim())) {
      setMessage({ tone: 'warning', text: vi ? 'Hãy điền đủ các trường có dấu * để đăng công việc.' : 'Complete every field marked * before posting jobs.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload: EmployerProfileUpsertPayload = {
      companyName: draft.companyName.trim(), industry: draft.industry.trim(), companySize: draft.companySize.trim(), location: draft.location.trim(),
      websiteUrl: draft.websiteUrl.trim() || null, logoUrl: draft.logoUrl.trim() || null, summary: draft.summary.trim() || null,
      description: draft.description.trim() || null, benefits: draft.benefits.split(',').map((item) => item.trim()).filter(Boolean),
    };
    try {
      const saved = await careerfitApi.updateMyEmployer(payload);
      queryClient.setQueryData(['recruiter-employer-profile'], saved);
      navigate('/recruiter');
    } catch (error) {
      setMessage({ tone: 'error', text: readableError(error, vi ? 'Không thể lưu hồ sơ công ty.' : 'Could not save the company profile.', language) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="company-setup-page">
      <section className="company-setup-hero">
        <p className="eyebrow">Recruiter</p>
        <h1>{vi ? 'Thiết lập hồ sơ công ty' : 'Set up your company profile'}</h1>
        <p>{vi ? 'Thông tin này sẽ tự động xuất hiện trên các JD bạn đăng và trang nhà tuyển dụng.' : 'This information appears automatically on your job posts and employer page.'}</p>
      </section>
      <form className="company-setup-card" onSubmit={saveCompanyProfile}>
        <EmployerProfileSuggestionLists />
        <div className="company-setup-heading">
          <Building2 size={24} />
          <div><h2>{vi ? 'Thông tin cơ bản' : 'Basic information'}</h2><p>{vi ? 'Các trường có dấu * là bắt buộc trước khi đăng JD.' : 'Fields marked * are required before you can post a job.'}</p></div>
        </div>
        <div className="settings-grid">
          <label><span>{vi ? 'Tên công ty' : 'Company name'} <em className="required-marker">*</em></span><input autoComplete="organization" value={draft.companyName} onChange={(event) => setValue('companyName', event.target.value)} placeholder={vi ? 'Ví dụ: CareerFit Technology' : 'Example: CareerFit Technology'} required /></label>
          <label><span>{vi ? 'Lĩnh vực' : 'Industry'} <em className="required-marker">*</em></span><input list="employer-industry-suggestions" value={draft.industry} onChange={(event) => setValue('industry', event.target.value)} placeholder={vi ? 'Chọn hoặc nhập lĩnh vực' : 'Choose or enter an industry'} required /></label>
          <label><span>{vi ? 'Quy mô công ty' : 'Company size'} <em className="required-marker">*</em></span><input list="employer-company-size-suggestions" value={draft.companySize} onChange={(event) => setValue('companySize', event.target.value)} placeholder={vi ? 'Chọn hoặc nhập quy mô' : 'Choose or enter a company size'} required /></label>
          <label><span>{vi ? 'Địa điểm' : 'Location'} <em className="required-marker">*</em></span><JobAutocompleteInput field="location" value={draft.location} onValueChange={(value) => setValue('location', value)} placeholder={vi ? 'Ví dụ: TP. Hồ Chí Minh' : 'Example: Ho Chi Minh City'} required /></label>
          <label><span>{vi ? 'Website' : 'Website'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><input autoComplete="url" type="url" value={draft.websiteUrl} onChange={(event) => setValue('websiteUrl', event.target.value)} placeholder="https://company.example" /></label>
          <label><span>{vi ? 'URL logo' : 'Logo URL'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><input type="url" value={draft.logoUrl} onChange={(event) => setValue('logoUrl', event.target.value)} placeholder="https://company.example/logo.png" /></label>
          <label className="settings-grid-wide"><span>{vi ? 'Giới thiệu ngắn' : 'Short introduction'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><textarea rows={3} value={draft.summary} onChange={(event) => setValue('summary', event.target.value)} placeholder={vi ? 'Mô tả ngắn về công ty và đội ngũ.' : 'A short description of your company and team.'} /></label>
        </div>
        {message ? <ActionMessage {...message} /> : null}
        <div className="filter-modal-actions">
          <button type="button" onClick={() => navigate('/recruiter')}>{vi ? 'Để sau' : 'Do this later'}</button>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu và tiếp tục' : 'Save and continue')}</button>
        </div>
      </form>
    </main>
  );
}

function ConnectedSettingsPage({ role, onLogout, onDeleteAccount }: { role: 'candidate' | 'recruiter'; onLogout: () => void; onDeleteAccount: () => Promise<void> }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const vi = language === 'vi';
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const { data, isLoading, error } = useQuery<any>({ queryKey: ['settings', role], queryFn: careerfitApi.getSettings });

  useEffect(() => { if (data) setDraft((data as any).values || {}); }, [data]);
  const setValue = (key: string, value: string | number | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  async function save() {
    setSaving(true); setMessage(null);
    try {
      const saved = await careerfitApi.updateSettings(draft);
      queryClient.setQueryData(['settings', role], saved);
      setDraft(saved.values ?? draft);
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
    sideItems={[[vi ? 'Vai trò' : 'Role', vi ? (role === 'candidate' ? 'Ứng viên' : 'Nhà tuyển dụng') : role], [vi ? 'Cập nhật gần nhất' : 'Last updated', (data as any)?.updatedAt ? new Date((data as any).updatedAt).toLocaleString() : '-']]}
    onSave={save} saving={saving}
    accountActions={<AccountDangerActions onLogout={onLogout} onDeleteAccount={async () => { await onDeleteAccount(); navigate('/'); }} />}
  >
    {message ? <ActionMessage {...message} /> : null}
    {role === 'recruiter' && searchParams.get('companySetup') === 'required' ? <ActionMessage tone="warning" text={vi ? 'Bạn cần hoàn thiện hồ sơ công ty trước khi đăng JD. Hãy điền các trường có dấu * bên dưới.' : 'Complete the company profile before posting a job. Fill in the fields marked * below.'} /> : null}
    {isLoading ? <p>{vi ? 'Đang tải cài đặt...' : 'Loading settings...'}</p> : null}
    {error ? <p className="form-error">{readableError(error, vi ? 'Không thể tải cài đặt.' : 'Could not load settings.', language)}</p> : null}
    <AccountDetailsSection role={role} />
    {!isLoading && !error ? <DemoModeSettings data={data} role={role} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['settings', role] })} /> : null}
      {!isLoading && !error && role === 'candidate' ? <>
      <SettingsSection icon={<Bell size={20} />} title={vi ? 'Thông báo việc làm' : 'Job notifications'}>
        <div className="settings-option-grid">
          {toggle('highMatchEmail', vi ? 'Email khi có việc phù hợp cao' : 'High-match email', vi ? 'Nhận email khi có JD đạt điểm phù hợp cao.' : 'Email for strong job matches.')}
          {toggle('dailyDigest', vi ? 'Tổng hợp hằng ngày' : 'Daily digest', vi ? 'Nhận bản tóm tắt mỗi ngày.' : 'Receive a daily summary.')}
          {toggle('recruiterInviteAlerts', vi ? 'Lời mời từ nhà tuyển dụng' : 'Recruiter invitations', vi ? 'Thông báo khi nhà tuyển dụng gửi lời mời ứng tuyển.' : 'Alert on recruiter invitations.')}
        </div>
        <div className="settings-grid"><label>{vi ? 'Ngưỡng cảnh báo' : 'Alert threshold'}<input type="number" min="0" max="100" value={Number(draft.alertThreshold ?? 90)} onChange={(e) => setValue('alertThreshold', Number(e.target.value))} /></label><label>{vi ? 'Giờ tổng hợp' : 'Digest time'}<input type="time" value={String(draft.digestTime ?? '08:00')} onChange={(e) => setValue('digestTime', e.target.value)} /></label></div>
      </SettingsSection>
      <SettingsSection icon={<ShieldCheck size={20} />} title={vi ? 'Quyền riêng tư' : 'Privacy'}><div className="settings-option-grid">{toggle('showPortfolioAfterApply', vi ? 'Hiển thị portfolio sau khi ứng tuyển' : 'Show portfolio after apply', vi ? 'Cho nhà tuyển dụng xem portfolio sau khi bạn ứng tuyển.' : 'Reveal portfolio after applying.')}{toggle('allowPotentialDiscovery', vi ? 'Cho phép xuất hiện trong nhóm tiềm năng' : 'Allow potential discovery', vi ? 'Hồ sơ có thể xuất hiện trong nhóm ứng viên tiềm năng.' : 'Appear in potential discovery.')}{toggle('hidePhoneUntilInvite', vi ? 'Ẩn số điện thoại đến khi có lời mời' : 'Hide phone until invite', vi ? 'Chỉ hiện số điện thoại sau khi nhận được lời mời.' : 'Reveal phone only after invite.')}</div></SettingsSection>
      <SettingsSection icon={<KeyRound size={20} />} title={vi ? 'Phiên đăng nhập' : 'Login session'}><div className="settings-grid"><label>{vi ? 'Thời hạn phiên (ngày)' : 'Session duration (days)'}<input type="number" min="1" max="90" value={Number(draft.sessionTimeoutDays ?? 30)} onChange={(e) => setValue('sessionTimeoutDays', Number(e.target.value))} /></label></div></SettingsSection>
    </> : null}
    {!isLoading && !error && role === 'recruiter' ? <>
      <EmployerProfileSettings />
      <SettingsSection icon={<Users size={20} />} title={vi ? 'Quy trình tuyển dụng' : 'Recruiting workflow'}><div className="settings-option-grid">{toggle('hiringManagerReview', vi ? 'Quản lý tuyển dụng duyệt' : 'Hiring manager review', vi ? 'Yêu cầu một bước duyệt nội bộ trước khi xử lý hồ sơ.' : 'Require internal review.')}{toggle('sharedCandidateNotes', vi ? 'Chia sẻ ghi chú ứng viên' : 'Shared candidate notes', vi ? 'Cho phép các thành viên trong nhóm xem ghi chú về ứng viên.' : 'Share candidate notes with team.')}{toggle('restrictSalaryVisibility', vi ? 'Giới hạn quyền xem lương' : 'Restrict salary visibility', vi ? 'Ẩn trường lương với thành viên không được cấp quyền.' : 'Limit salary visibility.')}</div></SettingsSection>
      <SettingsSection icon={<Briefcase size={20} />} title={vi ? 'Mặc định JD' : 'JD defaults'}><div className="settings-grid"><label>{vi ? 'Mô hình làm việc' : 'Work model'}<select value={String(draft.defaultWorkingModel ?? 'HYBRID')} onChange={(e) => setValue('defaultWorkingModel', e.target.value)}><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label><label>{vi ? 'Kiểu lương' : 'Salary mode'}<select value={String(draft.defaultSalaryMode ?? 'RANGE')} onChange={(e) => setValue('defaultSalaryMode', e.target.value)}><option value="RANGE">Range</option><option value="NEGOTIABLE">Negotiable</option><option value="HIDDEN">Hidden</option></select></label><label>{vi ? 'SLA duyệt (giờ)' : 'Review SLA (hours)'}<input type="number" min="1" max="168" value={Number(draft.candidateReviewSlaHours ?? 48)} onChange={(e) => setValue('candidateReviewSlaHours', Number(e.target.value))} /></label><label>{vi ? 'Ngôn ngữ mặc định' : 'Default language'}<select value={String(draft.defaultLanguage ?? 'BILINGUAL')} onChange={(e) => setValue('defaultLanguage', e.target.value)}><option value="VI">Vietnamese</option><option value="EN">English</option><option value="BILINGUAL">Bilingual</option></select></label></div></SettingsSection>
      <SettingsSection icon={<Bell size={20} />} title={vi ? 'Thông báo tuyển dụng' : 'Recruiting notifications'}><div className="settings-option-grid">{toggle('highMatchCvAlert', vi ? 'CV điểm cao' : 'High-match CV alert', vi ? 'Thông báo CV phù hợp cao.' : 'Alert for high-scoring CVs.')}{toggle('dailyApprovalDigest', vi ? 'Tổng hợp chờ duyệt' : 'Approval digest', vi ? 'Tổng hợp hồ sơ chờ duyệt.' : 'Digest pending approvals.')}{toggle('jobClosingReminders', vi ? 'Nhắc JD sắp đóng' : 'Job closing reminders', vi ? 'Nhắc trước khi JD đóng.' : 'Reminder before job closes.')}</div></SettingsSection>
    </> : null}
  </SettingsSurface>;
}

function AccountDetailsSection({ role }: { role: 'candidate' | 'recruiter' }) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const { data: currentUser, isLoading, isError } = useQuery({
    queryKey: ['current-user'],
    queryFn: careerfitApi.getCurrentUser,
    retry: 1,
  });
  const roleName = vi ? (role === 'candidate' ? 'Ứng viên' : 'Nhà tuyển dụng') : (role === 'candidate' ? 'Candidate' : 'Recruiter');

  return <SettingsSection icon={<UserRound size={20} />} title={vi ? 'Thông tin tài khoản' : 'Account details'}>
    <p className="settings-inline-note">
      {vi
        ? 'Thông tin này lấy từ tài khoản đang đăng nhập. Thông tin hồ sơ và công ty được quản lý ở các mục tương ứng bên dưới.'
        : 'This information belongs to the signed-in account. Profile and company details are managed in their respective sections below.'}
    </p>
    {isLoading ? <p>{vi ? 'Đang tải thông tin tài khoản...' : 'Loading account details...'}</p> : null}
    {isError ? <p className="form-error">{vi ? 'Không thể tải thông tin tài khoản. Hãy thử tải lại trang.' : 'Could not load account details. Try reloading the page.'}</p> : null}
    {!isLoading && !isError && currentUser ? <dl className="account-details-list">
      <div><dt>{vi ? 'Tên hiển thị' : 'Display name'}</dt><dd>{currentUser.fullName || '-'}</dd></div>
      <div><dt>Email</dt><dd>{currentUser.email || '-'}</dd></div>
      <div><dt>{vi ? 'Vai trò' : 'Role'}</dt><dd>{roleName}</dd></div>
      <div><dt>{vi ? 'Trạng thái email' : 'Email status'}</dt><dd>{currentUser.emailVerified ? (vi ? 'Đã xác minh' : 'Verified') : (vi ? 'Chưa xác minh' : 'Not verified')}</dd></div>
      <div className="account-details-id"><dt>{vi ? 'Mã tài khoản' : 'Account ID'}</dt><dd>{currentUser.id}</dd></div>
    </dl> : null}
  </SettingsSection>;
}

function EmployerProfileSettings() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const vi = language === 'vi';
  const employer = useQuery({ queryKey: ['recruiter-employer-profile'], queryFn: careerfitApi.getMyEmployer, retry: false });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (!employer.data) return;
    setDraft({
      companyName: employer.data.companyName ?? '', slug: employer.data.slug ?? '', logoUrl: employer.data.logoUrl ?? '', coverUrl: employer.data.coverUrl ?? '',
      summary: employer.data.summary ?? '', description: employer.data.description ?? '', industry: employer.data.industry ?? '', companySize: employer.data.companySize ?? '',
      location: employer.data.location ?? '', websiteUrl: employer.data.websiteUrl ?? '', benefits: employer.data.benefits?.join(', ') ?? '',
    });
  }, [employer.data]);

  function setValue(key: string, value: string) { setDraft((current) => ({ ...current, [key]: value })); }
  async function saveEmployer() {
    const requiredFields = ['companyName', 'industry', 'companySize', 'location'];
    if (requiredFields.some((field) => !(draft[field] ?? '').trim())) {
      setMessage({ tone: 'warning', text: vi ? 'Hãy điền đủ các trường có dấu * trước khi lưu hồ sơ công ty.' : 'Complete every field marked * before saving the company profile.' });
      return;
    }
    setSaving(true); setMessage(null);
    try {
      const saved = await careerfitApi.updateMyEmployer({
        companyName: draft.companyName?.trim() ?? '', slug: draft.slug?.trim() ?? '', logoUrl: draft.logoUrl?.trim() || null,
        coverUrl: draft.coverUrl?.trim() || null, summary: draft.summary?.trim() || null, description: draft.description?.trim() || null,
        industry: draft.industry?.trim() || null, companySize: draft.companySize?.trim() || null, location: draft.location?.trim() || null,
        websiteUrl: draft.websiteUrl?.trim() || null, benefits: (draft.benefits ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      });
      queryClient.setQueryData(['recruiter-employer-profile'], saved);
      setDraft({
        companyName: saved.companyName ?? '', slug: saved.slug ?? '', logoUrl: saved.logoUrl ?? '', coverUrl: saved.coverUrl ?? '',
        summary: saved.summary ?? '', description: saved.description ?? '', industry: saved.industry ?? '', companySize: saved.companySize ?? '',
        location: saved.location ?? '', websiteUrl: saved.websiteUrl ?? '', benefits: saved.benefits?.join(', ') ?? '',
      });
      setMessage({ tone: 'success', text: vi ? 'Đã lưu thông tin công ty. JD mới sẽ dùng tên công ty này.' : 'Company information saved. New jobs will use this company name.' });
    } catch (error) {
      setMessage({ tone: 'error', text: readableError(error, vi ? 'Không thể lưu thông tin công ty.' : 'Could not save company information.', language) });
    } finally { setSaving(false); }
  }

  return <div id="company-profile"><EmployerProfileSuggestionLists /><SettingsSection icon={<Building2 size={20} />} title={vi ? 'Thông tin công ty' : 'Company profile'}>
    <p className="settings-inline-note">{vi ? 'Tên công ty được dùng tự động khi đăng JD mới.' : 'The company name is applied automatically to new job postings.'}</p>
    {employer.isLoading ? <p>{vi ? 'Đang tải thông tin công ty...' : 'Loading company information...'}</p> : null}
    {employer.isError ? <p className="form-error">{vi ? 'Chưa có hồ sơ công ty. Hãy điền thông tin để bắt đầu đăng JD.' : 'No company profile yet. Fill this in before posting jobs.'}</p> : null}
    <div className="settings-grid">
      <label><span>{vi ? 'Tên công ty' : 'Company name'} <em className="required-marker">*</em></span><input autoComplete="organization" required value={draft.companyName ?? ''} onChange={(event) => setValue('companyName', event.target.value)} placeholder={vi ? 'Ví dụ: CareerFit Technology' : 'Example: CareerFit Technology'} /></label>
      <label><span>{vi ? 'Lĩnh vực' : 'Industry'} <em className="required-marker">*</em></span><input list="employer-industry-suggestions" required value={draft.industry ?? ''} onChange={(event) => setValue('industry', event.target.value)} placeholder={vi ? 'Chọn hoặc nhập lĩnh vực' : 'Choose or enter an industry'} /></label>
      <label><span>{vi ? 'Quy mô' : 'Company size'} <em className="required-marker">*</em></span><input list="employer-company-size-suggestions" required value={draft.companySize ?? ''} onChange={(event) => setValue('companySize', event.target.value)} placeholder={vi ? 'Chọn hoặc nhập quy mô' : 'Choose or enter a company size'} /></label>
      <label><span>{vi ? 'Địa điểm' : 'Location'} <em className="required-marker">*</em></span><JobAutocompleteInput field="location" value={draft.location ?? ''} onValueChange={(value) => setValue('location', value)} placeholder={vi ? 'Ví dụ: TP. Hồ Chí Minh' : 'Example: Ho Chi Minh City'} required /></label>
      <label><span>{vi ? 'Website' : 'Website'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><input autoComplete="url" type="url" value={draft.websiteUrl ?? ''} onChange={(event) => setValue('websiteUrl', event.target.value)} placeholder="https://company.example" /></label>
      <label><span>{vi ? 'URL logo' : 'Logo URL'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><input type="url" value={draft.logoUrl ?? ''} onChange={(event) => setValue('logoUrl', event.target.value)} placeholder="https://company.example/logo.png" /></label>
      <label className="settings-grid-wide"><span>{vi ? 'Giới thiệu ngắn' : 'Short summary'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><textarea rows={2} value={draft.summary ?? ''} onChange={(event) => setValue('summary', event.target.value)} placeholder={vi ? 'Mô tả ngắn về công ty.' : 'A short company introduction.'} /></label>
      <label className="settings-grid-wide"><span>{vi ? 'Mô tả công ty' : 'Company description'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><textarea rows={4} value={draft.description ?? ''} onChange={(event) => setValue('description', event.target.value)} placeholder={vi ? 'Văn hóa, sản phẩm, định hướng phát triển...' : 'Culture, products, and company direction...'} /></label>
      <label className="settings-grid-wide"><span>{vi ? 'Phúc lợi, ngăn cách bằng dấu phẩy' : 'Benefits, comma separated'} <small>{vi ? '(Tùy chọn)' : '(Optional)'}</small></span><input value={draft.benefits ?? ''} onChange={(event) => setValue('benefits', event.target.value)} placeholder={vi ? 'Bảo hiểm, Làm việc linh hoạt, Đào tạo' : 'Insurance, Flexible work, Training'} /></label>
    </div>
    {message ? <ActionMessage {...message} /> : null}
    <div className="filter-modal-actions"><button className="primary-action" type="button" disabled={saving} onClick={() => void saveEmployer()}>{saving ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Lưu thông tin công ty' : 'Save company profile')}</button></div>
  </SettingsSection></div>;
}

function AdminSettingsPage({ onLogout }: { onLogout: () => void }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const vi = language === 'vi';
  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ['current-user', 'admin-settings'],
    queryFn: careerfitApi.getCurrentUser,
    retry: false,
  });

  function logout() {
    onLogout();
    navigate('/');
  }

  return (
    <SettingsSurface
      eyebrow={vi ? 'Cài đặt quản trị viên' : 'Administrator settings'}
      title={vi ? 'Tài khoản quản trị' : 'Administrator account'}
      copy={vi ? 'Kiểm tra thông tin phiên đăng nhập và kết thúc phiên an toàn khi cần.' : 'Review the signed-in account and end the session securely when needed.'}
      sideTitle={vi ? 'Phiên hiện tại' : 'Current session'}
      sideItems={[
        [vi ? 'Vai trò' : 'Role', vi ? 'Quản trị viên' : 'Administrator'],
        [vi ? 'Trạng thái' : 'Status', vi ? 'Đang hoạt động' : 'Active'],
      ]}
      accountActions={<AccountLogoutAction onLogout={logout} />}
    >
      <SettingsSection icon={<UserRound size={20} />} title={vi ? 'Thông tin tài khoản' : 'Account details'}>
        {isLoading ? <p>{vi ? 'Đang tải thông tin tài khoản...' : 'Loading account details...'}</p> : null}
        {error ? <p className="form-error">{vi ? 'Không thể tải thông tin tài khoản.' : 'Could not load account details.'}</p> : null}
        {!isLoading && !error ? (
          <dl className="account-details-list">
            <div><dt>{vi ? 'Tên hiển thị' : 'Display name'}</dt><dd>{currentUser?.fullName ?? '-'}</dd></div>
            <div><dt>Email</dt><dd>{currentUser?.email ?? '-'}</dd></div>
            <div><dt>{vi ? 'Vai trò' : 'Role'}</dt><dd>{vi ? 'Quản trị viên' : 'Administrator'}</dd></div>
          </dl>
        ) : null}
      </SettingsSection>
      <SettingsSection icon={<ShieldCheck size={20} />} title={vi ? 'Bảo mật phiên' : 'Session security'}>
        <p>{vi ? 'Đăng xuất sẽ xóa phiên trên thiết bị hiện tại. Tài khoản quản trị không thể tự xóa trong phần cài đặt.' : 'Logging out clears the session on this device. Administrator accounts cannot be self-deleted from Settings.'}</p>
      </SettingsSection>
    </SettingsSurface>
  );
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
        <div className="settings-main-stack"><AppearanceSettings />{children}</div>
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
          {onSave ? <button className="primary-action full" onClick={onSave} disabled={saving}>
            <Save size={17} />
            {saving ? '...' : t('saveSettings')}
          </button> : null}
          {accountActions}
        </aside>
      </section>
    </div>
  );
}

function AccountDangerActions({
  onLogout,
  onDeleteAccount,
}: {
  onLogout: () => void;
  onDeleteAccount: () => Promise<void> | void;
}) {
  const { language, t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const vi = language === 'vi';

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
    } catch (error) {
      setDeleteError(readableError(error, vi ? 'Không thể xóa tài khoản.' : 'Could not delete account.', language));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="account-danger-actions">
      <button onClick={onLogout}>
        <LogOut size={17} />
        {t('logout')}
      </button>
      <button
        className="danger-action"
        onClick={() => { setDeleteError(null); setConfirming(true); }}
      >
        <Trash2 size={17} />
        {t('deleteAccount')}
      </button>
      {confirming ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={vi ? 'Xác nhận xóa tài khoản' : 'Confirm account deletion'} onMouseDown={(event) => !deleting && event.target === event.currentTarget && setConfirming(false)}>
          <section className="candidate-review-modal portfolio-confirm-modal">
            <div>
              <p className="eyebrow">CareerFit</p>
              <h2>{vi ? 'Xóa vĩnh viễn tài khoản?' : 'Permanently delete account?'}</h2>
              <p>{vi ? 'CV hoặc JD, hồ sơ, ứng tuyển, dữ liệu đã lưu và cài đặt thuộc tài khoản sẽ bị xóa. Bạn có thể đăng ký lại bằng cùng email sau đó.' : 'Your CVs or jobs, profile, applications, saved data, and settings will be deleted. You can register again with the same email afterwards.'}</p>
              {deleteError ? <p className="form-error">{deleteError}</p> : null}
            </div>
            <div className="filter-modal-actions">
              <button type="button" disabled={deleting} onClick={() => setConfirming(false)}>{vi ? 'Hủy' : 'Cancel'}</button>
              <button className="danger-action" type="button" disabled={deleting} onClick={deleteAccount}><Trash2 size={17} />{deleting ? (vi ? 'Đang xóa...' : 'Deleting...') : (vi ? 'Xóa tài khoản' : 'Delete account')}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AppearanceSettings() {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const vi = language === 'vi';

  return (
    <SettingsSection icon={theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />} title={vi ? 'Giao diện' : 'Appearance'}>
      <p className="settings-inline-note">{vi ? 'Chế độ hiển thị được lưu trên thiết bị này và áp dụng cho toàn bộ tài khoản.' : 'Your display choice is saved on this device and applies across every account.'}</p>
      <div className="theme-choice" role="radiogroup" aria-label={vi ? 'Chọn giao diện' : 'Choose appearance'}>
        <button className={theme === 'light' ? 'active' : ''} type="button" role="radio" aria-checked={theme === 'light'} onClick={() => setTheme('light')}><Sun size={17} />{vi ? 'Sáng' : 'Light'}</button>
        <button className={theme === 'dark' ? 'active' : ''} type="button" role="radio" aria-checked={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={17} />{vi ? 'Tối' : 'Dark'}</button>
      </div>
    </SettingsSection>
  );
}

function AccountLogoutAction({ onLogout }: { onLogout: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="account-danger-actions">
      <button onClick={onLogout}>
        <LogOut size={17} />
        {t('logout')}
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

function SettingToggle({
  title,
  detail,
  checked,
  onChange,
  disabled
}: {
  title: string;
  detail: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} readOnly={!onChange} />
    </label>
  );
}

function RecruiterHomePage() {
  const { t, language } = useLanguage();
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
        <StatCard label={t('activeJobs')} value={summary?.activeJobs ?? 0} detail={`${summary?.totalJobs ?? 0} ${t('jobs')}`} />
        <StatCard label={t('pendingApprovals')} value={summary?.pendingReview ?? 0} detail="HITL queue" />
        <StatCard label={t('applicants')} value={summary?.totalApplicants ?? 0} detail={language === 'vi' ? 'Tổng hồ sơ đã nhận' : 'Total received applications'} />
        <StatCard label={t('newJobs')} value={summary?.recentJobs ?? 0} detail={language === 'vi' ? '30 ngày gần nhất' : 'Last 30 days'} />
      </section>
      <RecruiterOverviewPanel />
    </div>
  );
}

function RecruiterOverviewPanel() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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
            <span><JobPostingStatus status={job.postingStatus ?? 'ACTIVE'} language={language} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CreateJobModal({ language, onClose, onSubmit, onSaveDraft, submitting, initial, companyName }: {
  language: 'vi' | 'en';
  onClose: () => void;
  onSubmit: (payload: CreateJobPayload) => Promise<void>;
  onSaveDraft: (payload: CreateJobPayload) => Promise<void>;
  submitting: boolean;
  initial?: Job;
  companyName?: string;
}) {
  const [salaryMin, setSalaryMin] = useState(initial?.salaryMin?.toLocaleString('en-US') ?? '');
  const [salaryMax, setSalaryMax] = useState(initial?.salaryMax?.toLocaleString('en-US') ?? '');
  const [qualitySignals, setQualitySignals] = useState<Array<{ severity: 'ERROR' | 'WARNING' | 'QUALITY_FLAG'; code: string; field: string; message: string }>>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewPayload, setReviewPayload] = useState<CreateJobPayload | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const isDraft = initial?.postingStatus === 'DRAFT';

  function formatSalaryInput(value: string) {
    const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    return digits ? Number(digits).toLocaleString('en-US') : '';
  }

  function readPayload(formElement: HTMLFormElement): CreateJobPayload {
    const form = new FormData(formElement);
    const csv = (name: string) => String(form.get(name) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const nullableNumber = (name: string) => {
      const value = String(form.get(name) ?? '').replace(/,/g, '').trim();
      return value ? Number(value) : null;
    };
    return {
      title: String(form.get('title') ?? '').trim(), company: companyName?.trim() || String(form.get('company') ?? '').trim(),
      originalText: String(form.get('originalText') ?? '').trim(), requiredSkills: csv('requiredSkills'),
      niceToHaveSkills: csv('niceToHaveSkills'), seniorityLevel: String(form.get('seniorityLevel') ?? ''),
      employmentType: String(form.get('employmentType') ?? ''), location: String(form.get('location') ?? '').trim(),
      remoteType: String(form.get('remoteType') ?? ''), salaryMode: String(form.get('salaryMode') ?? 'NEGOTIABLE'),
      salaryMin: nullableNumber('salaryMin'), salaryMax: nullableNumber('salaryMax'),
      salaryCurrency: String(form.get('salaryCurrency') ?? 'VND'), salaryType: 'MONTHLY', salaryIsVisible: true,
      domain: String(form.get('domain') ?? '').trim(), language, isUrgent: initial?.isUrgent ?? false,
    };
  }

  function qualityPayload(payload: CreateJobPayload) {
    return {
      originalText: payload.originalText,
      requiredSkills: payload.requiredSkills,
      seniorityLevel: payload.seniorityLevel,
      employmentType: payload.employmentType,
      salaryMode: payload.salaryMode,
      salaryMin: payload.salaryMin,
      salaryMax: payload.salaryMax,
      salaryCurrency: payload.salaryCurrency,
      salaryType: payload.salaryType,
    };
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const payload = readPayload(form);
    const hasMeaningfulInput = Boolean(payload.title || payload.originalText || payload.requiredSkills?.length);
    if (!hasMeaningfulInput) {
      setQualitySignals([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await careerfitApi.previewJobQuality(qualityPayload(payload), controller.signal);
        setQualitySignals(result.qualitySignals ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setQualitySignals([]);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [editorRevision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (initial && !isDraft) {
      const form = formRef.current;
      if (!form || !form.reportValidity()) return;
      await onSubmit(readPayload(form));
      return;
    }
    await openReview();
  }

  async function openReview() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const payload = readPayload(form);
    try {
      const result = await careerfitApi.previewJobQuality(qualityPayload(payload));
      setQualitySignals(result.qualitySignals ?? []);
      setReviewPayload(payload);
      setIsReviewOpen(true);
    } catch {
      setReviewPayload(payload);
      setIsReviewOpen(true);
    }
  }

  async function saveDraft() {
    if (!formRef.current) return;
    await onSaveDraft(readPayload(formRef.current));
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form ref={formRef} className="candidate-review-modal create-job-modal" onChange={() => setEditorRevision((value) => value + 1)} onSubmit={submit}>
        <div className="section-heading inline-heading">
          <div><p className="eyebrow">Recruiter</p><h2>{initial ? (language === 'vi' ? 'Sửa công việc' : 'Edit job') : (language === 'vi' ? 'Đăng công việc mới' : 'Post a new job')}</h2></div>
          <button type="button" aria-label={language === 'vi' ? 'Đóng' : 'Close'} onClick={onClose}><XCircle size={19} /></button>
        </div>
        <div className="settings-grid">
          <label>{language === 'vi' ? 'Chức danh' : 'Title'}<JobAutocompleteInput field="title" name="title" required maxLength={255} defaultValue={initial?.title ?? ''} /></label>
          <label>{language === 'vi' ? 'Công ty' : 'Company'}<input value={companyName ?? initial?.company ?? ''} readOnly aria-readonly="true" placeholder={language === 'vi' ? 'Cập nhật trong Cài đặt' : 'Update in Settings'} /></label>
          <label>{language === 'vi' ? 'Kỹ năng bắt buộc' : 'Required skills'}<SkillAutocompleteInput name="requiredSkills" placeholder="Java, Spring Boot, PostgreSQL" required defaultValue={initial?.requiredSkills.join(', ') ?? ''} /></label>
          <label>{language === 'vi' ? 'Kỹ năng ưu tiên' : 'Nice-to-have skills'}<SkillAutocompleteInput name="niceToHaveSkills" placeholder="Docker, AWS" defaultValue={initial?.optionalSkills.join(', ') ?? ''} /></label>
          <label>{language === 'vi' ? 'Cấp bậc' : 'Seniority'}<select name="seniorityLevel" defaultValue={initial?.seniority ?? 'MID'}><option value="INTERN">Intern</option><option value="FRESHER">Fresher</option><option value="JUNIOR">Junior</option><option value="MID">Mid</option><option value="SENIOR">Senior</option><option value="LEAD">Lead</option></select></label>
          <label>{language === 'vi' ? 'Loại việc làm' : 'Employment type'}<select name="employmentType" defaultValue={initial?.employmentType ?? 'FULL_TIME'}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></select></label>
          <label>{language === 'vi' ? 'Địa điểm' : 'Location'}<JobAutocompleteInput field="location" name="location" defaultValue={initial?.location.split(',')[0] ?? ''} /></label>
          <label>{language === 'vi' ? 'Hình thức làm việc' : 'Work model'}<select name="remoteType" defaultValue={initial?.remoteType ?? 'HYBRID'}><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option><option value="REMOTE">Remote</option></select></label>
          <label>{language === 'vi' ? 'Kiểu lương' : 'Salary mode'}<select name="salaryMode" defaultValue={initial?.salaryMode ?? 'RANGE'}><option value="NEGOTIABLE">Negotiable</option><option value="RANGE">Range</option><option value="UP_TO">Up to</option><option value="FROM">From</option><option value="HIDDEN">Hidden</option></select></label>
          <label>{language === 'vi' ? 'Lương tối thiểu' : 'Minimum salary'}<input name="salaryMin" inputMode="numeric" value={salaryMin} onChange={(event) => setSalaryMin(formatSalaryInput(event.target.value))} placeholder="15,000,000" /></label>
          <label>{language === 'vi' ? 'Lương tối đa' : 'Maximum salary'}<input name="salaryMax" inputMode="numeric" value={salaryMax} onChange={(event) => setSalaryMax(formatSalaryInput(event.target.value))} placeholder="25,000,000" /></label>
          <label>{language === 'vi' ? 'Đơn vị tiền tệ' : 'Currency'}<select name="salaryCurrency" defaultValue={initial?.salaryCurrency ?? 'VND'}><option value="VND">VND</option><option value="USD">USD</option></select></label>
          <label>{language === 'vi' ? 'Lĩnh vực' : 'Domain'}<JobAutocompleteInput field="domain" name="domain" placeholder="Software" defaultValue={initial?.domain ?? ''} /></label>
          <label className="settings-grid-wide">{language === 'vi' ? 'Mô tả công việc đầy đủ' : 'Full job description'}<textarea name="originalText" rows={7} required defaultValue={initial?.description ?? ''} /></label>
        </div>
        <JobQualitySignals signals={qualitySignals} language={language} />
        <div className="filter-modal-actions">
          <button type="button" onClick={onClose}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button>
          <button type="button" disabled={submitting} onClick={saveDraft}>{submitting ? '...' : (language === 'vi' ? 'Lưu nháp' : 'Save draft')}</button>
          <button className="primary-action" disabled={submitting}>{submitting ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : isDraft || !initial ? (language === 'vi' ? 'Xem lại trước khi đăng' : 'Review before publishing') : (language === 'vi' ? 'Lưu thay đổi' : 'Save changes')}</button>
        </div>
      </form>
      {isReviewOpen && reviewPayload ? (
        <div className="modal-backdrop quality-review-backdrop" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Xem lại chất lượng JD' : 'Review job quality'}>
          <section className="candidate-review-modal quality-review-modal">
            <div className="section-heading inline-heading"><div><p className="eyebrow">Quality check</p><h2>{language === 'vi' ? 'Xem lại trước khi đăng' : 'Review before publishing'}</h2></div><button type="button" onClick={() => setIsReviewOpen(false)}><XCircle size={19} /></button></div>
            <p>{language === 'vi' ? 'JD sẽ hiển thị cho ứng viên và bắt đầu matching sau khi bạn xác nhận đăng.' : 'The job becomes visible and starts matching after publishing.'}</p>
            <JobQualitySignals signals={qualitySignals} language={language} review />
            <div className="filter-modal-actions"><button type="button" onClick={() => setIsReviewOpen(false)}>{language === 'vi' ? 'Quay lại chỉnh sửa' : 'Back to edit'}</button><button className="primary-action" type="button" disabled={submitting || qualitySignals.some((signal) => signal.severity === 'ERROR')} onClick={() => onSubmit(reviewPayload)}>{language === 'vi' ? 'Đăng công việc' : 'Publish job'}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function JobQualitySignals({ signals, language, review = false }: { signals: Array<{ severity: 'ERROR' | 'WARNING' | 'QUALITY_FLAG'; code: string; field: string; message: string }>; language: 'vi' | 'en'; review?: boolean }) {
  if (signals.length === 0) return review ? <p className="quality-review-clear">{language === 'vi' ? 'Không phát hiện cảnh báo chất lượng.' : 'No quality warnings detected.'}</p> : null;
  const suggestion = (code: string) => {
    const vi: Record<string, string> = {
      JD_FRESHER_EXPERIENCE_MISMATCH: 'Gợi ý: giảm yêu cầu xuống tối đa 2 năm, hoặc đổi cấp bậc sang Junior/Mid.',
      JD_SENIORITY_EXPERIENCE_MISMATCH: 'Gợi ý: kiểm tra lại sự nhất quán giữa cấp bậc và số năm kinh nghiệm.',
      JD_INTERN_SALARY_HIGH: 'Gợi ý: kiểm tra đơn vị lương, tiền tệ hoặc mức lương cho Intern.',
      JD_TOO_SHORT: 'Gợi ý: bổ sung trách nhiệm, kỹ năng, phạm vi công việc và tiêu chí thành công.',
      JD_REQUIRED_SKILLS_EMPTY: 'Gợi ý: thêm kỹ năng bắt buộc để cải thiện matching và giải thích điểm.',
      SALARY_RANGE_REQUIRED: 'Gợi ý: nhập đủ lương tối thiểu và tối đa, hoặc chọn kiểu lương khác.',
    };
    return language === 'vi' ? vi[code] : undefined;
  };
  return <section className={`job-quality-signals${review ? ' review' : ''}`} aria-live="polite"><strong>{language === 'vi' ? 'Kiểm tra chất lượng JD' : 'JD quality check'}</strong>{signals.map((signal) => <article className={`quality-signal ${signal.severity.toLowerCase()}`} key={`${signal.code}-${signal.field}`}><span>{signal.severity === 'ERROR' ? (language === 'vi' ? 'Cần sửa' : 'Needs fixing') : (language === 'vi' ? 'Cần xem lại' : 'Review')}</span><div><p>{signal.message}</p>{suggestion(signal.code) ? <small>{suggestion(signal.code)}</small> : null}</div></article>)}</section>;
}

function RecruiterPotentialRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/recruiter/talent-pool${jobId ? `?job=${encodeURIComponent(jobId)}&tab=all` : ''}`} replace />;
}

function RecruiterTalentPoolPage() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: recruiterJobs = [], isLoading: isJobsLoading, isError: jobsLoadFailed, refetch: refetchJobs } = useRecruiterJobs();
  const selectedJobId = searchParams.get('job') ?? recruiterJobs[0]?.id ?? '';
  const selectedJob = recruiterJobs.find((job) => job.id === selectedJobId) ?? recruiterJobs[0] ?? null;
  const activeTab = searchParams.get('tab') === 'bookmarked'
    ? 'bookmarked'
    : searchParams.get('tab') === 'invited'
      ? 'invited'
      : 'all';
  const candidateQuery = searchParams.get('candidateQuery') ?? '';
  const minimumScore = Number(searchParams.get('minScore') ?? 0) || 0;
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidateItem | null>(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedJob || searchParams.get('job')) return;
    const params = new URLSearchParams(searchParams);
    params.set('job', selectedJob.id);
    params.set('tab', 'all');
    setSearchParams(params, { replace: true });
  }, [searchParams, selectedJob, setSearchParams]);

  const highMatchingQuery = useQuery({
    queryKey: ['recruiter-talent-pool', selectedJob?.id, 'high', candidateQuery, minimumScore],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterTalentPool(selectedJob!.id, {
      group: 'high',
      candidateQuery: candidateQuery || undefined,
      minScore: minimumScore,
      sort: 'score_desc',
      page: 0,
      size: 30,
    }),
  });
  const potentialQuery = useQuery({
    queryKey: ['recruiter-talent-pool', selectedJob?.id, 'potential', candidateQuery, minimumScore],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterTalentPool(selectedJob!.id, {
      group: 'potential',
      candidateQuery: candidateQuery || undefined,
      minScore: minimumScore,
      sort: 'score_desc',
      page: 0,
      size: 30,
    }),
  });
  const bookmarksQuery = useQuery({
    queryKey: ['recruiter-talent-bookmarks', selectedJob?.id],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterTalentBookmarks(selectedJob!.id),
  });
  const invitationsQuery = useQuery({
    queryKey: ['recruiter-talent-invitations', selectedJob?.id],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterTalentInvitations(selectedJob!.id),
  });
  const bookmarks = bookmarksQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const hasCandidateFilter = candidateQuery.trim().toLowerCase();
  const filterCandidates = (items: RecruiterCandidateItem[]) => !hasCandidateFilter ? items : items.filter((item) => [item.name, item.title, item.location, ...(item.topSkills ?? [])].join(' ').toLowerCase().includes(hasCandidateFilter));
  const filteredBookmarks = filterCandidates(bookmarks).filter((item) => item.score >= minimumScore);
  const filteredInvitations = filterCandidates(invitations).filter((item) => item.score >= minimumScore);
  const totalMatchingCandidates = (highMatchingQuery.data?.total ?? 0) + (potentialQuery.data?.total ?? 0);

  function updatePoolQuery(changes: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params);
  }

  async function refreshTalentPool() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recruiter-talent-pool', selectedJob?.id] }),
      queryClient.invalidateQueries({ queryKey: ['recruiter-talent-bookmarks', selectedJob?.id] }),
      queryClient.invalidateQueries({ queryKey: ['recruiter-talent-invitations', selectedJob?.id] }),
    ]);
  }

  async function toggleBookmark(candidate: RecruiterCandidateItem) {
    if (!selectedJob) return;
    setUpdatingCandidateId(candidate.candidateId);
    setActionMessage(null);
    try {
      if (candidate.isBookmarked) {
        await careerfitApi.removeRecruiterCandidateBookmark(selectedJob.id, candidate.candidateId);
        setActionMessage({ tone: 'success', text: language === 'vi' ? `Đã bỏ lưu ${candidate.name} khỏi Talent Pool.` : `${candidate.name} removed from the Talent Pool.` });
      } else {
        await careerfitApi.bookmarkRecruiterCandidate(selectedJob.id, candidate.candidateId);
        setActionMessage({ tone: 'success', text: language === 'vi' ? `Đã lưu ${candidate.name} vào Talent Pool.` : `${candidate.name} saved to the Talent Pool.` });
      }
      await refreshTalentPool();
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể cập nhật Talent Pool.' : 'Could not update the Talent Pool.', language) });
    } finally {
      setUpdatingCandidateId(null);
    }
  }

  async function inviteCandidate(candidate: RecruiterCandidateItem) {
    if (!selectedJob) return;
    setUpdatingCandidateId(candidate.candidateId);
    setActionMessage(null);
    try {
      await careerfitApi.inviteCandidate(selectedJob.id, candidate.candidateId);
      await refreshTalentPool();
      setActionMessage({ tone: 'success', text: language === 'vi' ? `Đã gửi lời mời đến ${candidate.name}.` : `Invitation sent to ${candidate.name}.` });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể gửi lời mời.' : 'Could not send invitation.', language) });
    } finally {
      setUpdatingCandidateId(null);
    }
  }

  async function withdrawInvitation(candidate: RecruiterCandidateItem) {
    if (!candidate.applicationId) return;
    setUpdatingCandidateId(candidate.candidateId);
    setActionMessage(null);
    try {
      await careerfitApi.withdrawRecruiterInvitation(candidate.applicationId);
      await refreshTalentPool();
      setActionMessage({ tone: 'success', text: language === 'vi' ? `Đã rút lời mời của ${candidate.name}.` : `Invitation to ${candidate.name} withdrawn.` });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể rút lời mời.' : 'Could not withdraw invitation.', language) });
    } finally {
      setUpdatingCandidateId(null);
    }
  }

  if (isJobsLoading) return <section className="panel empty-state"><p>{t('loading')}</p></section>;
  if (jobsLoadFailed) return <section className="panel empty-state"><h2>{language === 'vi' ? 'Không thể tải các JD' : 'Could not load jobs'}</h2><button onClick={() => refetchJobs()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button></section>;
  if (!selectedJob) return <section className="panel empty-state"><h2>{language === 'vi' ? 'Chưa có JD để tạo Talent Pool' : 'No job available for a Talent Pool'}</h2><p>{language === 'vi' ? 'Hãy đăng một JD trước khi xem các ứng viên tiềm năng.' : 'Post a job before reviewing potential candidates.'}</p></section>;

  function renderCandidateCard(item: RecruiterCandidateItem) {
    const invitationCanBeWithdrawn = item.isInvited && item.applicationStatus === 'INVITED' && Boolean(item.applicationId);
    return <article className="candidate-review-card talent-candidate-card" key={`${item.candidateId}-${item.applicationId ?? item.matchingId ?? 'card'}`}>
      <div className="candidate-review-main"><div className="candidate-avatar">{item.initials}</div><div><div className="talent-candidate-name"><h4>{item.name}</h4>{item.isBookmarked ? <span className="talent-state-badge bookmarked">{language === 'vi' ? 'Đã đánh dấu' : 'Bookmarked'}</span> : null}{item.isInvited ? <span className="talent-state-badge invited">{formatTalentInvitationState(item.invitationState, language)}</span> : null}</div><p>{item.title}</p><small>{item.location ?? (language === 'vi' ? 'Chưa cập nhật địa điểm' : 'Location not provided')}</small>{item.isPotential ? <PotentialBadge candidateName={item.name} jobTitle={selectedJob.title} /> : null}</div></div>
      <div className="talent-candidate-context"><span className="talent-score-chip">{item.score}% · {item.label}</span>{item.matchReasons?.length ? <ReasonChips reasons={item.matchReasons.slice(0, 2)} /> : null}{item.isPotential && item.potentialReason ? <small>{item.potentialReason}</small> : null}</div>
      <div className="candidate-review-actions"><button className={item.isBookmarked ? 'saved-talent-action' : ''} disabled={updatingCandidateId === item.candidateId} onClick={() => toggleBookmark(item)}><Bookmark size={16} />{item.isBookmarked ? (language === 'vi' ? 'Bỏ đánh dấu' : 'Remove bookmark') : (language === 'vi' ? 'Đánh dấu' : 'Bookmark')}</button><button onClick={() => setSelectedCandidate(item)}>{t('viewCv')}</button>{invitationCanBeWithdrawn ? <button className="talent-withdraw-action" disabled={updatingCandidateId === item.candidateId} onClick={() => withdrawInvitation(item)}>{language === 'vi' ? 'Rút lời mời' : 'Withdraw invite'}</button> : !item.isInvited && !item.hasApplied ? <button className="primary-action" disabled={updatingCandidateId === item.candidateId} onClick={() => inviteCandidate(item)}>{t('invite')}</button> : null}</div>
    </article>;
  }

  function renderCandidateGroup(tone: 'matching' | 'potential', title: string, description: string, query: typeof highMatchingQuery, candidates: RecruiterCandidateItem[], emptyCopy: string) {
    return <section className={`talent-candidate-group ${tone}`}>
      <div className="talent-candidate-group-heading"><div><h4>{title}</h4><p>{description}</p></div><span>{query.data?.total ?? 0}</span></div>
      {query.isLoading ? <p className="talent-group-state">{t('loading')}</p> : query.isError ? <div className="talent-group-state"><span>{language === 'vi' ? 'Không thể tải nhóm CV này.' : 'Could not load this CV group.'}</span><button type="button" onClick={() => void query.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button></div> : candidates.length === 0 ? <p className="talent-group-state">{emptyCopy}</p> : <div className="recruiter-candidate-list talent-candidate-list">{candidates.map(renderCandidateCard)}</div>}
    </section>;
  }

  return (
    <section className="talent-pool-page">
      <div className="talent-pool-workspace">
        <aside className="talent-job-list" aria-label={language === 'vi' ? 'Danh sách việc làm' : 'Job list'}>
          <div className="talent-job-list-heading"><span>{language === 'vi' ? 'Danh sách JD' : 'Jobs'}</span><strong>{recruiterJobs.length}</strong></div>
          {recruiterJobs.map((job) => (
            <button key={job.id} className={job.id === selectedJob.id ? 'active' : ''} onClick={() => updatePoolQuery({ job: job.id, tab: 'all', group: undefined, candidateQuery: undefined, minScore: undefined })}>
              <strong>{job.title}</strong><span>{job.applicantCount ?? 0} {language === 'vi' ? 'hồ sơ đã ứng tuyển' : 'applied CVs'}</span>
            </button>
          ))}
        </aside>

        <div className="talent-pool-content">
          <div className="talent-pool-content-heading">
            <div><p className="eyebrow">JD</p><h3>{selectedJob.title}</h3><small>{selectedJob.company} · {selectedJob.location}</small></div>
            <JobPostingStatus status={selectedJob.postingStatus ?? 'DRAFT'} language={language} />
          </div>
          <div className="talent-pool-tabs" role="tablist" aria-label={t('talentPool')}>
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => updatePoolQuery({ tab: 'all' })} role="tab" aria-selected={activeTab === 'all'}>{language === 'vi' ? 'Danh sách CV' : 'CV list'} ({totalMatchingCandidates})</button>
            <button className={activeTab === 'bookmarked' ? 'active' : ''} onClick={() => updatePoolQuery({ tab: 'bookmarked' })} role="tab" aria-selected={activeTab === 'bookmarked'}>{language === 'vi' ? 'CV đã đánh dấu' : 'Bookmarked CVs'} ({bookmarks.length})</button>
            <button className={activeTab === 'invited' ? 'active' : ''} onClick={() => updatePoolQuery({ tab: 'invited' })} role="tab" aria-selected={activeTab === 'invited'}>{language === 'vi' ? 'CV đã gửi lời mời' : 'Invited CVs'} ({invitations.length})</button>
          </div>
          <div className="talent-pool-filter-row">
            <label><Search size={16} /><input value={candidateQuery} onChange={(event) => updatePoolQuery({ candidateQuery: event.target.value })} placeholder={language === 'vi' ? 'Lọc theo tên, vị trí, kỹ năng...' : 'Filter by name, title, skill...'} /></label>
            <select value={minimumScore} onChange={(event) => updatePoolQuery({ minScore: Number(event.target.value) || undefined })} aria-label={language === 'vi' ? 'Điểm phù hợp tối thiểu' : 'Minimum match score'}>
              <option value="0">{language === 'vi' ? 'Mọi mức điểm' : 'All scores'}</option><option value="70">70%+</option><option value="80">80%+</option><option value="90">90%+</option>
            </select>
          </div>
          {actionMessage ? <ActionMessage {...actionMessage} /> : null}
          {activeTab === 'all' ? <>
            <p className="talent-pool-hint">{language === 'vi' ? 'Ứng viên được chia thành hai nhóm dựa trên kết quả đối sánh của JD này.' : 'Candidates are separated into two groups based on this job’s matching result.'}</p>
            {renderCandidateGroup('matching', language === 'vi' ? 'CV phù hợp cao' : 'High-matching CVs', language === 'vi' ? 'Điểm phù hợp cao nhất với yêu cầu của JD.' : 'Candidates with the strongest fit for this job.', highMatchingQuery, highMatchingQuery.data?.candidates ?? [], language === 'vi' ? 'Chưa có CV phù hợp cao.' : 'No high-matching CVs yet.')}
            {renderCandidateGroup('potential', language === 'vi' ? 'CV tiềm năng cao' : 'High-potential CVs', language === 'vi' ? 'Có tiềm năng tốt dù chưa đạt mức phù hợp cao nhất.' : 'Strong potential despite not being in the highest matching group.', potentialQuery, potentialQuery.data?.candidates ?? [], language === 'vi' ? 'Chưa có CV tiềm năng cao.' : 'No high-potential CVs yet.')}
          </> : <section className="talent-candidate-group">
            <div className="talent-candidate-group-heading"><div><h4>{activeTab === 'bookmarked' ? (language === 'vi' ? 'CV đã đánh dấu' : 'Bookmarked CVs') : (language === 'vi' ? 'CV đã gửi lời mời' : 'Invited CVs')}</h4><p>{activeTab === 'bookmarked' ? (language === 'vi' ? 'Shortlist nội bộ, không gửi thông báo cho ứng viên.' : 'Private shortlist. Candidates are not notified.') : (language === 'vi' ? 'Bao gồm cả lời mời đã được phản hồi.' : 'Includes invitations that have already been answered.')}</p></div><span>{activeTab === 'bookmarked' ? filteredBookmarks.length : filteredInvitations.length}</span></div>
            {(activeTab === 'bookmarked' ? bookmarksQuery.isLoading : invitationsQuery.isLoading) ? <p className="talent-group-state">{t('loading')}</p> : (activeTab === 'bookmarked' ? bookmarksQuery.isError : invitationsQuery.isError) ? <div className="talent-group-state"><span>{language === 'vi' ? 'Không thể tải dữ liệu.' : 'Could not load data.'}</span><button type="button" onClick={() => void (activeTab === 'bookmarked' ? bookmarksQuery.refetch() : invitationsQuery.refetch())}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button></div> : (activeTab === 'bookmarked' ? filteredBookmarks : filteredInvitations).length === 0 ? <p className="talent-group-state">{activeTab === 'bookmarked' ? (language === 'vi' ? 'Chưa có CV nào được đánh dấu.' : 'No bookmarked CVs yet.') : (language === 'vi' ? 'Chưa gửi lời mời nào.' : 'No invitations sent yet.')}</p> : <div className="recruiter-candidate-list talent-candidate-list">{(activeTab === 'bookmarked' ? filteredBookmarks : filteredInvitations).map(renderCandidateCard)}</div>}
          </section>}
        </div>
      </div>
      {selectedCandidate && selectedJob ? <CandidateReviewModal candidate={selectedCandidate} jobId={selectedJob.id} onClose={() => setSelectedCandidate(null)} /> : null}
    </section>
  );
}

function RecruiterJobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { jobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const recruiterSubview = getRecruiterSubview(location.pathname);
  const recruiterSearchParamsKey = searchParams.toString();
  const recruiterQuery = useMemo(
    () => getRecruiterJobsQuery(new URLSearchParams(recruiterSearchParamsKey)),
    [recruiterSearchParamsKey],
  );
  const { data: recruiterJobs = [], isLoading: isRecruiterJobsLoading, refetch: refetchRecruiterJobs } = useRecruiterJobs();
  const employerProfile = useQuery({
    queryKey: ['recruiter-employer-profile'],
    queryFn: careerfitApi.getMyEmployer,
    retry: false,
  });
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const selectedJob = recruiterJobs.find((job) => job.id === jobId) ?? recruiterJobs[0] ?? null;
  const [invitingCandidateId, setInvitingCandidateId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidateItem | null>(null);
  const [applicantSearch, setApplicantSearch] = useState('');
  const applicantStatus = searchParams.get('applicantStatus') === 'approved'
    ? 'approved'
    : searchParams.get('applicantStatus') === 'rejected'
      ? 'rejected'
      : 'pending';
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('create') !== '1' || employerProfile.isLoading) return;
    if (hasRequiredEmployerProfile(employerProfile.data)) {
      setShowCreateJob(true);
      return;
    }
    navigate('/recruiter/settings?companySetup=required#company-profile', { replace: true });
  }, [employerProfile.data, employerProfile.isLoading, navigate, searchParams]);

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

  async function saveJobDraft(payload: CreateJobPayload) {
    setCreatingJob(true);
    setActionMessage(null);
    try {
      await careerfitApi.saveJobDraft(payload);
      await refetchRecruiterJobs();
      setShowCreateJob(false);
      const params = new URLSearchParams(searchParams);
      params.delete('create');
      setSearchParams(params);
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã lưu bản nháp JD. Bản nháp chưa hiển thị cho ứng viên.' : 'JD draft saved. It is not visible to candidates.' });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể lưu bản nháp.' : 'Could not save the draft.', language) });
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
      await careerfitApi.updateJob(editingJob.id, {
        ...update,
        status: editingJob.postingStatus === 'DRAFT' ? 'ACTIVE' : undefined,
      });
      await refetchRecruiterJobs();
      setEditingJob(null);
      setActionMessage({ tone: 'success', text: editingJob.postingStatus === 'DRAFT' ? (language === 'vi' ? 'Đã đăng bản nháp.' : 'Draft published.') : (language === 'vi' ? 'Đã cập nhật công việc.' : 'Job updated.') });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể cập nhật công việc.' : 'Could not update job.', language) });
    } finally {
      setCreatingJob(false);
    }
  }

  async function changeJobStatus(status: 'ACTIVE' | 'CLOSED' | 'DRAFT') {
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

  async function changeJobUrgency(isUrgent: boolean) {
    if (!selectedJob) return;
    setActionMessage(null);
    try {
      await careerfitApi.updateJobUrgency(selectedJob.id, isUrgent);
      await refetchRecruiterJobs();
      setActionMessage({
        tone: 'success',
        text: isUrgent
          ? (language === 'vi' ? 'Đã đánh dấu JD cần tuyển gấp.' : 'Job marked as urgent.')
          : (language === 'vi' ? 'Đã bỏ đánh dấu cần tuyển gấp.' : 'Urgent hiring removed.'),
      });
    } catch (error) {
      setActionMessage({ tone: 'error', text: readableError(error, language === 'vi' ? 'Không thể cập nhật trạng thái cần tuyển gấp.' : 'Could not update urgent hiring status.', language) });
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
  function openCreateJob() {
    if (!hasRequiredEmployerProfile(employerProfile.data)) {
      navigate('/recruiter/settings?companySetup=required#company-profile');
      return;
    }
    setShowCreateJob(true);
  }
  function setApplicantStatus(status: 'pending' | 'approved' | 'rejected') {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'applicantStatus', status, 'pending');
    setSearchParams(params);
  }
  const { data: applicantPage, refetch: refetchCandidates, isLoading: isCandidatesLoading, isError: candidateLoadFailed } = useQuery<any>({
    queryKey: ['recruiter-applicants', selectedJob?.id],
    enabled: Boolean(selectedJob?.id),
    queryFn: () => careerfitApi.getRecruiterApplicants(selectedJob!.id),
    refetchInterval: 60_000,
  });
  const visibleRecruiterJobs = useMemo(() => {
    const normalized = recruiterQuery.q.trim().toLowerCase();
    return recruiterJobs
      .filter((job) => {
        if (recruiterQuery.status === 'urgent' && !job.isUrgent) return false;
        if (recruiterQuery.status !== 'all' && recruiterQuery.status !== 'urgent' && job.postingStatus?.toLowerCase() !== recruiterQuery.status) return false;
        if (!normalized) return true;
        return [job.title, job.company, job.location, job.seniority, ...job.requiredSkills].join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [recruiterJobs, recruiterQuery.q, recruiterQuery.status]);
  const candidates: RecruiterCandidateItem[] = applicantPage?.candidates ?? [];
  const candidateTieScores = useMemo(() => {
    const counts = new Map<number, number>();
    candidates.forEach((item) => counts.set(item.score, (counts.get(item.score) ?? 0) + 1));
    return counts;
  }, [candidates]);
  const visibleCandidates = useMemo(() => {
    const normalized = applicantSearch.trim().toLowerCase();
    return candidates
      .filter((item) => !normalized || [item.name, item.title].join(' ').toLowerCase().includes(normalized))
      .filter((item) => applicantStatus === 'pending'
        ? item.applicationStatus === 'PENDING' || item.applicationStatus === 'AUTO_APPLIED'
        : item.applicationStatus === applicantStatus.toUpperCase())
      .sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b));
  }, [applicantSearch, applicantStatus, candidates]);
  const applicantCounts = useMemo(() => ({
    pending: candidates.filter((item) => item.applicationStatus === 'PENDING' || item.applicationStatus === 'AUTO_APPLIED').length,
    approved: candidates.filter((item) => item.applicationStatus === 'APPROVED').length,
    rejected: candidates.filter((item) => item.applicationStatus === 'REJECTED').length,
  }), [candidates]);

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
      queryClient.setQueryData<any>(['recruiter-applicants', selectedJob?.id], (current: any) => current ? {
        ...current,
        candidates: (current.candidates ?? []).map((candidate: RecruiterCandidateItem) => candidate.applicationId === item.applicationId
          ? { ...candidate, applicationStatus: status, hasApplied: true }
          : candidate),
      } : current);
      // Keep the applicant cache as the immediately visible source of truth.
      // The periodic refresh reconciles it with the backend without moving the card back to its old tab.
      await refetchRecruiterJobs();
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

  if (isRecruiterJobsLoading) {
    return <section className="panel empty-state"><p>{t('loading')}</p></section>;
  }

  if (!selectedJob) {
    return (
      <section className="panel empty-state">
        <h2>{language === 'vi' ? 'Chưa có công việc' : 'No jobs yet'}</h2>
        <p>{language === 'vi' ? 'Tạo JD đầu tiên để bắt đầu tìm ứng viên.' : 'Create the first job to start candidate discovery.'}</p>
        <button className="primary-action" onClick={openCreateJob}><Plus size={17} />{t('postJob')}</button>
        {showCreateJob ? <CreateJobModal language={language} companyName={employerProfile.data?.companyName} onClose={closeCreateJob} onSubmit={createJob} onSaveDraft={saveJobDraft} submitting={creatingJob} /> : null}
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
          <label className="recruiter-status-filter">
            <span>{language === 'vi' ? 'Lọc theo trạng thái JD' : 'Filter job status'}</span>
            <select value={recruiterQuery.status} onChange={(event) => updateRecruiterQuery('status', event.target.value)} aria-label={language === 'vi' ? 'Lọc theo trạng thái JD' : 'Filter job status'}>
              <option value="all">{language === 'vi' ? 'Tất cả' : 'All'}</option>
              <option value="active">{language === 'vi' ? 'Đang tuyển' : 'Active'}</option>
              <option value="draft">{language === 'vi' ? 'Bản nháp' : 'Draft'}</option>
              <option value="closed">{language === 'vi' ? 'Đã đóng' : 'Closed'}</option>
              <option value="urgent">{language === 'vi' ? 'Cần tuyển gấp' : 'Urgent hiring'}</option>
            </select>
          </label>
          <button className="primary-action" onClick={openCreateJob}>
            <Plus size={17} />
            {t('postJob')}
          </button>
          <button onClick={exportJobs}><FileText size={17} />{language === 'vi' ? 'Xuất CSV' : 'Export CSV'}</button>
        </div>
      </div>

      {showCreateJob ? <CreateJobModal language={language} companyName={employerProfile.data?.companyName} onClose={closeCreateJob} onSubmit={createJob} onSaveDraft={saveJobDraft} submitting={creatingJob} /> : null}
      {editingJob ? <CreateJobModal language={language} initial={editingJob} companyName={employerProfile.data?.companyName} onClose={() => setEditingJob(null)} onSubmit={saveEditedJob} onSaveDraft={async (payload) => { const { company: _company, ...update } = payload; await careerfitApi.updateJob(editingJob.id, { ...update, status: 'DRAFT' }); await refetchRecruiterJobs(); setEditingJob(null); }} submitting={creatingJob} /> : null}

      <div className="recruiter-hr-grid">
        <aside className="recruiter-requisition-panel">
          <div className="requisition-panel-head">
            <div className="requisition-panel-title">
              <h3>{t('activeRequisitions')}</h3>
              <span className="requisition-count" aria-label={language === 'vi' ? `Có ${visibleRecruiterJobs.length} JD trong danh sách hiện tại` : `${visibleRecruiterJobs.length} jobs in the current list`}>
                {visibleRecruiterJobs.length} {language === 'vi' ? 'JD' : 'jobs'}
              </span>
            </div>
            <button aria-label={t('postJob')} onClick={openCreateJob}>
              <Plus size={18} />
            </button>
          </div>
          <div className="requisition-list">
            {visibleRecruiterJobs.length === 0 ? <div className="requisition-empty-state"><strong>{language === 'vi' ? 'Không có JD phù hợp' : 'No matching jobs'}</strong><span>{language === 'vi' ? 'Thử đổi từ khóa hoặc trạng thái lọc.' : 'Try another keyword or status filter.'}</span></div> : null}
            {visibleRecruiterJobs.map((job) => {
              return (
              <button
                className={job.id === selectedJob.id ? 'requisition-row active' : 'requisition-row'}
                key={job.id}
                onClick={() => navigateRecruiterSubview(job)}
              >
                <span className="requisition-row-top">
                  <strong>{job.title}</strong>
                    <JobPostingStatus status={job.postingStatus ?? 'DRAFT'} language={language} />
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
                  <time dateTime={job.createdAt ?? undefined}>{language === 'vi' ? 'Tạo ' : 'Created '}{job.createdAt ? new Date(job.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : job.postedAt}</time>
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
                  <span />
                  {language === 'vi' ? 'Tạo ' : 'Created '}{selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : selectedJob.postedAt}
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
            <div className="recruiter-job-state-controls">
              <label className="recruiter-job-status-control">
                <span>{t('status')}</span>
              <select value={selectedJob.postingStatus ?? 'DRAFT'} aria-describedby="job-status-description" onChange={(event) => changeJobStatus(event.target.value as 'ACTIVE' | 'CLOSED' | 'DRAFT')}>
                  <option value="ACTIVE">{language === 'vi' ? 'Đang tuyển - Ứng viên có thể xem và ứng tuyển.' : 'Active - Candidates can view and apply.'}</option>
                  <option value="DRAFT">{language === 'vi' ? 'Bản nháp - Chưa công khai, chưa nhận hồ sơ.' : 'Draft - Not public and not accepting applications.'}</option>
                  <option value="CLOSED">{language === 'vi' ? 'Đã đóng - Không nhận thêm hồ sơ.' : 'Closed - No longer accepting applications.'}</option>
                </select>
                <small id="job-status-description">{getJobPostingStatus(selectedJob.postingStatus ?? 'DRAFT', language).description}</small>
              </label>
              <label className="job-urgent-toggle recruiter-job-urgent-toggle">
                <input type="checkbox" checked={Boolean(selectedJob.isUrgent)} onChange={(event) => void changeJobUrgency(event.target.checked)} />
                <span><strong>{language === 'vi' ? 'Cần tuyển gấp' : 'Urgent hiring'}</strong><small>{language === 'vi' ? 'Ưu tiên hiển thị trên Dashboard Candidate và Khách.' : 'Prioritize this job on Candidate and Guest dashboards.'}</small></span>
              </label>
            </div>
          </article>

          <div className="candidate-tabs">
            <button className={recruiterSubview === 'applicants' || recruiterSubview === 'ranking' ? 'active' : ''} onClick={() => navigateRecruiterSubview(selectedJob, 'applicants')}>
              {t('appliedCvs')} ({selectedJob.applicantCount ?? 0})
            </button>
            <button className="candidate-tabs-link" onClick={() => navigate(`/recruiter/talent-pool?job=${encodeURIComponent(selectedJob.id)}`)}>
              <Users size={16} />
              {t('talentPool')}
            </button>
          </div>

          <div className="candidate-match-filter-bar applicant-status-bar">
            <div className="applicant-status-tabs" role="tablist" aria-label={language === 'vi' ? 'Trạng thái hồ sơ ứng tuyển' : 'Application status'}>
              <button className={applicantStatus === 'pending' ? 'active' : ''} onClick={() => setApplicantStatus('pending')} type="button">{language === 'vi' ? 'Chờ xử lý' : 'Pending'} ({applicantCounts.pending})</button>
              <button className={applicantStatus === 'approved' ? 'active' : ''} onClick={() => setApplicantStatus('approved')} type="button">{language === 'vi' ? 'Đã chấp nhận' : 'Approved'} ({applicantCounts.approved})</button>
              <button className={applicantStatus === 'rejected' ? 'active' : ''} onClick={() => setApplicantStatus('rejected')} type="button">{language === 'vi' ? 'Đã từ chối' : 'Rejected'} ({applicantCounts.rejected})</button>
            </div>
            <label className="recruiter-search-field applicant-search-field">
              <Search size={16} />
              <input value={applicantSearch} onChange={(event) => setApplicantSearch(event.target.value)} placeholder={language === 'vi' ? 'Tìm ứng viên...' : 'Search candidates...'} />
            </label>
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
                <h3>{applicantStatus === 'pending' ? (language === 'vi' ? 'Không có hồ sơ chờ xử lý' : 'No pending applications') : applicantStatus === 'approved' ? (language === 'vi' ? 'Chưa có hồ sơ được chấp nhận' : 'No approved applications') : (language === 'vi' ? 'Chưa có hồ sơ bị từ chối' : 'No rejected applications')}</h3>
                <p>{applicantSearch ? (language === 'vi' ? 'Không tìm thấy ứng viên phù hợp với từ khóa.' : 'No candidate matches this search.') : (language === 'vi' ? 'Các hồ sơ ở trạng thái này sẽ hiển thị tại đây.' : 'Applications in this status will appear here.')}</p>
                <div className="empty-actions">
                  {applicantSearch ? <button onClick={() => setApplicantSearch('')}>{t('clearSearch')}</button> : <button onClick={() => navigate(`/recruiter/talent-pool?job=${encodeURIComponent(selectedJob.id)}`)}>{t('talentPool')}</button>}
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
                    {item.isPotential ? <PotentialBadge candidateName={item.name} jobTitle={selectedJob?.title} /> : null}
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
      {selectedCandidate && selectedJob ? <CandidateReviewModal candidate={selectedCandidate} jobId={selectedJob.id} onClose={() => setSelectedCandidate(null)} /> : null}
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
          <p className="analytics-explainer">{language === 'vi' ? 'Theo dõi lượng hồ sơ phù hợp được tạo theo thời gian để nhận biết thời điểm nguồn ứng viên đang tăng hoặc giảm.' : 'Track qualified matches over time to see when your candidate supply is rising or slowing down.'}</p>
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
        <div className="section-heading">
          <p className="eyebrow">{language === 'vi' ? 'Nguồn việc làm' : 'Job supply'}</p>
          <h2>{language === 'vi' ? 'JD được đăng theo thời gian' : 'Jobs posted over time'}</h2>
          <p className="analytics-explainer">{language === 'vi' ? 'Cho biết số JD mới xuất hiện trên hệ thống để đối chiếu với lượng hồ sơ phù hợp ở biểu đồ phía trên.' : 'Shows new job postings on the platform, so you can compare job supply with the matching trend above.'}</p>
        </div>
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
  const recruiterJobsQuery = useQuery({
    queryKey: ['recruiter-jobs', 'analytics'],
    queryFn: careerfitApi.getRecruiterJobs,
    enabled: role === 'recruiter',
  });
  const recruiterJobs = recruiterJobsQuery.data ?? [];
  const selectedRecruiterJobId = role === 'recruiter'
    ? searchParams.get('job') ?? recruiterJobs[0]?.id ?? ''
    : '';
  const recruiterDrilldown = useRecruiterJobAnalytics(
    role === 'recruiter' && Boolean(selectedRecruiterJobId),
    selectedRecruiterJobId,
    rangeDays,
  );
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

  function updateRecruiterJob(jobId: string) {
    const params = new URLSearchParams(searchParams);
    params.set('job', jobId);
    setSearchParams(params);
  }

  return (
    <div className="page-stack advanced-analytics-route">
      <section className="advanced-analytics-hero">
        <div>
          <p className="eyebrow">{t('advancedAnalytics')}</p>
          <h2>{t('advancedAnalyticsTitle')}</h2>
          <p>{t('advancedAnalyticsCopy')}</p>
          <p className="analytics-explainer">{language === 'vi' ? 'Số liệu được tổng hợp từ dữ liệu thật trong khoảng thời gian đã chọn. Các biểu đồ thị trường là dữ liệu toàn hệ thống; phần bên dưới là dữ liệu theo vai trò của bạn.' : 'Metrics are calculated from real data in the selected period. Market charts use platform-wide data; the section below is specific to your role.'}</p>
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
      {role === 'recruiter' ? <RecruiterJobAnalyticsDrilldown
        jobs={recruiterJobs}
        jobsLoading={recruiterJobsQuery.isLoading}
        selectedJobId={selectedRecruiterJobId}
        onJobChange={updateRecruiterJob}
        funnel={recruiterDrilldown.funnel}
        skillGaps={recruiterDrilldown.skillGaps}
        isLoading={recruiterDrilldown.isLoading}
        isError={recruiterDrilldown.isError}
        onRetry={recruiterDrilldown.refetch}
      /> : null}
    </div>
  );
}

function CandidateAdvancedPanel({ data, trends }: { data: CandidateAnalyticsOverview; trends: AdvancedTrendPoint[] }) {
  const { t, language } = useLanguage();
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
          <p className="analytics-explainer">{language === 'vi' ? 'Các kỹ năng này xuất hiện nhiều trong JD đang mở nhưng chưa được tìm thấy đầy đủ trong hồ sơ hoặc CV mặc định của bạn.' : 'These skills are common in active jobs but are not fully present in your profile or default CV.'}</p>
          <div className="skill-demand-list compact">
            {data.profileGaps.slice(0, 5).map((item) => (
              <ProgressRow key={item.skill} label={item.skill} value={item.marketDemand} max={data.profileGaps[0]?.marketDemand ?? 1} />
            ))}
          </div>
        </div>
        <div>
          <h3>{t('engagementTrend')}</h3>
          <p className="analytics-explainer">{language === 'vi' ? 'So sánh số JD được chấm điểm với số đơn bạn đã gửi theo từng ngày.' : 'Compare jobs scored for you with applications you submitted each day.'}</p>
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
  const { t, language } = useLanguage();
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
          <p className="analytics-explainer">{language === 'vi' ? 'Ưu tiên các JD có nhiều hồ sơ và điểm phù hợp tốt. Chọn một JD ở phần phân tích chi tiết để xem funnel và khoảng thiếu kỹ năng.' : 'Prioritize jobs with applicant volume and strong match scores. Select a job below for its funnel and skill-gap breakdown.'}</p>
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
          <p className="analytics-explainer">{language === 'vi' ? 'Lượt xem, lượt matching và đơn ứng tuyển của các JD do bạn quản lý theo thời gian.' : 'Views, matchings, and applications for jobs you manage over time.'}</p>
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
            <CompanyLogo company={employer.companyName} logoUrl={employer.logoUrl ?? undefined} className="employer-mark" />
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
  onSave,
  isSaved,
  savingJobId,
  showMatchMeta = true,
  compact = false,
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
  onSave?: (job: Job) => void;
  isSaved?: (jobId: string) => boolean;
  savingJobId?: string | null;
  showMatchMeta?: boolean;
  compact?: boolean;
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
    <section className={`job-list market-list${compact ? ' compact' : ''}`}>
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
            onSave={onSave}
            isSaved={isSaved?.(job.id)}
            isSaving={savingJobId === job.id}
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
          {hoveredJob?.id === job.id ? <JobHoverPreview job={job} onOpen={onOpen} onSave={onSave} onApply={onApply} isSaved={isSaved?.(job.id) ?? job.isSaved} isSaving={savingJobId === job.id} /> : null}
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

function JobHoverPreview({ job, onOpen, onSave, onApply, isSaved = false, isSaving = false }: { job: Job; onOpen: (job: Job) => void; onSave?: (job: Job) => void; onApply?: (job: Job) => void; isSaved?: boolean; isSaving?: boolean }) {
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
        <button disabled={!onSave || isSaving} onClick={() => onSave?.(job)}>{isSaving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : isSaved ? (language === 'vi' ? 'Đã lưu' : 'Saved') : t('save')}</button>
        <button disabled={!onApply || Boolean(job.applicationStatus)} title={job.applicationStatus ? (language === 'vi' ? 'Bạn đã ứng tuyển công việc này.' : 'You have already applied for this job.') : undefined} onClick={() => onApply?.(job)}>{job.applicationStatus ? (language === 'vi' ? 'Đã ứng tuyển' : 'Applied') : t('apply')}</button>
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
  showScoreFilter = false,
  onApply,
  onReset,
  onClose,
}: {
  filters: JobFilters;
  keyword: string;
  showScoreFilter?: boolean;
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
            <JobAutocompleteInput field="search" value={draftKeyword} onValueChange={setDraftKeyword} placeholder="React, TypeScript, UI Platform" />
          </label>
          <label>
            {t('seniority')}
            <select value={draftFilters.level} onChange={(event) => updateDraftFilter('level', event.target.value)}>
              {jobFilterOptions.level.map(([value, label]) => (
                <option value={value} key={value}>{localizeFilterOption('level', value, label, language)}</option>
              ))}
            </select>
          </label>
          {showScoreFilter ? (
            <label>
              <span>{t('minimumScore')}: {draftFilters.minScore || 0}%</span>
              <input type="range" min="0" max="100" step="5" value={draftFilters.minScore} onChange={(event) => setDraftFilters((current) => ({ ...current, minScore: Number(event.target.value) }))} />
            </label>
          ) : null}
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

function CandidateReviewModal({ candidate, jobId, onClose }: { candidate: RecruiterCandidateItem; jobId: string; onClose: () => void }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { data: reportSummary, refetch: refetchReportSummary } = useQuery({
    queryKey: ['cv-report-summary', candidate.cvId],
    enabled: Boolean(candidate.cvId),
    queryFn: () => careerfitApi.getCvReportSummary(candidate.cvId!),
  });
  const portfolioLinks = candidate.portfolio?.links ?? [];
  const portfolioProjects = candidate.portfolio?.projects ?? [];
  const hasPortfolio = portfolioLinks.length > 0 || portfolioProjects.length > 0;
  return <>
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${t('viewCv')} ${candidate.name}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="candidate-review-modal" onClick={(event) => event.stopPropagation()}>
        <div className="inline-heading">
          <div>
            <p className="eyebrow">{t('viewCv')}</p>
            <h2>{candidate.name}</h2>
            <PendingReportLabel summary={reportSummary} language={language} />
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
          <h3>{language === 'vi' ? 'Hồ sơ ứng viên' : 'Candidate profile'}</h3>
          <p><strong>{candidate.title}</strong>{candidate.seniority ? ` · ${candidate.seniority}` : ''}</p>
          <p>{candidate.aboutMe ?? (language === 'vi' ? 'Ứng viên chưa bổ sung phần giới thiệu hồ sơ.' : 'The candidate has not added a profile introduction.')}</p>
        </div>
        <div>
          <h3>{t('technicalSkills')}</h3>
          <ReasonChips reasons={candidate.topSkills?.length ? candidate.topSkills : [language === 'vi' ? 'Chưa có dữ liệu kỹ năng' : 'No skill data']} />
        </div>
        <div>
          <h3>{language === 'vi' ? 'Lý do phù hợp' : 'Match context'}</h3>
          {candidate.matchReasons?.length ? <ReasonChips reasons={candidate.matchReasons} /> : <p>{language === 'vi' ? 'Chưa có giải thích chi tiết từ lần chấm điểm này.' : 'No detailed explanation is available for this scoring run.'}</p>}
          {candidate.isPotential && candidate.potentialReason ? <p className="candidate-potential-context">{candidate.potentialReason}</p> : null}
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
        ) : candidate.portfolioHiddenReason ? (
          <div className="recruiter-portfolio-hidden">
            {candidate.portfolioHiddenReason}
          </div>
        ) : null}
        {candidate.cvId ? <div className="candidate-review-actions report-cv-action"><button type="button" onClick={() => setShowReportDialog(true)}><Flag size={16} />{language === 'vi' ? 'Báo cáo CV' : 'Report CV'}</button></div> : null}
      </section>
    </div>
    {showReportDialog && candidate.cvId ? <ContentReportModal targetType="CV" targetId={candidate.cvId} jobId={jobId} language={language} onClose={() => setShowReportDialog(false)} onSuccess={(report) => {
      queryClient.setQueryData<ContentReportSummary>(['cv-report-summary', candidate.cvId], (current) => ({
        targetType: 'CV', targetId: candidate.cvId!, pendingCount: (current?.pendingCount ?? 0) + 1, banned: current?.banned ?? false,
        reports: [report, ...(current?.reports ?? [])],
      }));
      setShowReportDialog(false);
      void refetchReportSummary();
    }} /> : null}
  </>;
}

function readableError(error: unknown, fallback: string, language: 'vi' | 'en') {
  if (language === 'vi') return fallback;
  return error instanceof Error && error.message ? error.message : fallback;
}

function getJobPostingStatus(status: string, language: 'vi' | 'en') {
  const normalized = status.toUpperCase();
  const values = language === 'vi'
    ? {
      ACTIVE: ['Đang tuyển', 'Ứng viên có thể xem và ứng tuyển vào JD này.'],
      DRAFT: ['Bản nháp', 'JD chưa công khai và chưa nhận hồ sơ.'],
      CLOSED: ['Đã đóng', 'JD không nhận thêm hồ sơ mới.'],
    }
    : {
      ACTIVE: ['Active', 'Candidates can view and apply for this job.'],
      DRAFT: ['Draft', 'This job is not public and cannot receive applications.'],
      CLOSED: ['Closed', 'This job no longer accepts applications.'],
    };
  const [label, description] = values[normalized as keyof typeof values] ?? [status, status];
  return { normalized, label, description };
}

function JobPostingStatus({ status, language }: { status: string; language: 'vi' | 'en' }) {
  const detail = getJobPostingStatus(status, language);
  return <em className={`job-posting-status ${detail.normalized.toLowerCase()}`} title={detail.description} aria-label={`${detail.label}. ${detail.description}`}>{detail.label}</em>;
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
    PENDING: 'Đã ứng tuyển - Đang chờ nhà tuyển dụng phản hồi',
    AUTO_APPLIED: 'AutoFit đã ứng tuyển',
    APPROVED: 'Đã được chấp nhận',
    REJECTED: 'Đã bị từ chối',
    INVITED: 'Đã được mời ứng tuyển',
    NOT_INTERESTED: 'Không tiếp tục',
    INTERVIEW_RESCHEDULED: 'Đã đổi lịch phỏng vấn',
    INTERVIEW_CANCELLED: 'Đã hủy lịch phỏng vấn',
  };
  return labels[status] ?? status;
}

function formatTalentInvitationState(state: string | undefined, language: 'vi' | 'en') {
  const normalized = state?.toUpperCase() ?? 'NONE';
  if (language === 'en') {
    return normalized === 'ACCEPTED' ? 'Accepted' : normalized === 'DECLINED' ? 'Declined' : normalized === 'INVITED' ? 'Invited' : normalized;
  }
  return normalized === 'ACCEPTED' ? 'Đã chấp nhận lời mời'
    : normalized === 'DECLINED' ? 'Đã từ chối lời mời'
      : normalized === 'INVITED' ? 'Đã gửi lời mời' : formatApplicationStatus(normalized, language);
}

function formatApplicationTimestamp(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  if (value.startsWith('Today')) return value.replace('Today', 'Hôm nay');
  if (value === 'Yesterday') return 'Hôm qua';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('vi-VN');
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

function JobDetailContent({
  job,
  showMatchMeta = true,
  onApply,
  onSave,
  savingJob = false,
  onReport,
  reportSummary,
}: {
  job: Job;
  showMatchMeta?: boolean;
  onApply?: () => void;
  onSave?: () => void;
  savingJob?: boolean;
  onReport?: () => void;
  reportSummary?: ContentReportSummary;
}) {
  const { language, t } = useLanguage();
  const description = useMemo(() => parseJobDescription(job.description), [job.description]);
  const hasApplied = Boolean(job.applicationStatus);
  const [isPotentialDetailOpen, setIsPotentialDetailOpen] = useState(false);

  function renderDescriptionLines(lines: string[], fallback: string) {
    if (!lines.length) return <p>{fallback}</p>;
    return <ul>{lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul>;
  }

  return (
    <article className="jd-detail-page">
      <section className="jd-detail-hero">
        <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} className="company-logo large" />
        <div>
          <div className="jd-company-line">
            {job.companySlug ? <a className="eyebrow company-detail-link" href={`/candidate/employers/${job.companySlug}`}>{job.company}</a> : <p className="eyebrow">{job.company}</p>}
            {job.recruiterLogin ? <span className="recruiter-login" title={t('recruiterAccount')}>{job.recruiterName || t('recruiter')} · {job.recruiterLogin}</span> : null}
          </div>
          <h1>{job.title}</h1>
          <p>{localizeUiMetadata(job.location, language)} · {localizeUiMetadata(job.seniority, language)} · {localizeUiMetadata(job.language, language)}</p>
        </div>
        <div className="jd-detail-status-stack">
          {showMatchMeta ? <MatchingBadge score={job.normalizedScore} label={job.label} /> : null}
          {job.isUrgent ? <span className="jd-detail-urgent-state"><Zap size={15} />{language === 'vi' ? 'Tuyển gấp' : 'Urgent hiring'}</span> : null}
          <PendingReportLabel summary={reportSummary} language={language} />
        </div>
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
            {job.isPotential ? <div className="potential-status-row"><PotentialBadge jobTitle={job.title} /><button type="button" className="potential-detail-trigger" onClick={() => setIsPotentialDetailOpen(true)}>{language === 'vi' ? 'Xem chi tiết' : 'View details'}</button></div> : <strong>{t('highConfidence')}</strong>}
          </div>
        ) : null}
      </section>

      <section className="jd-content-grid">
        <div className="jd-main-content">
          <h2>{t('jobDescription')}</h2>
          {renderDescriptionLines(description.overview, language === 'vi' ? 'Nhà tuyển dụng chưa cập nhật mô tả chi tiết.' : 'The recruiter has not added a detailed description yet.')}
          <h2>{language === 'vi' ? 'Trách nhiệm chính' : 'Key responsibilities'}</h2>
          {renderDescriptionLines(description.responsibilities, language === 'vi' ? 'Nội dung trách nhiệm được trình bày trong phần mô tả.' : 'Responsibilities are included in the description.')}
          <h2>{t('jobRequirements')}</h2>
          {description.requirements.length ? renderDescriptionLines(description.requirements, '') : <ReasonChips reasons={job.requiredSkills} />}
          <h2>{t('benefits')}</h2>
          {renderDescriptionLines(description.benefits, language === 'vi' ? 'Nhà tuyển dụng chưa cập nhật quyền lợi.' : 'Benefits have not been added yet.')}
        </div>
        <aside className="jd-side-content">
          <button className="primary-action full" disabled={!onApply} title={hasApplied ? (language === 'vi' ? 'Bạn đã ứng tuyển công việc này.' : 'You have already applied for this job.') : undefined} onClick={onApply}>
            {hasApplied
              ? (language === 'vi' ? 'Đã ứng tuyển' : 'Applied')
              : job.applicationMode === 'EXTERNAL'
              ? (language === 'vi' ? 'Mở nguồn tuyển dụng' : 'Open source listing')
              : t('apply')}
          </button>
          <section className="jd-employer-card">
            <div>
              <p className="eyebrow">{language === 'vi' ? 'Nhà tuyển dụng' : 'Employer'}</p>
              <strong>{job.company}</strong>
              {job.recruiterLogin ? <small>{job.recruiterName ? `${job.recruiterName} · ` : ''}{job.recruiterLogin}</small> : null}
            </div>
            {job.companySlug ? <a href={`/candidate/employers/${job.companySlug}`}>{language === 'vi' ? 'Xem trang công ty' : 'View company page'} ↗</a> : null}
          </section>
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
          <p>{hasApplied ? (language === 'vi' ? 'Bạn đã có hồ sơ ứng tuyển cho công việc này.' : 'You already have an application for this job.') : t('applicationStateCopy')}</p>
          <div className="jd-secondary-actions">
            <button type="button" onClick={onSave} disabled={savingJob}>{job.isSaved ? (language === 'vi' ? 'Đã lưu' : 'Saved') : t('save')}</button>
            <button type="button" onClick={onReport}>{t('report')}</button>
          </div>
        </aside>
      </section>
      {isPotentialDetailOpen ? <PotentialDetailModal job={job} onClose={() => setIsPotentialDetailOpen(false)} /> : null}
    </article>
  );
}

function PotentialDetailModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { language } = useLanguage();
  const reasons = [...new Set(job.reasons.filter(Boolean))];
  const vi = language === 'vi';

  return <div className="modal-backdrop potential-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="candidate-review-modal potential-detail-modal" role="dialog" aria-modal="true" aria-labelledby="potential-detail-title">
      <div className="section-heading inline-heading">
        <div><p className="eyebrow">Potential</p><h2 id="potential-detail-title">{vi ? 'Vì sao công việc này có tiềm năng?' : 'Why does this job show potential?'}</h2></div>
        <button type="button" aria-label={vi ? 'Đóng' : 'Close'} data-modal-close onClick={onClose}><XCircle size={20} /></button>
      </div>
      <div className="potential-detail-intro">
        <Sparkles size={20} aria-hidden="true" />
        <p>{vi ? `Tiềm năng được đánh giá giữa CV đang dùng để đối sánh và yêu cầu của vị trí “${job.title}”. Điểm phù hợp hiện tại là ${job.normalizedScore}%.` : `Potential is assessed between the CV used for matching and the requirements of “${job.title}”. The current match score is ${job.normalizedScore}%.`}</p>
      </div>
      {job.potentialReason ? <section className="potential-detail-reason"><h3>{vi ? 'Nhận định từ hệ thống' : 'System assessment'}</h3><p>{job.potentialReason}</p></section> : null}
      <section className="potential-detail-evidence">
        <h3>{vi ? 'Tín hiệu được ghi nhận' : 'Evidence considered'}</h3>
        {reasons.length ? <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>{vi ? 'Chưa có phân tích chi tiết hơn từ lần chấm điểm này. Nhãn Tiềm năng cho biết CV có các tín hiệu phù hợp để bạn cân nhắc, nhưng chưa đạt ngưỡng phù hợp cao.' : 'No more detailed analysis is available for this scoring run. Potential means the CV has relevant signals worth considering but has not reached the high-match threshold.'}</p>}
      </section>
      <div className="filter-modal-actions"><button type="button" className="primary-action" onClick={onClose}>{vi ? 'Đã hiểu' : 'Got it'}</button></div>
    </section>
  </div>;
}

function StickyApplyBar({ isSaved, isApplying, hasApplied, onSave, onApply, onSimilar, onReport }: { isSaved: boolean; isApplying: boolean; hasApplied: boolean; onSave: () => void; onApply?: () => void; onSimilar?: () => void; onReport: () => void }) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  return (
    <div className="sticky-apply-bar">
      <button className="bolt-action" aria-label="AutoFit" onClick={() => navigate('/candidate/automation')}>
        <Zap size={22} />
      </button>
      <button onClick={onSave} disabled={isApplying}>
        <Bookmark size={17} />
        {isSaved ? (language === 'vi' ? 'Đã lưu' : 'Saved') : t('save')}
      </button>
      <button onClick={onSimilar}>
        <Mail size={17} />
        {t('similarJobs')}
      </button>
      <button onClick={onReport}>
        <Flag size={17} />
        {t('report')}
      </button>
      <button className="primary-apply" disabled={!onApply || isApplying} onClick={onApply}>{hasApplied ? (language === 'vi' ? 'Đã ứng tuyển' : 'Applied') : t('apply').toUpperCase()}</button>
    </div>
  );
}

function RecruiterJobAnalyticsDrilldown({
  jobs,
  jobsLoading,
  selectedJobId,
  onJobChange,
  funnel,
  skillGaps,
  isLoading,
  isError,
  onRetry,
}: {
  jobs: Job[];
  jobsLoading: boolean;
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  funnel: RecruiterJobFunnel | null;
  skillGaps: RecruiterJobSkillGapItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const funnelSteps = funnel ? [
    ['views', vi ? 'Lượt xem JD' : 'Job views'],
    ['matches', vi ? 'CV được chấm điểm' : 'CVs scored'],
    ['applications', vi ? 'Đơn ứng tuyển' : 'Applications'],
    ['invited', vi ? 'Lời mời đang chờ' : 'Pending invitations'],
    ['approved', vi ? 'Đã chấp nhận' : 'Approved'],
    ['rejected', vi ? 'Đã từ chối' : 'Rejected'],
  ] as const : [];

  return <section className="analytics-drilldown panel">
    <div className="analytics-drilldown-heading">
      <div>
        <p className="eyebrow">{vi ? 'Phân tích theo JD' : 'Job drill-down'}</p>
        <h2>{vi ? 'Funnel và khoảng thiếu kỹ năng' : 'Funnel and skill gaps'}</h2>
        <p className="analytics-explainer">{vi ? 'Chọn một JD của bạn để xem hành trình từ lượt xem đến quyết định tuyển dụng, cùng mức độ phủ kỹ năng trong nhóm CV đã được matching.' : 'Select one of your jobs to view the path from views to hiring decisions and skill coverage across matched CVs.'}</p>
      </div>
      <label className="analytics-job-select">
        {vi ? 'Chọn JD' : 'Select job'}
        <select value={selectedJobId} disabled={jobsLoading || jobs.length === 0} onChange={(event) => onJobChange(event.target.value)}>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
      </label>
    </div>
    {jobsLoading ? <p>{vi ? 'Đang tải danh sách JD...' : 'Loading jobs...'}</p> : null}
    {!jobsLoading && jobs.length === 0 ? <section className="empty-state"><h3>{vi ? 'Chưa có JD để phân tích' : 'No jobs to analyse'}</h3><p>{vi ? 'Đăng ít nhất một JD để xem funnel và khoảng thiếu kỹ năng.' : 'Post at least one job to view funnel and skill-gap data.'}</p></section> : null}
    {selectedJobId && isLoading ? <section className="empty-state" aria-live="polite"><p>{vi ? 'Đang tải phân tích JD...' : 'Loading job analytics...'}</p></section> : null}
    {selectedJobId && isError ? <section className="empty-state" role="alert"><h3>{vi ? 'Không thể tải phân tích JD' : 'Could not load job analytics'}</h3><button type="button" onClick={onRetry}>{vi ? 'Thử lại' : 'Retry'}</button></section> : null}
    {funnel && !isLoading && !isError ? <div className="analytics-drilldown-grid">
      <article className="analytics-subpanel">
        <h3>{vi ? 'Funnel tuyển dụng' : 'Recruitment funnel'}</h3>
        <p className="analytics-explainer">{vi ? 'Lượt xem và matching không phải là đơn ứng tuyển; tỷ lệ chuyển đổi giúp nhận biết điểm nghẽn của JD.' : 'Views and matches are not applications; conversion rates help identify where a job is losing candidates.'}</p>
        <div className="funnel-step-grid">
          {funnelSteps.map(([key, label]) => <div key={key}><span>{label}</span><strong>{Number(funnel.steps[key] ?? 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</strong></div>)}
        </div>
        <div className="analytics-rate-list">
          {Object.entries(funnel.conversionRates).map(([key, value]) => <span key={key}>{formatFunnelRateLabel(key, language)} <b>{Math.round(Number(value) * 10) / 10}%</b></span>)}
        </div>
      </article>
      <article className="analytics-subpanel">
        <h3>{vi ? 'Khoảng thiếu kỹ năng' : 'Skill gaps'}</h3>
        <p className="analytics-explainer">{vi ? 'Tỷ lệ phủ là phần trăm CV đã matching có kỹ năng yêu cầu. Số còn thiếu cho biết kỹ năng nào cần mở rộng nguồn ứng viên.' : 'Coverage is the share of matched CVs with each required skill. Missing counts show where sourcing should be expanded.'}</p>
        {skillGaps.length ? <div className="skill-demand-list compact">{skillGaps.map((item) => <ProgressRow key={item.skill} label={`${item.skill} (${item.candidateMissingSkill} ${vi ? 'thiếu' : 'missing'})`} value={Math.round(item.coverageRate)} max={100} />)}</div> : <p>{vi ? 'JD này chưa có kỹ năng bắt buộc để phân tích.' : 'This job has no required skills to analyse.'}</p>}
      </article>
    </div> : null}
  </section>;
}

function formatFunnelRateLabel(value: string, language: 'vi' | 'en') {
  const labels: Record<string, [string, string]> = {
    viewToApplication: ['Xem → Ứng tuyển', 'View → application'],
    matchToApplication: ['Phù hợp → Ứng tuyển', 'Match → application'],
    applicationToApproved: ['Ứng tuyển → Chấp nhận', 'Application → approved'],
    applicationToRejected: ['Ứng tuyển → Từ chối', 'Application → rejected'],
  };
  return labels[value]?.[language === 'vi' ? 0 : 1] ?? value;
}

function CompanyLogo({ company, logoUrl, className }: { company: string; logoUrl?: string; className: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CF';
  return <div className={className}>{logoUrl && !imageFailed ? <img src={logoUrl} alt={`${company} logo`} onError={() => setImageFailed(true)} /> : initials}</div>;
}

function LowMatchConfirmModal({ language, onClose, onConfirm }: { language: 'vi' | 'en'; onClose: () => void; onConfirm: () => void }) {
  const vi = language === 'vi';
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={vi ? 'Xác nhận ứng tuyển điểm thấp' : 'Confirm low-match application'}><section className="candidate-review-modal low-match-modal"><div><p className="eyebrow">{vi ? 'Điểm phù hợp thấp' : 'Low match score'}</p><h2>{vi ? 'Bạn vẫn muốn ứng tuyển?' : 'Do you still want to apply?'}</h2><p>{vi ? 'Hồ sơ hiện tại có mức độ phù hợp thấp với yêu cầu của công việc này. Bạn vẫn có thể ứng tuyển, nhưng nên xem lại CV trước khi gửi.' : 'Your current profile has a low match with this job. You can still apply, but consider reviewing your CV first.'}</p></div><div className="filter-modal-actions"><button type="button" onClick={onClose}>{vi ? 'Hủy' : 'Cancel'}</button><button className="primary-action" type="button" onClick={onConfirm}>{vi ? 'Vẫn ứng tuyển' : 'Apply anyway'}</button></div></section></div>;
}

function JobReportModal({ jobId, language, onClose, onSuccess }: { jobId: string; language: 'vi' | 'en'; onClose: () => void; onSuccess: () => void }) {
  return <ContentReportModal targetType="JOB" targetId={jobId} language={language} onClose={onClose} onSuccess={onSuccess} />;
}

function ContentReportModal({ targetType, targetId, jobId, language, onClose, onSuccess }: {
  targetType: 'JOB' | 'CV'; targetId: string; jobId?: string; language: 'vi' | 'en'; onClose: () => void; onSuccess: (report: ContentReportSummary['reports'][number]) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('FALSE_INFORMATION');
  const [comment, setComment] = useState('');
  const vi = language === 'vi';
  const targetLabel = targetType === 'JOB' ? (vi ? 'việc làm' : 'job') : 'CV';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason === 'OTHER' && !comment.trim()) {
      setError(vi ? 'Vui lòng nhập ghi chú khi chọn lý do Khác.' : 'A note is required when choosing Other.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const report = targetType === 'JOB'
        ? await careerfitApi.reportJob(targetId, reason, comment)
        : jobId
          ? await careerfitApi.reportCv(targetId, jobId, reason, comment)
          : null;
      if (!report) throw new Error('Missing job context');
      onSuccess(report);
    } catch (requestError) {
      setError(readableError(requestError, vi ? 'Không thể gửi báo cáo. Bạn có thể đã gửi report này trước đó.' : 'Could not submit the report. You may already have a pending report.', language));
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={vi ? `Báo cáo ${targetLabel}` : `Report ${targetLabel}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()} onClick={(event) => event.stopPropagation()}><form className="candidate-review-modal job-report-modal" onSubmit={submit}><div><p className="eyebrow">{vi ? 'An toàn cộng đồng' : 'Community safety'}</p><h2>{vi ? `Báo cáo ${targetLabel}` : `Report this ${targetLabel}`}</h2><p>{vi ? 'Báo cáo sẽ được gửi đến quản trị viên để xem xét.' : 'Your report will be sent to administrators for review.'}</p></div><label>{vi ? 'Lý do' : 'Reason'}<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="IMPERSONATION">{vi ? 'Giả mạo' : 'Impersonation'}</option><option value="FRAUD_SCAM">{vi ? 'Lừa đảo' : 'Fraud or scam'}</option><option value="FALSE_INFORMATION">{vi ? 'Thông tin sai lệch' : 'False information'}</option><option value="INAPPROPRIATE_CONTENT">{vi ? 'Nội dung không phù hợp' : 'Inappropriate content'}</option><option value="DISCRIMINATION_HARASSMENT">{vi ? 'Phân biệt đối xử/quấy rối' : 'Discrimination or harassment'}</option><option value="PRIVACY_VIOLATION">{vi ? 'Vi phạm quyền riêng tư' : 'Privacy violation'}</option><option value="SPAM">Spam</option><option value="OTHER">{vi ? 'Khác' : 'Other'}</option></select></label><label>{reason === 'OTHER' ? (vi ? 'Ghi chú *' : 'Note *') : (vi ? 'Ghi chú (không bắt buộc)' : 'Note (optional)')}<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} required={reason === 'OTHER'} /></label>{error ? <p className="field-validation-hint error">{error}</p> : null}<div className="filter-modal-actions"><button type="button" onClick={onClose} disabled={submitting}>{vi ? 'Hủy' : 'Cancel'}</button><button className="danger-action" disabled={submitting}>{submitting ? (vi ? 'Đang gửi...' : 'Submitting...') : (vi ? 'Gửi báo cáo' : 'Submit report')}</button></div></form></div>;
}

function PendingReportLabel({ summary, language }: { summary?: ContentReportSummary; language: 'vi' | 'en' }) {
  if (!summary?.pendingCount) return null;
  const reasons = [...new Set(summary.reports.map((report) => reportReasonLabel(report.reason, language)))];
  return <span className="pending-report-label" tabIndex={0} aria-label={language === 'vi' ? `${summary.pendingCount} report đang chờ xử lý` : `${summary.pendingCount} pending reports`}>
    <Flag size={14} />{language === 'vi' ? `Đang bị báo cáo · ${summary.pendingCount}` : `Reported · ${summary.pendingCount}`}
    <span className="pending-report-popover" role="tooltip"><strong>{language === 'vi' ? 'Lý do report đang chờ' : 'Pending report reasons'}</strong><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></span>
  </span>;
}

function reportReasonLabel(reason: string, language: 'vi' | 'en') {
  const labels: Record<string, string> = {
    IMPERSONATION: 'Giả mạo', FRAUD_SCAM: 'Lừa đảo', FALSE_INFORMATION: 'Thông tin sai lệch',
    INAPPROPRIATE_CONTENT: 'Nội dung không phù hợp', DISCRIMINATION_HARASSMENT: 'Phân biệt đối xử/quấy rối',
    PRIVACY_VIOLATION: 'Vi phạm quyền riêng tư', SPAM: 'Spam', OTHER: 'Khác',
  };
  return language === 'vi' ? labels[reason] ?? reason : reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    postings: point.totalJobs,
  }));
  const itDemandData = Object.entries(rolesQuery.data ?? {}).map(([label, value], index) => ({
    label,
    value: Number(value),
    color: colors[index % colors.length],
  }));
  const salaryDemandData = (salaryQuery.data ?? []).slice(0, 6).map((bucket, index) => ({
    label: formatMarketSalaryRange(bucket, language),
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
            <ResponsiveContainer width="100%" height={230}>
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
              <ResponsiveContainer width="100%" height={230}>
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
    if (filters.minScore > 0 && job.normalizedScore < filters.minScore) return false;
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

function useDebouncedValue(value: string, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function formatMarketSalaryRange(
  bucket: { currency: string; seniority: string; minSalary: number; maxSalary: number },
  language: 'vi' | 'en',
) {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const min = Number(bucket.minSalary ?? 0);
  const max = Number(bucket.maxSalary ?? 0);
  const range = min > 0 && max > 0
    ? `${min.toLocaleString(locale)} - ${max.toLocaleString(locale)}`
    : min > 0
      ? `${language === 'vi' ? 'Từ' : 'From'} ${min.toLocaleString(locale)}`
      : language === 'vi' ? 'Thỏa thuận' : 'Negotiable';
  return `${range} ${bucket.currency}`;
}

function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim());
  const { data } = useQuery({
    queryKey: ['job-search-suggestions', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: ({ signal }) => careerfitApi.getSearchSuggestions(debouncedQuery, signal),
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
      const publicJob = await careerfitApi.getJob(jobId);
      if (isPublic) return publicJob;
      const personalizedJob = await careerfitApi.getCandidateCatalogJob(jobId);
      if (!personalizedJob) return publicJob;
      return {
        ...publicJob,
        normalizedScore: personalizedJob.normalizedScore,
        label: personalizedJob.label,
        hasMatching: personalizedJob.hasMatching,
        isPotential: personalizedJob.isPotential,
        potentialReason: personalizedJob.potentialReason,
        isSaved: personalizedJob.isSaved,
        applicationStatus: personalizedJob.applicationStatus,
        feedbackStatus: personalizedJob.feedbackStatus,
        reasons: personalizedJob.reasons,
        matchingId: personalizedJob.matchingId,
        feedback: personalizedJob.feedback,
        isUrgent: personalizedJob.isUrgent,
      };
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

function useRecruiterJobAnalytics(enabled: boolean, jobId: string, rangeDays: number) {
  const funnel = useQuery({
    queryKey: ['recruiter-job-funnel', jobId, rangeDays],
    enabled,
    queryFn: () => careerfitApi.getRecruiterJobFunnel(jobId, rangeDays),
  });
  const skillGaps = useQuery({
    queryKey: ['recruiter-job-skill-gap', jobId],
    enabled,
    queryFn: () => careerfitApi.getRecruiterJobSkillGap(jobId),
  });

  return {
    funnel: funnel.data ?? null,
    skillGaps: skillGaps.data ?? [],
    isLoading: funnel.isLoading || skillGaps.isLoading,
    isError: funnel.isError || skillGaps.isError,
    refetch: () => {
      void funnel.refetch();
      void skillGaps.refetch();
    },
  };
}
