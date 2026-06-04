import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { useLanguage } from './i18n/LanguageProvider';
import {
  careerfitApi,
  type AdvancedMarketOverview,
  type AdvancedSalaryBucket,
  type AdvancedSkillDemandItem,
  type AdvancedTrendPoint,
  type CandidateAnalyticsOverview,
  type RecruiterAnalyticsOverview,
  type SearchSuggestionGroup,
} from './lib/api';
import {
  applications,
  automationPolicy,
  candidate,
  delay,
  emailAction,
  jobs,
  mockAccounts,
  preference,
  recruiterSummary,
  trends,
} from './data/mock';
import type { Job, MockAccount, Role } from './types';

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
  return {
    q: searchParams.get('q') ?? '',
    status: status === 'active' || status === 'draft' ? status : 'all',
    sort: sort === 'score_desc' || sort === 'newest' || sort === 'applicants_desc' ? sort : 'score_desc',
  };
}

export function App() {
  const [account, setAccount] = useState<MockAccount | null>(() => careerfitApi.restoreAccount());
  const location = useLocation();

  async function handleLogin(username: string, password: string) {
    try {
      const apiAccount = await careerfitApi.login(username, password);
      setAccount(apiAccount);
      return apiAccount;
    } catch {
      const nextAccount = mockAccounts.find((item) => item.username === username.trim() && item.password === password);
      if (!nextAccount) {
        return null;
      }

      careerfitApi.saveMockSession(nextAccount);
      setAccount(nextAccount);
      return nextAccount;
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
      return <Navigate to={account.role === 'candidate' ? '/candidate' : '/recruiter'} replace />;
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
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = searchParams.get('next');

  async function submitLogin() {
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
      <section className="auth-hero">
        <p className="eyebrow">{t('brand')}</p>
        <h1>{mode === 'login' ? t('login') : t('register')}</h1>
        <p>{t('candidateHomeCopy')}</p>
      </section>
      <section className="auth-card">
        <label>
          {t('username')}
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ca / re" />
        </label>
        <label>
          {t('password')}
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitLogin();
            }}
            placeholder="1"
            type="password"
          />
        </label>
        {error ? <p className="validation-error">{error}</p> : null}
        <button className="primary-action full" onClick={submitLogin} disabled={isSubmitting}>
          {t('signIn')}
        </button>
        <small>{t('mockLoginHint')}</small>
        <button className="full">
          <MailCheck size={16} />
          {t('passwordless')}
        </button>
      </section>
    </main>
  );
}

