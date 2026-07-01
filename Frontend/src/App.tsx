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
  type AdvancedSalaryBucket,
  type AdvancedSkillDemandItem,
  type AdvancedTrendPoint,
  type CandidateAnalyticsOverview,
  type CandidateCvDto,
  type CandidateProfileDto,
  type CreateJobPayload,
  type ManualCvPayload,
  type PortfolioLinkDto,
  type PortfolioLinkPayload,
  type PortfolioProjectDto,
  type PortfolioProjectPayload,
  type RecruiterAnalyticsOverview,
} from './lib/api';
import {
  applications,
  automationPolicy,
  candidate,
  emailAction,
  jobs,
  preference,
  trends,
} from './data/mock';
import type { AutomationPolicy, Job, MatchFeedback, MockAccount, RecruiterCandidateItem, Role } from './types';

const topEmployers = [
  {
    id: 'nexlab-solutions',
    name: 'Nexlab Solutions',
    mark: 'Nexlab',
    tone: 'blue',
    industry: 'Software Outsourcing & Product Engineering',
    location: 'Ho Chi Minh City',
    size: '150-300 employees',
    website: 'nexlab.example.com',
    summary:
      'Nexlab Solutions builds enterprise web platforms, hiring automation tools, and cloud-native systems for fast-growing technology teams.',
    benefits: ['Hybrid working', 'Product ownership', 'Technical mentoring', 'Quarterly learning budget'],
  },
  {
    id: 'seatos',
    name: 'Seatos',
    mark: 'SE',
    tone: 'steel',
    industry: 'Data Platforms',
    location: 'Da Nang',
    size: '80-150 employees',
    website: 'seatos.example.com',
    summary: 'Seatos focuses on data-heavy products, analytics dashboards, and reliable operations tooling for distributed teams.',
    benefits: ['Remote-friendly', 'Cloud projects', 'Clear promotion ladder', 'Private healthcare'],
  },
  {
    id: 'orbital-talent',
    name: 'Orbital Talent',
    mark: 'OT',
    tone: 'teal',
    industry: 'Recruitment AI',
    location: 'Remote Vietnam',
    size: '50-120 employees',
    website: 'orbital.example.com',
    summary: 'Orbital Talent designs candidate-facing matching products, recruiter workflows, and recommendation experiences.',
    benefits: ['Flexible schedule', 'AI product work', 'English environment', 'Annual offsite'],
  },
  {
    id: 'mobifone-it',
    name: 'Mobifone IT',
    mark: 'mobifone it',
    tone: 'blue',
    industry: 'Telecom Technology',
    location: 'Ha Noi',
    size: '500+ employees',
    website: 'mobifoneit.example.com',
    summary: 'Mobifone IT develops internal platforms, customer operations products, and large-scale service infrastructure.',
    benefits: ['Stable enterprise projects', 'Bonus package', 'Training programs', 'Large-scale systems'],
  },
  {
    id: 'azapa-engineering',
    name: 'Azapa Engineering',
    mark: 'AZAPA',
    tone: 'ink',
    industry: 'Engineering Services',
    location: 'Ho Chi Minh City',
    size: '200-500 employees',
    website: 'azapa.example.com',
    summary: 'Azapa Engineering combines product design, UI platform work, and delivery engineering for regional clients.',
    benefits: ['Japanese client projects', 'UI platform work', 'Language support', 'Performance bonus'],
  },
  {
    id: 'daoukiwoom-innovation',
    name: 'Daoukiwoom Innovation',
    mark: 'DAOUKIWOOM',
    tone: 'blue',
    industry: 'Fintech & Enterprise SaaS',
    location: 'Ho Chi Minh City',
    size: '300-600 employees',
    website: 'daoukiwoom.example.com',
    summary: 'Daoukiwoom Innovation builds fintech, CRM, and operational SaaS products with strong engineering governance.',
    benefits: ['Fintech domain', 'Modern stack', 'Cross-border teams', 'Career framework'],
  },
];

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
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/register" element={<LoginPage mode="register" onLogin={handleLogin} />} />
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
          element={protectedRoute('candidate', <CandidateSettingsPage onLogout={handleLogout} onDeleteAccount={handleLogout} />)}
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
          element={protectedRoute('recruiter', <RecruiterSettingsPage onLogout={handleLogout} onDeleteAccount={handleLogout} />)}
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
}: {
  mode?: 'login' | 'register';
  onLogin: (username: string, password: string) => Promise<MockAccount | null>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = searchParams.get('next');

  async function submitLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const account = await onLogin(username, password);
      if (!account) {
        setError(t('invalidLogin'));
        return;
      }

      navigate(resolvePostLoginPath(account, nextPath));
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
        <label>
          {t('username')}
          <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ca / re / ad" />
        </label>
        <label>
          {t('password')}
          <input
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="1"
            type="password"
          />
        </label>
        {error ? <p className="validation-error">{error}</p> : null}
        <button className="primary-action full" disabled={isSubmitting} type="submit">
          {t('signIn')}
        </button>
        <small>{t('testLoginHint')}</small>
        <button className="full" type="button">
          <MailCheck size={16} />
          {t('passwordless')}
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const { data = [], isLoading: isJobsLoading } = useJobs({ isPublic });
  const suggestions = useSearchSuggestions(query);
  const newJobs = data.slice(0, 3);

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
          <StatCard label={t('recommendations')} value="12" detail={t('jobsAboveNinety')} />
          <StatCard label={t('autoApply')} value="88%" detail={`${t('nextScan')}: ${automationPolicy.nextScanAt}`} />
          <StatCard label={t('applications')} value={applications.length} detail={t('inviteThisWeek')} />
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
        <JobListWithPreview
          jobs={newJobs}
          isLoading={isJobsLoading}
          onOpen={(job) => navigate(isPublic ? `/jobs/${job.id}` : `/candidate/jobs/${job.id}`)}
          onApply={isPublic ? () => setIsLoginPromptOpen(true) : undefined}
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
  const initialKeyword = searchParams.get('keyword') ?? '';
  const filters = getJobFilters(searchParams);
  const [query, setQuery] = useState(initialKeyword);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { data: sourceJobs = [], isLoading: isJobsLoading, isFetching: isJobsFetching } = useJobs({ isPublic, keyword: initialKeyword });
  const keywordFilteredJobs = useFilteredJobs(
    sourceJobs.filter((job) => !hiddenJobIds.includes(job.id)),
    query,
  );
  const filteredJobs = useMemo(() => sortJobsStable(applyJobFilters(keywordFilteredJobs, filters)), [
    keywordFilteredJobs,
    filters.city,
    filters.level,
    filters.workModel,
    filters.salary,
    filters.domain,
  ]);
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
  }, [searchParams.toString()]);

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
            {filteredJobs.length} <span>{query || 'IT'}</span> {t('jobsInVietnam')}
          </h2>
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
        {lowMatchOnly ? (
          <MatchingEdgeCaseNotice
            type="low"
            jobs={filteredJobs}
            onPrimary={() => navigate('/candidate/upload?tab=manual')}
            onSecondary={() => navigate('/candidate/profile?tab=fixed')}
            onTertiary={() => setSearchParams(writeJobSearchParams(query, defaultJobFilters))}
          />
        ) : null}
        <JobListWithPreview
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
        />
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