function resolvePostLoginPath(account: MockAccount, nextPath: string | null) {
  if (nextPath?.startsWith('/candidate') && account.role === 'candidate') {
    return nextPath;
  }

  if (nextPath?.startsWith('/recruiter') && account.role === 'recruiter') {
    return nextPath;
  }

  if (nextPath === '/' || nextPath?.startsWith('/jobs')) {
    return account.role === 'candidate' ? '/candidate' : '/recruiter';
  }

  return account.role === 'candidate' ? '/candidate' : '/recruiter';
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
  const { data = jobs, isLoading: isJobsLoading } = useJobs({ isPublic });
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword') ?? '';
  const filters = getJobFilters(searchParams);
  const [query, setQuery] = useState(initialKeyword);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const { data: sourceJobs = jobs, isLoading: isJobsLoading, isFetching: isJobsFetching } = useJobs({ isPublic, keyword: initialKeyword });
  const keywordFilteredJobs = useFilteredJobs(
    sourceJobs.filter((job) => !hiddenJobIds.includes(job.id)),
    query,
  );
  const filteredJobs = useMemo(() => applyJobFilters(keywordFilteredJobs, filters), [
    keywordFilteredJobs,
    filters.city,
    filters.level,
    filters.workModel,
    filters.salary,
    filters.domain,
  ]);
  const suggestions = useSearchSuggestions(query);
  const activeFilterCount = (Object.keys(filters) as JobFilterKey[]).filter((key) => filters[key] !== defaultJobFilters[key]).length;

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

  return (
    <div className="page-stack">
      <section className="result-search-hero">
        <label className="location-select">
          <MapPin size={17} />
          <select value={filters.city} onChange={(event) => updateSingleFilter('city', event.target.value)}>
            {jobFilterOptions.city.map(([value, label]) => (
              <option value={value} key={value}>{value === 'all' ? t('allCities') : label}</option>
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
            {t('level')}: {getOptionLabel('level', filters.level)}
          </button>
          <button className={filters.workModel !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('workingModel')}: {getOptionLabel('workModel', filters.workModel)}
          </button>
          <button className={filters.salary !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('salary')}: {getOptionLabel('salary', filters.salary)}
          </button>
          <button className={filters.domain !== 'all' ? 'active-filter' : ''} onClick={() => setIsFilterOpen(true)}>
            {t('jobDomain')}: {getOptionLabel('domain', filters.domain)}
          </button>
          <button className="filter-button" onClick={() => setIsFilterOpen(true)}>
            <SlidersHorizontal size={16} />
            {t('filter')}{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
        <JobListWithPreview
          jobs={filteredJobs}
          isLoading={isJobsLoading || isJobsFetching}
          onOpen={(job) => navigate(isPublic ? `/jobs/${job.id}` : `/candidate/jobs/${job.id}`)}
          onSkip={(id) => setHiddenJobIds((current) => [...current, id])}
          onApply={isPublic ? () => setIsLoginPromptOpen(true) : undefined}
          showMatchMeta={!isPublic}
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

function JobDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const fallbackJob = jobs.find((item) => item.id === jobId) ?? jobs[0];
  const { data: job = fallbackJob } = useJobDetail(jobId, fallbackJob, isPublic);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    function handleScroll() {
      setShowStickyBar(window.scrollY > 360);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [job.id]);

  return (
    <div className="jd-detail-route">
      <button className="back-button" onClick={() => navigate(isPublic ? '/' : '/candidate')}>
        <ArrowLeft size={17} />
        {t('backToJobs')}
      </button>
      <JobDetailContent job={job} showMatchMeta={!isPublic} />
      {showStickyBar ? <StickyApplyBar onApply={isPublic ? () => setIsLoginPromptOpen(true) : undefined} /> : null}
      {isLoginPromptOpen ? <LoginPromptModal onClose={() => setIsLoginPromptOpen(false)} /> : null}
    </div>
  );
}

function EmployerDetailPage({ isPublic = false }: { isPublic?: boolean }) {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
                  <p>{job.location} · {job.salary}</p>
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
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<'idle' | 'uploading' | 'processing' | 'scored'>('idle');
  const activeUploadTab: UploadTab = searchParams.get('tab') === 'manual' ? 'manual' : 'parser';
  const skillChips = ['React', 'TypeScript', 'Design System', 'Testing', 'Accessibility'];

  function setActiveUploadTab(tab: UploadTab) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'tab', tab, 'parser');
    setSearchParams(params);
  }

  async function simulateUpload() {
    setState('uploading');
    await delay(600);
    setState('processing');
    await delay(700);
    setState('scored');
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
            <button className={`dropzone ${state}`} onClick={simulateUpload}>
              <UploadCloud size={40} />
              <h2>{state === 'idle' ? t('dropCvHere') : state}</h2>
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
              <ReasonChips reasons={['PDF text-based', 'Validation', 'CV-JD scoring']} />
            </aside>
          </div>
        ) : (
          <div className="manual-form-stack">
          <section className="manual-form-card">
            <div className="manual-card-title">
              <UserRound size={22} />
              <h3>{t('personalInfo')}</h3>
            </div>
            <div className="settings-grid">
              <label>
                {t('fullName')}
                <input defaultValue={candidate.name} />
              </label>
              <label>
                {t('currentJobTitle')}
                <input defaultValue="Senior Frontend Engineer" />
              </label>
              <label>
                {t('emailAddress')}
                <input defaultValue={candidate.email} type="email" />
              </label>
              <label>
                {t('phoneNumber')}
                <input defaultValue="+84 909 221 884" />
              </label>
            </div>
          </section>

          <section className="manual-form-card">
            <div className="manual-card-title">
              <FileText size={22} />
              <div>
                <h3>{t('professionalSummary')}</h3>
                <p>Viết ngắn gọn về định hướng, kinh nghiệm và domain sản phẩm bạn mạnh nhất.</p>
              </div>
            </div>
            <textarea
              rows={5}
              defaultValue="Frontend engineer with 5+ years building production React applications, design systems, and candidate-facing search experiences. Strong at turning complex workflow data into calm, usable product surfaces."
            />
          </section>

          <section className="manual-form-card">
            <div className="manual-card-title">
              <Sparkles size={22} />
              <div>
                <h3>{t('technicalSkills')}</h3>
                <p>Những kỹ năng này sẽ được dùng cho recommendation và CV-JD matching.</p>
              </div>
            </div>
            <div className="manual-skill-cloud">
              {skillChips.map((skill) => (
                <span key={skill}>
                  {skill}
                  <button aria-label={`Remove ${skill}`}>×</button>
                </span>
              ))}
            </div>
            <label className="skill-search-field">
              <Search size={18} />
              <input placeholder={t('typeToAddSkills')} />
            </label>
          </section>

          <section className="manual-experience-section">
            <div className="inline-heading">
              <div>
                <p className="eyebrow">{t('manualCreation')}</p>
                <h3>{t('experience')}</h3>
              </div>
              <button>
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
                <button aria-label="Remove experience">
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
                  rows={4}
                  defaultValue="Led the candidate web experience for a recruitment automation product. Built reusable UI patterns, search/filter flows, job detail pages, and analytics dashboards with React and TypeScript."
                />
              </label>
            </article>
          </section>
          </div>
        )}
      </section>

      {activeUploadTab === 'manual' ? (
        <div className="manual-sticky-actions">
          <button>{t('cancel')}</button>
          <button className="primary-action">
            <Save size={17} />
            {t('saveStartMatching')}
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
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileTab = profileTabParamToState[searchParams.get('tab') ?? ''] ?? 'cv';
  function setProfileTab(tab: ProfileTab) {
    const params = new URLSearchParams(searchParams);
    setOrDeleteParam(params, 'tab', profileTabStateToParam[tab], 'cvs');
    setSearchParams(params);
  }
  const managedCvs = [
    {
      id: 'cv-frontend',
      name: 'Frontend_CV_2026.pdf',
      source: t('uploadedPdf'),
      updatedAt: '16/05/2026',
      status: t('defaultMatchingCv'),
      score: 94,
      skills: ['React', 'TypeScript', 'Testing'],
    },
    {
      id: 'cv-manual',
      name: t('manualCvBuilderName'),
      source: t('manualCreation'),
      updatedAt: '15/05/2026',
      status: t('ready'),
      score: 89,
      skills: ['Design System', 'Accessibility', 'Product UI'],
    },
    {
      id: 'cv-backend',
      name: 'Backend_Node_CV.pdf',
      source: t('uploadedPdf'),
      updatedAt: '10/05/2026',
      status: t('parsed'),
      score: 81,
      skills: ['Node.js', 'PostgreSQL', 'API'],
    },
  ];
  const portfolioProjects = [
    {
      name: 'Career Search Experience',
      role: 'Frontend Lead',
      summary: 'Built search suggestions, filter modal, job detail pages, and candidate-facing interaction states.',
      stack: ['React', 'TypeScript', 'Recharts'],
      link: 'github.com/minhanh/career-search',
      impact: 'Reduced job discovery time by 34% in prototype testing',
    },
    {
      name: 'Design System Console',
      role: 'UI Platform Engineer',
      summary: 'Created reusable components, chart surfaces, and form patterns for recruiter operations.',
      stack: ['Storybook', 'Accessibility', 'Testing'],
      link: 'portfolio.example.com/design-system',
      impact: 'Shipped 28 reusable components across 5 workflows',
    },
  ];

  return (
    <div className="page-stack profile-cv-route">
      <section className="plain-heading profile-cv-heading">
        <p className="eyebrow">{candidate.name}</p>
        <h2>{t('profileTitle')}</h2>
        <p>{t('profileCvDescription')}</p>
      </section>

      <section className="profile-cv-shell">
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
              <button className="primary-action">
                <UploadCloud size={17} />
                {t('uploadNewCv')}
              </button>
              <button>
                <Plus size={17} />
                {t('createCvByForm')}
              </button>
            </div>
            <div className="cv-card-list">
              {managedCvs.map((cv) => (
                <article className="cv-management-card" key={cv.id}>
                  <div className="cv-file-icon">
                    <FileText size={22} />
                  </div>
                  <div className="cv-card-main">
                    <div>
                      <h3>{cv.name}</h3>
                      <p>{cv.source} · {t('updatedLabel')} {cv.updatedAt}</p>
                    </div>
                    <ReasonChips reasons={cv.skills} />
                  </div>
                  <div className="cv-card-score">
                    <span>{cv.status}</span>
                    <MatchingBadge score={cv.score} label={cv.score >= 90 ? 'High' : 'Medium'} />
                  </div>
                  <div className="cv-card-actions">
                    <button>{t('setDefault')}</button>
                    <button>{t('view')}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : profileTab === 'profile' ? (
          <div className="fixed-profile-view">
            <div className="profile-cv-note">
              <UserRound size={18} />
              <span>Phần này không phải portfolio; đây là thông tin ổn định và preference dùng chung cho các CV.</span>
            </div>
            <div className="settings-grid">
              <label>
                {t('fullName')}
                <input defaultValue={candidate.name} />
              </label>
              <label>
                Email
                <input defaultValue={candidate.email} type="email" />
              </label>
              <label>
                {t('desiredTitle')}
                <input defaultValue={preference.desiredTitle} />
              </label>
              <label>
                {t('skills')}
                <input defaultValue={preference.skills.join(', ')} />
              </label>
              <label>
                {t('location')}
                <input defaultValue={preference.location} />
              </label>
              <label>
                {t('seniority')}
                <select defaultValue={preference.seniority}>
                  <option>Senior</option>
                  <option>Mid-Senior</option>
                  <option>Lead</option>
                </select>
              </label>
              <label>
                {t('expectedSalary')}
                <input defaultValue="$3,000 - $4,500" />
              </label>
              <label>
                {t('workingModel')}
                <select defaultValue="Hybrid">
                  <option>Hybrid</option>
                  <option>Remote</option>
                  <option>Onsite</option>
                </select>
              </label>
              <label>
                {t('threshold')}
                <input type="range" defaultValue={preference.autoApplyThreshold} min="50" max="100" />
              </label>
            </div>
            <div className="profile-form-actions">
              <button>{t('cancel')}</button>
              <button className="primary-action">{t('saveFixedProfile')}</button>
            </div>
          </div>
        ) : (
          <div className="portfolio-view">
            <div className="profile-cv-note">
              <Briefcase size={18} />
              <span>
                Portfolio là phần bổ trợ cho hồ sơ IT, dùng để thể hiện dự án, link sản phẩm và bằng chứng năng lực.
              </span>
            </div>

            <section className="portfolio-links-card">
              <div className="manual-card-title">
                <Globe size={22} />
                <div>
                  <h3>{t('personalLinks')}</h3>
                  <p>Những link này có thể hiển thị cho recruiter khi bạn ứng tuyển.</p>
                </div>
              </div>
              <div className="settings-grid">
                <label>
                  GitHub
                  <input defaultValue="github.com/minhanh" />
                </label>
                <label>
                  LinkedIn
                  <input defaultValue="linkedin.com/in/minhanh-frontend" />
                </label>
                <label>
                  Website cá nhân
                  <input defaultValue="portfolio.example.com/minhanh" />
                </label>
                <label>
                  Behance/Dribbble hoặc demo
                  <input placeholder="Optional design/demo link" />
                </label>
              </div>
            </section>

            <section className="portfolio-projects-section">
              <div className="inline-heading">
                <div>
                  <p className="eyebrow">Portfolio</p>
                  <h3>Dự án nổi bật</h3>
                </div>
                <button>
                  <Plus size={17} />
                  {t('addProject')}
                </button>
              </div>

              <div className="portfolio-project-list">
                {portfolioProjects.map((project) => (
                  <article className="portfolio-project-card" key={project.name}>
                    <div>
                      <p className="eyebrow">{project.role}</p>
                      <h3>{project.name}</h3>
                      <p>{project.summary}</p>
                    </div>
                    <ReasonChips reasons={project.stack} />
                    <div className="portfolio-project-meta">
                      <span>
                        <Globe size={15} />
                        {project.link}
                      </span>
                      <strong>{project.impact}</strong>
                    </div>
                    <div className="portfolio-project-actions">
                      <button>{t('edit')}</button>
                      <button>{t('viewLink')}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
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
  const { t } = useLanguage();
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{t('applications')}</p>
          <h2>{t('applicationsTitle')}</h2>
        </div>
        <div className="timeline">
          {applications.map((application) => (
            <article key={application.id}>
              <MatchingBadge score={application.score} label={application.score >= 90 ? 'High' : 'Medium'} />
              <h3>{application.jobTitle}</h3>
              <p>{application.company} · {application.status} · {application.updatedAt}</p>
              <small>{application.source === 'autopilot' ? 'AutoFit audit summary available' : 'Manual application'}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AutomationPage() {
  return (
    <div className="page-stack">
      <AutomationPolicyPanel policy={automationPolicy} />
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
              <option>7 days</option>
              <option>30 days</option>
              <option>90 days</option>
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

  return (
    <SettingsSurface
      eyebrow={t('recruiterSettings')}
      title={t('recruiterSettingsTitle')}
      copy={t('recruiterSettingsCopy')}
      sideTitle={t('workspaceStatus')}
      sideItems={[
        [t('companyProfile'), t('published')],
        [t('teamSeats'), `6 ${t('active').toLowerCase()}`],
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
              <option>Hybrid</option>
              <option>Remote</option>
              <option>Onsite</option>
            </select>
          </label>
          <label>
            {t('defaultSalaryMode')}
            <select defaultValue="Range">
              <option>Range</option>
              <option>Negotiable</option>
              <option>Hidden</option>
            </select>
          </label>
          <label>
            {t('candidateReviewSla')}
            <select defaultValue="48 hours">
              <option>24 hours</option>
              <option>48 hours</option>
              <option>72 hours</option>
            </select>
          </label>
          <label>
            {t('defaultLanguage')}
            <select defaultValue="Vietnamese / English">
              <option>Vietnamese</option>
              <option>English</option>
              <option>Vietnamese / English</option>
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

function SettingsSurface({
  eyebrow,
  title,
  copy,
  sideTitle,
  sideItems,
  accountActions,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  sideTitle: string;
  sideItems: Array<[string, string]>;
  accountActions?: ReactNode;
  children: ReactNode;
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
          <button className="primary-action full">
            <Save size={17} />
            {t('saveSettings')}
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

function SettingToggle({ title, detail, checked = false }: { title: string; detail: string; checked?: boolean }) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input type="checkbox" defaultChecked={checked} />
    </label>
  );
}

function RecruiterHomePage() {
  const { t } = useLanguage();
  const { data: summary = recruiterSummary } = useRecruiterSummary();
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
        <StatCard label={t('activeJobs')} value={summary.activeJobs} detail={t('fourClosingThisWeek')} />
        <StatCard label={t('pendingApprovals')} value={summary.pendingApprovals} detail="HITL queue" />
        <StatCard label={t('highMatches')} value={summary.highMatches} detail="score >= 85%" />
        <StatCard label={t('invitesSent')} value={summary.invitesSent} detail={t('lastSevenDays')} />
      </section>
      <RecruiterOverviewPanel />
    </div>
  );
}

function RecruiterOverviewPanel() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: recruiterJobs = jobs } = useRecruiterJobs();

  return (
    <section className="panel recruiter-workspace-panel">
      <div className="section-heading inline-heading">
        <div>
          <p className="eyebrow">{t('recruiter')}</p>
          <h2>{t('rankingPoolTitle')}</h2>
        </div>
        <div className="actions">
          <button>{t('createJd')}</button>
          <button className="primary-action">{t('exportRanking')}</button>
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
        {recruiterJobs.map((job, index) => (
          <button className="table-row recruiter-row" key={job.id} onClick={() => navigate(`/recruiter/jobs/${job.id}/ranking`)}>
            <span>
              {job.title}
              <small>{job.company}</small>
            </span>
            <span>
              <MatchingBadge score={job.normalizedScore} label={job.label} />
            </span>
            <span>{8 + index * 3}</span>
            <span>{job.isPotential ? <PotentialBadge /> : t('no')}</span>
            <span>{index % 2 === 0 ? t('approvalReady') : t('collectingSignals')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecruiterJobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { jobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const recruiterSubview = getRecruiterSubview(location.pathname);
  const recruiterQuery = getRecruiterJobsQuery(searchParams);
  const { data: recruiterJobs = jobs } = useRecruiterJobs();
  const selectedJob = recruiterJobs.find((job) => job.id === jobId) ?? recruiterJobs[0] ?? jobs[0];
  const selectedJobIndex = recruiterJobs.findIndex((job) => job.id === selectedJob.id);
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
  const candidates = [
    {
      initials: 'MA',
      name: 'Minh Anh',
      title: 'Frontend Engineer at Product Labs',
      appliedAt: t('appliedTwoDaysAgo'),
      score: 92,
      tone: 'secondary',
    },
    {
      initials: 'QC',
      name: 'Quang Chen',
      title: 'UI Platform Engineer at Finflow',
      appliedAt: t('appliedThreeDaysAgo'),
      score: 78,
      tone: 'primary',
    },
    {
      initials: 'HN',
      name: 'Ha Nguyen',
      title: 'React Developer at AtlasWorks',
      appliedAt: t('potentialMatch'),
      score: 86,
      tone: 'primary',
    },
  ];
  const visibleCandidates = useMemo(() => {
    const normalized = recruiterQuery.q.trim().toLowerCase();
    return candidates
      .filter((item) => !normalized || [item.name, item.title].join(' ').toLowerCase().includes(normalized))
      .filter((item) => recruiterQuery.status === 'all' || (recruiterQuery.status === 'active' ? item.score >= 85 : item.score < 85))
      .sort((a, b) => {
        if (recruiterQuery.sort === 'newest') return candidates.indexOf(a) - candidates.indexOf(b);
        return b.score - a.score;
      });
  }, [candidates, recruiterQuery.q, recruiterQuery.status, recruiterQuery.sort]);

  function updateRecruiterQuery(key: 'q' | 'status' | 'sort', value: string) {
    const params = new URLSearchParams(searchParams);
    const defaults = { q: '', status: 'all', sort: 'score_desc' };
    setOrDeleteParam(params, key, value, defaults[key]);
    setSearchParams(params);
  }

  function navigateRecruiterSubview(job: Job, subview: RecruiterSubview = recruiterSubview) {
    const suffix = subview === 'ranking' ? 'ranking' : subview;
    const search = searchParams.toString();
    navigate({ pathname: `/recruiter/jobs/${job.id}/${suffix}`, search: search ? `?${search}` : '' });
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
          <button className="primary-action">
            <Plus size={17} />
            {t('postJob')}
          </button>
        </div>
      </div>

      <div className="recruiter-hr-grid">
        <aside className="recruiter-requisition-panel">
          <div className="requisition-panel-head">
            <h3>{t('activeRequisitions')}</h3>
            <button aria-label={t('postJob')}>
              <Plus size={18} />
            </button>
          </div>
          <div className="requisition-list">
            {visibleRecruiterJobs.map((job) => {
              const index = recruiterJobs.findIndex((item) => item.id === job.id);
              return (
              <button
                className={job.id === selectedJob.id ? 'requisition-row active' : 'requisition-row'}
                key={job.id}
                onClick={() => navigateRecruiterSubview(job)}
              >
                <span className="requisition-row-top">
                  <strong>{job.title}</strong>
                  <em>{index === 1 ? t('draft') : t('active')}</em>
                </span>
                <span className="requisition-row-meta">
                  <span>
                    <MapPin size={14} />
                    {job.location.split(',')[0]}
                  </span>
                  <span>
                    <Users size={14} />
                    {8 + index * 11} {t('applicants')}
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
                <button aria-label={t('edit')}>
                  <Edit3 size={17} />
                </button>
                <button aria-label={t('delete')}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <ReasonChips reasons={[...selectedJob.requiredSkills, t('fiveYearsExp')].slice(0, 5)} />
          </article>

          <div className="candidate-tabs">
            <button className={recruiterSubview === 'applicants' || recruiterSubview === 'ranking' ? 'active' : ''} onClick={() => navigateRecruiterSubview(selectedJob, 'applicants')}>
              {t('appliedCvs')} ({18 + selectedJobIndex * 7})
            </button>
            <button className={recruiterSubview === 'potential' ? 'active' : ''} onClick={() => navigateRecruiterSubview(selectedJob, 'potential')}>
              {t('aiPotentialMatches')} ({selectedJob.isPotential ? 15 : 8})
            </button>
          </div>

          <div className="recruiter-candidate-list">
            {visibleCandidates.map((item) => (
              <article className="candidate-review-card" key={item.name}>
                <div className="candidate-review-main">
                  <div className="candidate-avatar">{item.initials}</div>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.title}</p>
                    <small>{item.appliedAt}</small>
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
                  <button aria-label={t('goodMatch')}>
                    <ThumbsUp size={17} />
                  </button>
                  <button aria-label={t('badMatch')}>
                    <ThumbsDown size={17} />
                  </button>
                  <button>{t('viewCv')}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
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

const fallbackAdvancedTrends: AdvancedTrendPoint[] = [
  { date: '2026-05-27', jobs: 34, matches: 82, applications: 18, views: 420, avgMatchScore: 76 },
  { date: '2026-05-28', jobs: 42, matches: 96, applications: 21, views: 510, avgMatchScore: 79 },
  { date: '2026-05-29', jobs: 39, matches: 104, applications: 24, views: 552, avgMatchScore: 81 },
  { date: '2026-05-30', jobs: 51, matches: 118, applications: 30, views: 630, avgMatchScore: 83 },
  { date: '2026-05-31', jobs: 46, matches: 122, applications: 27, views: 590, avgMatchScore: 82 },
  { date: '2026-06-01', jobs: 58, matches: 138, applications: 35, views: 712, avgMatchScore: 85 },
  { date: '2026-06-02', jobs: 63, matches: 146, applications: 39, views: 760, avgMatchScore: 86 },
];

const fallbackAdvancedMarket: AdvancedMarketOverview = {
  activeJobs: 55088,
  totalJobs: 81240,
  newJobsInRange: 3332,
  employers: 18485,
  jobViews: 41720,
  jobSearches: 12880,
  applications: 4812,
  matchings: 24260,
  topSkills: [
    { skill: 'React', jobCount: 14861 },
    { skill: 'Java', jobCount: 13620 },
    { skill: 'TypeScript', jobCount: 11920 },
    { skill: 'Node.js', jobCount: 9860 },
    { skill: 'SQL', jobCount: 8420 },
    { skill: 'DevOps', jobCount: 6820 },
  ],
  salaryDistribution: [
    { currency: 'USD', seniority: 'Junior', jobCount: 920, minSalary: 600, averageSalary: 950, maxSalary: 1400 },
    { currency: 'USD', seniority: 'Mid', jobCount: 9680, minSalary: 1200, averageSalary: 2200, maxSalary: 3400 },
    { currency: 'USD', seniority: 'Senior', jobCount: 31286, minSalary: 2500, averageSalary: 3800, maxSalary: 5200 },
    { currency: 'USD', seniority: 'Lead', jobCount: 6860, minSalary: 4200, averageSalary: 5600, maxSalary: 7600 },
  ],
};

const fallbackCandidateAnalytics: CandidateAnalyticsOverview = {
  profileCompleteness: 88,
  cvCount: 3,
  scoringDoneCvCount: 2,
  totalMatches: 42,
  highMatches: 12,
  potentialMatches: 9,
  averageMatchScore: 84,
  bestMatchScore: 94,
  totalApplications: 3,
  applicationFunnel: { PENDING: 1, APPROVED: 1, INVITED: 1, REJECTED: 0 },
  skillDemand: [
    { skill: 'React', jobCount: 14861, candidateHasSkill: true },
    { skill: 'TypeScript', jobCount: 11920, candidateHasSkill: true },
    { skill: 'Testing', jobCount: 7240, candidateHasSkill: true },
  ],
  profileGaps: [
    { skill: 'Node.js', marketDemand: 9860, reason: 'High market demand skill not found in candidate profile/CV' },
    { skill: 'AWS', marketDemand: 7820, reason: 'Frequently paired with senior frontend platform roles' },
    { skill: 'GraphQL', marketDemand: 5480, reason: 'Appears in product engineering JDs with React' },
  ],
};

const fallbackRecruiterAnalytics: RecruiterAnalyticsOverview = {
  totalJobs: 18,
  activeJobs: 12,
  totalApplicants: 132,
  pendingReview: 7,
  approved: 28,
  rejected: 16,
  invited: 42,
  autoApplied: 9,
  totalMatchings: 284,
  highMatchings: 76,
  potentialMatchings: 38,
  averageMatchScore: 82,
  jobViews: 4240,
  topJobs: [
    { jobId: 'job-01', title: 'Senior Frontend Engineer', status: 'ACTIVE', views: 920, matches: 74, applications: 18, avgMatchScore: 88 },
    { jobId: 'job-02', title: 'Product-minded React Developer', status: 'ACTIVE', views: 760, matches: 62, applications: 14, avgMatchScore: 84 },
    { jobId: 'job-03', title: 'Fullstack TypeScript Engineer', status: 'ACTIVE', views: 680, matches: 51, applications: 11, avgMatchScore: 79 },
  ],
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
            Range
            <select value={rangeDays} onChange={(event) => updateRangeDays(Number(event.target.value))}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
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
  return (
    <aside className="filter-panel">
      <p className="eyebrow">Refine Search</p>
      <label>
        Specialization
        <select defaultValue="Frontend Engineering">
          <option>Frontend Engineering</option>
          <option>Fullstack TypeScript</option>
          <option>UI Platform</option>
        </select>
      </label>
      <label>
        Score confidence
        <input type="range" min="60" max="100" defaultValue="88" />
      </label>
      <label>
        Work model
        <select defaultValue="Hybrid">
          <option>Hybrid</option>
          <option>Remote</option>
          <option>Onsite</option>
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

function JobListWithPreview({
  jobs: list,
  isLoading = false,
  onOpen,
  onSkip,
  onApply,
  showMatchMeta = true,
}: {
  jobs: Job[];
  isLoading?: boolean;
  onOpen: (job: Job) => void;
  onSkip?: (id: string) => void;
  onApply?: (job: Job) => void;
  showMatchMeta?: boolean;
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
        <h3>{t('noMatchingJobs')}</h3>
        <p>{t('noMatchingJobsCopy')}</p>
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
          <JobCard job={job} onOpen={onOpen} onSkip={onSkip} onApply={onApply} showMatchMeta={showMatchMeta} />
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
  const { t } = useLanguage();
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
        <strong>{job.salary}</strong>
        <span>{job.location}</span>
        <span>{t('updatedToday')}</span>
        <span>{t('deadline')}: 15/06/2026</span>
      </div>
      <div className="hover-scroll-content">
        <section>
          <h4>Mô tả công việc</h4>
          <ul>
            <li>{job.description}</li>
            <li>{t('jdHoverResponsibilityOne')}</li>
            <li>{t('jdHoverResponsibilityTwo')}</li>
            <li>{t('jdHoverResponsibilityThree')}</li>
          </ul>
        </section>
        <section>
          <h4>Yêu cầu công việc</h4>
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
  const { t } = useLanguage();
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
                <option value={value} key={value}>{value === 'all' ? t('allCities') : label}</option>
              ))}
            </select>
          </label>
          <label>
            {t('seniority')}
            <select value={draftFilters.level} onChange={(event) => updateDraftFilter('level', event.target.value)}>
              {jobFilterOptions.level.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
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
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            {t('workingModel')}
            <select value={draftFilters.workModel} onChange={(event) => updateDraftFilter('workModel', event.target.value)}>
              {jobFilterOptions.workModel.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            {t('jobDomain')}
            <select value={draftFilters.domain} onChange={(event) => updateDraftFilter('domain', event.target.value)}>
              {jobFilterOptions.domain.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
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

function JobDetailContent({ job, showMatchMeta = true }: { job: Job; showMatchMeta?: boolean }) {
  const { t } = useLanguage();

  return (
    <article className="jd-detail-page">
      <section className="jd-detail-hero">
        <div className="company-logo large">{job.company.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">{job.company}</p>
          <h1>{job.title}</h1>
          <p>{job.location} · {job.seniority} · {job.language}</p>
        </div>
        {showMatchMeta ? <MatchingBadge score={job.normalizedScore} label={job.label} /> : null}
      </section>

      <section className="jd-summary-grid">
        <div>
          <span>{t('salary')}</span>
          <strong>{job.salary}</strong>
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
  const { t } = useLanguage();
  const [demandMode, setDemandMode] = useState<'job' | 'salary'>('job');
  const jobPostingTrend = [
    { day: 'Mon', postings: 43820 },
    { day: 'Tue', postings: 52940 },
    { day: 'Wed', postings: 60849 },
    { day: 'Thu', postings: 78420 },
    { day: 'Fri', postings: 75260 },
    { day: 'Sat', postings: 36180 },
    { day: 'Sun', postings: 28450 },
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

function getSalaryMax(salary: string) {
  const numbers = salary.match(/\d[\d,.]*/g)?.map((item) => Number(item.replace(/,/g, ''))) ?? [];
  return numbers.length ? Math.max(...numbers) : 0;
}

function getMockSearchSuggestions(query: string): SearchSuggestionGroup {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const skillItems = Array.from(new Set(jobs.flatMap((job) => [...job.requiredSkills, ...job.optionalSkills])))
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 4);
    const companyItems = Array.from(new Set(jobs.map((job) => job.company)))
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 3);
    const roleItems = jobs
      .map((job) => job.title)
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 3);

    return [
      { group: 'searchGroupSkills', items: skillItems },
      { group: 'searchGroupJobTitle', items: roleItems },
      { group: 'searchGroupCompany', items: companyItems },
    ];
}

function useSearchSuggestions(query: string) {
  const fallback = useMemo(() => getMockSearchSuggestions(query), [query]);
  const { data } = useQuery({
    queryKey: ['job-search-suggestions', query],
    enabled: query.trim().length > 0,
    queryFn: () => careerfitApi.getSearchSuggestions(query),
    staleTime: 60_000,
    retry: false,
  });

  return data?.some((group) => group.items.length > 0) ? data : fallback;
}

function useJobs({ isPublic, keyword = '' }: { isPublic: boolean; keyword?: string }) {
  return useQuery({
    queryKey: [isPublic ? 'public-jobs' : 'candidate-jobs', keyword],
    queryFn: async () => {
      try {
        return isPublic ? await careerfitApi.searchJobs(keyword) : await careerfitApi.getCandidateJobs();
      } catch {
        await delay(160);
        return keyword ? getLocallyFilteredJobs(jobs, keyword) : jobs;
      }
    },
    refetchInterval: 60_000,
  });
}

function useJobDetail(jobId: string | undefined, fallbackJob: Job, isPublic: boolean) {
  return useQuery({
    queryKey: ['job-detail', jobId, isPublic ? 'public' : 'candidate'],
    enabled: Boolean(jobId),
    queryFn: async () => {
      if (!jobId) return fallbackJob;
      try {
        const [publicJob, candidateJobs] = await Promise.all([
          careerfitApi.getJob(jobId),
          isPublic ? Promise.resolve([]) : careerfitApi.getCandidateJobs().catch(() => []),
        ]);
        const personalizedJob = candidateJobs.find((item) => item.id === jobId);
        return personalizedJob
          ? {
              ...publicJob,
              normalizedScore: personalizedJob.normalizedScore,
              label: personalizedJob.label,
              isPotential: personalizedJob.isPotential,
              reasons: personalizedJob.reasons,
            }
          : publicJob;
      } catch {
        await delay(120);
        return fallbackJob;
      }
    },
  });
}

function useRecruiterSummary() {
  return useQuery({
    queryKey: ['recruiter-summary'],
    queryFn: async () => {
      try {
        return await careerfitApi.getRecruiterDashboard();
      } catch {
        await delay(120);
        return recruiterSummary;
      }
    },
    refetchInterval: 60_000,
  });
}

function useRecruiterJobs() {
  return useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: async () => {
      try {
        return await careerfitApi.getRecruiterJobs();
      } catch {
        await delay(120);
        return jobs;
      }
    },
    refetchInterval: 60_000,
  });
}

function useAdvancedMarketAnalytics(rangeDays: number) {
  const overview = useQuery({
    queryKey: ['advanced-market-overview', rangeDays],
    queryFn: async () => {
      try {
        return await careerfitApi.getAdvancedMarketOverview(rangeDays);
      } catch {
        await delay(120);
        return fallbackAdvancedMarket;
      }
    },
    refetchInterval: 60_000,
  });
  const skills = useQuery({
    queryKey: ['advanced-market-skills'],
    queryFn: async () => {
      try {
        return await careerfitApi.getAdvancedMarketSkills(12);
      } catch {
        return fallbackAdvancedMarket.topSkills;
      }
    },
  });
  const salary = useQuery({
    queryKey: ['advanced-market-salary'],
    queryFn: async () => {
      try {
        return await careerfitApi.getAdvancedMarketSalary();
      } catch {
        return fallbackAdvancedMarket.salaryDistribution;
      }
    },
  });
  const trends = useQuery({
    queryKey: ['advanced-market-trends', rangeDays],
    queryFn: async () => {
      try {
        return await careerfitApi.getAdvancedMarketTrends(rangeDays);
      } catch {
        return fallbackAdvancedTrends;
      }
    },
  });

  return {
    ...(overview.data ?? fallbackAdvancedMarket),
    topSkills: skills.data ?? overview.data?.topSkills ?? fallbackAdvancedMarket.topSkills,
    salaryDistribution: salary.data ?? overview.data?.salaryDistribution ?? fallbackAdvancedMarket.salaryDistribution,
    trends: trends.data ?? fallbackAdvancedTrends,
  };
}

function useCandidateAdvancedAnalytics(enabled: boolean, rangeDays: number) {
  const overview = useQuery({
    queryKey: ['candidate-advanced-overview'],
    enabled,
    queryFn: async () => {
      try {
        return await careerfitApi.getCandidateAdvancedOverview();
      } catch {
        return fallbackCandidateAnalytics;
      }
    },
    refetchInterval: 60_000,
  });
  const trends = useQuery({
    queryKey: ['candidate-advanced-trends', rangeDays],
    enabled,
    queryFn: async () => {
      try {
        return await careerfitApi.getCandidateAdvancedTrends(rangeDays);
      } catch {
        return fallbackAdvancedTrends;
      }
    },
  });

  return {
    overview: overview.data ?? fallbackCandidateAnalytics,
    trends: trends.data ?? fallbackAdvancedTrends,
  };
}

function useRecruiterAdvancedAnalytics(enabled: boolean, rangeDays: number) {
  const overview = useQuery({
    queryKey: ['recruiter-advanced-overview', rangeDays],
    enabled,
    queryFn: async () => {
      try {
        return await careerfitApi.getRecruiterAdvancedOverview(rangeDays);
      } catch {
        return fallbackRecruiterAnalytics;
      }
    },
    refetchInterval: 60_000,
  });
  const trends = useQuery({
    queryKey: ['recruiter-advanced-trends', rangeDays],
    enabled,
    queryFn: async () => {
      try {
        return await careerfitApi.getRecruiterAdvancedTrends(rangeDays);
      } catch {
        return fallbackAdvancedTrends;
      }
    },
  });

  return {
    overview: overview.data ?? fallbackRecruiterAnalytics,
    trends: trends.data ?? fallbackAdvancedTrends,
  };
}

function getLocallyFilteredJobs(sourceJobs: Job[], query: string) {
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
}