function JobDetailPanel({ job }: { job?: Job }) {
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
  role = 'CANDIDATE',
  onNotInterested,
}: {
  matchingId?: string;
  initialFeedback?: MatchFeedback;
  role?: 'CANDIDATE' | 'RECRUITER';
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

  const options: Array<{ type: MatchFeedback; label: string; icon: ReactNode }> =
    role === 'RECRUITER'
      ? [
          { type: 'GOOD_MATCH', label: t('goodMatch'), icon: <ThumbsUp size={15} /> },
          { type: 'POTENTIAL', label: t('potentialMatch'), icon: <Sparkles size={15} /> },
          { type: 'BAD_MATCH', label: t('badMatch'), icon: <ThumbsDown size={15} /> },
        ]
      : [
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
      await careerfitApi.submitMatchFeedback(feedbackMatchingId, type, role);
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
  const { data: job, isLoading, isError } = useJobDetail(jobId, isPublic);

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
      {showStickyBar ? <StickyApplyBar onApply={applyToCurrentJob} /> : null}
      {isLoginPromptOpen ? <LoginPromptModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function EmployerDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const employer = topEmployers.find((item) => item.id === employerId) ?? topEmployers[0];
  const employerJobs = jobs.slice(0, 3).map((job, index) => ({
    ...job,
    company: index === 0 ? employer.name : job.company,
  }));

  return (
    <div className="employer-detail-route">
      <button className="back-button" onClick={() => navigate('/candidate')}>
        {t('backToEmployers')}
      </button>

      <section className="employer-hero">
        <div className="employer-cover" />
        <div className="employer-profile-card">
          <div className={`employer-logo-large ${employer.tone}`}>{employer.mark}</div>
          <div>
            <p className="eyebrow">{t('featuredEmployers')}</p>
            <h1>{employer.name}</h1>
            <p>{employer.industry}</p>
          </div>
          <button className="primary-action">{t('followCompany')}</button>
        </div>
      </section>

      <section className="employer-info-grid">
        <article className="employer-main-panel">
          <h2>{t('companyIntro')}</h2>
          <p>{employer.summary}</p>
          <p>
            Công ty đang ưu tiên tuyển các vị trí kỹ thuật có khả năng xây dựng sản phẩm web rõ ràng, vận hành tốt, và
            phối hợp chặt với product/recruiter stakeholders.
          </p>

          <h2>{t('featuredBenefits')}</h2>
          <div className="benefit-grid">
            {employer.benefits.map((benefit) => (
              <span key={benefit}>{benefit}</span>
            ))}
          </div>

          <h2>{t('openJobs')}</h2>
          <div className="employer-job-list">
            {employerJobs.map((job) => (
              <article className="employer-job-card" key={job.id} onClick={() => navigate(`/candidate/jobs/${job.id}`)}>
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
            <span>{employer.industry}</span>
          </div>
          <div className="company-fact">
            <MapPin size={18} />
            <span>{employer.location}</span>
          </div>
          <div className="company-fact">
            <Users size={18} />
            <span>{employer.size}</span>
          </div>
          <div className="company-fact">
            <Globe size={18} />
            <span>{employer.website}</span>
          </div>
          <button className="primary-action full">{t('viewAll')}</button>
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
  const [state, setState] = useState<'idle' | 'uploading' | 'processing' | 'scored'>('idle');
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isSavingManualCv, setIsSavingManualCv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: manualProfile } = useQuery<any>({ queryKey: ['candidate-profile'], queryFn: careerfitApi.getCandidateProfile });
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
      setState(result.status === 'SCORED' ? 'scored' : 'processing');
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      setActionMessage({
        tone: 'success',
        text: language === 'vi'
          ? 'CV đã được tiếp nhận. Hệ thống đang trích xuất và chấm điểm hồ sơ.'
          : 'CV accepted. Extraction and scoring are now running.',
      });
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
      await careerfitApi.createManualCv(payload);
      await queryClient.invalidateQueries({ queryKey: ['candidate-cvs'] });
      setActionMessage({ tone: 'success', text: language === 'vi' ? 'Đã tạo CV và bắt đầu matching.' : 'CV created and matching started.' });
      navigate('/candidate/profile?tab=cvs');
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
              <h2>{state === 'idle' ? t('dropCvHere') : state === 'processing' ? t('processingFile') : t(state)}</h2>
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
                  <button type="button" aria-label={`${t('removeSkill')} ${skill}`}>×</button>
                </span>
              ))}
            </div>
            <label>
              {t('skills')}
              <input name="skills" defaultValue={manualProfile?.desiredSkills?.join(', ') ?? skillChips.join(', ')} required />
            </label>
            <label className="skill-search-field">
              <Search size={18} />
              <input placeholder={t('typeToAddSkills')} />
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
              <button type="button">
                <Plus size={17} />
                {t('addExperience')}
              </button>
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
                  <button type="button" aria-label={t('removeExperience')}>
                  <Trash2 size={18} />
                </button>
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
            {jobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
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
  const { data: profile } = useQuery<any>({
    queryKey: ['candidate-profile'],
    queryFn: careerfitApi.getCandidateProfile,
  });
  const { data: managedCvs = [], isLoading: cvsLoading } = useQuery<any>({
    queryKey: ['candidate-cvs'],
    queryFn: careerfitApi.getCandidateCvs,
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
              {managedCvs.map((cv: any) => (
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
                    <button onClick={() => setDefaultCv(cv)} disabled={cv.isDefault || defaultingCvId === cv.id}>
                      {defaultingCvId === cv.id ? '...' : t('setDefault')}
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
  const { t } = useLanguage();
  return (
    <div className="page-stack">
      <section className="section-heading">
        <p className="eyebrow">{t('recommendations')}</p>
        <h2>{t('recommendationsTitle')}</h2>
      </section>
      <section className="job-list">
        {jobs
          .filter((job) => job.normalizedScore >= 85)
          .map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
      </section>
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

function CandidateSettingsPage({
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

function RecruiterSettingsPage({
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
    accountActions={<AccountDangerActions onLogout={onLogout} onDeleteAccount={onDeleteAccount} />}
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
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="account-danger-actions">
      <button onClick={onLogout}>
        <LogOut size={17} />
        {t('logout')}
      </button>
      <button className="danger-action" onClick={onDeleteAccount}>
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
  const { data: summary } = useRecruiterSummary();
  return (
    <div className="page-stack">
      <SearchHero
        eyebrow={t('recruiter')}
        title={t('identifyTalent')}
        copy={t('recruiterHomeCopy')}
        placeholder={t('searchPlaceholder')}
        actionLabel={t('searchCandidates')}
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
        <button>{t('role')} ▾</button>
        <button>{t('status')} ▾</button>
        <button>{t('score')} ▾</button>
        <button>{t('potential')} ▾</button>
        <button className="filter-button">
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
  const recruiterQuery = getRecruiterJobsQuery(searchParams);
  const { data: recruiterJobs = [], refetch: refetchRecruiterJobs } = useRecruiterJobs();
  const [showCreateJob, setShowCreateJob] = useState(searchParams.get('create') === '1');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const selectedJob = recruiterJobs.find((job) => job.id === jobId) ?? recruiterJobs[0] ?? null;
  const candidateOptions = useMemo(() => recruiterDiscoveryOptions(recruiterQuery), [recruiterQuery.match, recruiterQuery.sort]);
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

  async function markCandidatePotential(item: RecruiterCandidateItem) {
    setInvitingCandidateId(item.candidateId);
    setActionMessage(null);
    try {
      await careerfitApi.submitMatchFeedback(item.matchingId, 'POTENTIAL', 'RECRUITER');
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? `Đã ghi nhận ${item.name} là ứng viên tiềm năng cho thuật toán.` : `${item.name} marked as a potential learning signal.`,
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể lưu đánh giá tiềm năng.' : 'Could not save potential feedback.', language),
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
                  <FeedbackBar matchingId={item.matchingId} role="RECRUITER" />
                  {!item.hasApplied && (item.label === 'HIGH' || item.isPotential) ? (
                    <>
                      <button disabled={invitingCandidateId === item.candidateId} onClick={() => inviteCandidate(item)}>{t('invite')}</button>
                      <button onClick={() => setSelectedCandidate(item)}>{t('review')}</button>
                      <button disabled={invitingCandidateId === item.candidateId} onClick={() => markCandidatePotential(item)}>{t('markPotential')}</button>
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
  const { t } = useLanguage();
  return (
    <div className="page-stack">
      <section className="panel chart-panel">
        <div className="section-heading">
          <p className="eyebrow">{t('analytics')}</p>
          <h2>{t('jobTrend')}</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trends}>
            <defs>
              <linearGradient id="matches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#006a62" stopOpacity={0.36} />
                <stop offset="95%" stopColor="#006a62" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.12)" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="matches" stroke="#006a62" fill="url(#matches)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <section className="panel chart-panel">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.12)" />
            <XAxis dataKey="day" />
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

function RefineSearchPanel() {
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
  const { t } = useLanguage();

  return (
    <section className="top-employers">
      <div className="inline-heading">
        <h3>{t('featuredEmployers')}</h3>
        <div className="employer-controls" aria-hidden="true">
          <button>‹</button>
          <button>›</button>
        </div>
      </div>
      <div className="employer-strip">
        {topEmployers.map((employer) => (
          <button className="employer-card" key={employer.id} onClick={() => navigate(`/candidate/employers/${employer.id}`)}>
            <span className={`employer-mark ${employer.tone}`}>{employer.mark}</span>
          </button>
        ))}
      </div>
    </section>
  );
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
                    role="CANDIDATE"
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
            <FeedbackBar matchingId={job.matchingId} initialFeedback={job.feedback} role="CANDIDATE" />
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

function StickyApplyBar({ onApply }: { onApply?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="sticky-apply-bar">
      <button className="bolt-action" aria-label="AutoFit">
        <Zap size={22} />
      </button>
      <button>
        <Bookmark size={17} />
        {t('save')}
      </button>
      <button>
        <Mail size={17} />
        {t('similarJobs')}
      </button>
      <button>
        <Flag size={17} />
        {t('report')}
      </button>
      <button className="primary-apply" onClick={onApply}>{t('apply').toUpperCase()}</button>
    </div>
  );
}

function AutomationConfirmPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [decision, setDecision] = useState<'confirm' | 'reject' | null>(null);

  return (
    <main className="confirm-page">
      <section className="confirm-card">
        <p className="eyebrow">{t('confirmTitle')}</p>
        <h1>{emailAction.target}</h1>
        <MatchingBadge score={emailAction.score} label="High" />
        <p>{emailAction.reason}</p>
        <small>{t('validUntil')}: {emailAction.expiresAt}</small>
        <div className="actions">
          <button
            className="primary-action"
            onClick={() => {
              setDecision('confirm');
              navigate('/automation/result?status=confirmed');
            }}
          >
            <CheckCircle2 size={16} />
            {t('confirm')}
          </button>
          <button
            onClick={() => {
              setDecision('reject');
              navigate('/automation/result?status=rejected');
            }}
          >
            <XCircle size={16} />
            {t('reject')}
          </button>
        </div>
        {decision ? <p className="validation-message">{decision}</p> : null}
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
  const dayLabels = language === 'vi'
    ? { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' }
    : { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };
  const jobPostingTrend = [
    { day: dayLabels.Mon, postings: 43820 },
    { day: dayLabels.Tue, postings: 52940 },
    { day: dayLabels.Wed, postings: 60849 },
    { day: dayLabels.Thu, postings: 78420 },
    { day: dayLabels.Fri, postings: 75260 },
    { day: dayLabels.Sat, postings: 36180 },
    { day: dayLabels.Sun, postings: 28450 },
  ];
  const itDemandData = [
    { label: 'Frontend', value: 14861, color: '#20d488' },
    { label: 'Backend', value: 11920, color: '#3f8cff' },
    { label: 'Data/AI', value: 10540, color: '#f49a20' },
    { label: 'DevOps', value: 9860, color: '#21d8d0' },
    { label: 'QA/Testing', value: 7420, color: '#ffd51f' },
    { label: 'Mobile', value: 6820, color: '#72f8e8' },
  ];
  const salaryDemandData = [
    { label: '<10tr', value: 920, color: '#20d488' },
    { label: '10-20tr', value: 9680, color: '#3f8cff' },
    { label: '20-30tr', value: 31286, color: '#f49a20' },
    { label: '30-45tr', value: 33640, color: '#21d8d0' },
    { label: '>45tr', value: 2860, color: '#ffd51f' },
    { label: 'Thỏa thuận', value: 16820, color: '#ffffff' },
  ];
  const activeDemandData = demandMode === 'job' ? itDemandData : salaryDemandData;
  return (
    <section className="market-dashboard">
      <div className="market-dashboard-heading">
        <h2>
          {t('marketToday')} <span>16/05/2026</span>
        </h2>
      </div>

      <div className="market-stats-row">
        <StatCard label={t('newJobs24h')} value="3.332" detail={t('itRolesRefreshed')} />
        <StatCard label={t('openJobs')} value="55.088" detail={t('activeItOpportunities')} />
        <StatCard label={t('companiesHiring')} value="18.485" detail={t('verifiedEmployers')} />
      </div>

      <div className="market-chart-grid">
        <section className="market-chart-card">
          <div className="market-chart-title">
            <span className="trend-dot">↗</span>
            <h3>{t('jobGrowth')}</h3>
          </div>
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

function TrendPanel({ title, compact = false }: { title: string; compact?: boolean }) {
  const { t } = useLanguage();
  const gradientPrimary = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-primary`;
  const gradientSecondary = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-secondary`;

  return (
    <section className={compact ? 'panel trend-panel compact' : 'panel trend-panel'}>
      <div className="section-heading inline-heading">
        <div>
          <p className="eyebrow">{t('signalLayer')}</p>
          <h2>{title}</h2>
        </div>
        <small>{t('fullReport')}</small>
      </div>
      <ResponsiveContainer width="100%" height={compact ? 210 : 300}>
        <AreaChart data={trends}>
          <defs>
            <linearGradient id={gradientPrimary} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00446e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00446e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradientSecondary} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#006a62" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#006a62" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,110,.1)" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="matches" stroke="#00446e" strokeWidth={3} fill={`url(#${gradientPrimary})`} />
          <Area type="monotone" dataKey="jobs" stroke="#006a62" strokeWidth={3} fill={`url(#${gradientSecondary})`} />
        </AreaChart>
      </ResponsiveContainer>
    </section>
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

function useJobs({ isPublic, keyword = '' }: { isPublic: boolean; keyword?: string }) {
  return useQuery({
    queryKey: [isPublic ? 'public-jobs' : 'candidate-jobs', keyword],
    queryFn: () => isPublic ? careerfitApi.searchJobs(keyword) : careerfitApi.getCandidateJobs(),
    refetchInterval: 60_000,
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
