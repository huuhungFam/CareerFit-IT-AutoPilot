import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, FileUp, MailCheck, Search, ShieldCheck, Sparkles, UploadCloud, XCircle } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { AutomationPolicyPanel } from './components/AutomationPolicyPanel';
import { MatchingBadge, PotentialBadge, ReasonChips } from './components/Badges';
import { JobCard } from './components/JobCard';
import { StatCard } from './components/StatCard';
import { useLanguage } from './i18n/LanguageProvider';
import {
  applications,
  automationPolicy,
  candidate,
  delay,
  emailAction,
  jobs,
  preference,
  recruiterSummary,
  trends,
} from './data/mock';
import type { Job } from './types';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage mode="register" />} />
      <Route path="/automation/confirm" element={<AutomationConfirmPage />} />
      <Route path="/automation/result" element={<AutomationResultPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/candidate" replace />} />
        <Route path="/candidate" element={<CandidateHomePage />} />
        <Route path="/candidate/jobs" element={<CandidateJobsPage />} />
        <Route path="/candidate/jobs/:jobId" element={<CandidateJobsPage />} />
        <Route path="/candidate/upload" element={<UploadPage />} />
        <Route path="/candidate/profile" element={<ProfilePage />} />
        <Route path="/candidate/recommendations" element={<RecommendationsPage />} />
        <Route path="/candidate/applications" element={<ApplicationsPage />} />
        <Route path="/candidate/automation" element={<AutomationPage />} />
        <Route path="/recruiter" element={<RecruiterHomePage />} />
        <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
        <Route path="/recruiter/jobs/:jobId" element={<RecruiterJobsPage />} />
        <Route path="/recruiter/jobs/:jobId/ranking" element={<RecruiterJobsPage />} />
        <Route path="/recruiter/jobs/:jobId/applicants" element={<RecruiterJobsPage />} />
        <Route path="/recruiter/jobs/:jobId/potential" element={<RecruiterJobsPage />} />
        <Route path="/recruiter/analytics" element={<AnalyticsPage />} />
        <Route path="/recruiter/automation" element={<AutomationPage />} />
      </Route>
    </Routes>
  );
}

function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">{t('brand')}</p>
        <h1>{mode === 'login' ? t('login') : t('register')}</h1>
        <p>{t('candidateHomeCopy')}</p>
      </section>
      <section className="auth-card">
        <label>
          {t('email')}
          <input placeholder="you@example.com" type="email" />
        </label>
        <label>
          {t('password')}
          <input placeholder="••••••••" type="password" />
        </label>
        <button className="primary-action full" onClick={() => navigate('/candidate')}>
          {t('signIn')}
        </button>
        <button className="full">
          <MailCheck size={16} />
          {t('passwordless')}
        </button>
      </section>
    </main>
  );
}

function CandidateHomePage() {
  const { t } = useLanguage();
  const { data = jobs } = useMockQuery('candidate-home-jobs', jobs);

  return (
    <div className="page-stack">
      <Hero
        eyebrow={candidate.headline}
        title={t('candidateHomeTitle')}
        copy={t('candidateHomeCopy')}
        actionLabel={t('upload')}
        icon={<Sparkles size={22} />}
      />

      <section className="stats-grid">
        <StatCard label={t('recommendations')} value="12" detail="4 jobs above 90%" />
        <StatCard label={t('autoApply')} value="88%" detail={`${t('nextScan')}: ${automationPolicy.nextScanAt}`} />
        <StatCard label={t('applications')} value={applications.length} detail="1 invite this week" />
      </section>

      <div className="split-layout">
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{t('jobs')}</p>
            <h2>Highlighted matches</h2>
          </div>
          <div className="job-list compact">
            {data.slice(0, 2).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
        <AutomationPolicyPanel policy={automationPolicy} />
      </div>
    </div>
  );
}

function CandidateJobsPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [visibleJobs, setVisibleJobs] = useState(jobs);
  const [selected, setSelected] = useState<Job | null>(jobs[0]);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return visibleJobs;
    return visibleJobs.filter((job) =>
      [job.title, job.company, job.location, ...job.requiredSkills].join(' ').toLowerCase().includes(normalized),
    );
  }, [query, visibleJobs]);

  return (
    <div className="page-stack">
      <section className="search-band">
        <div>
          <p className="eyebrow">{t('jobs')}</p>
          <h2>{t('recommendationsTitle')}</h2>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} />
        </label>
      </section>

      <div className="jobs-layout">
        <section className="job-list">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={setSelected}
              onSkip={(id) => setVisibleJobs((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </section>
        <JobDetailPanel job={selected ?? filteredJobs[0]} />
      </div>
    </div>
  );
}

function JobDetailPanel({ job }: { job?: Job }) {
  const { t } = useLanguage();
  if (!job) {
    return (
      <aside className="detail-panel">
        <h2>No job selected</h2>
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
      <h3>Required skills</h3>
      <ReasonChips reasons={job.requiredSkills} />
      <div className="actions vertical">
        <button className="primary-action">{t('apply')}</button>
        <button>{t('save')}</button>
        <button>{t('similar')}</button>
      </div>
    </aside>
  );
}

function UploadPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'uploading' | 'processing' | 'scored'>('idle');

  async function simulateUpload() {
    setState('uploading');
    await delay(600);
    setState('processing');
    await delay(700);
    setState('scored');
  }

  return (
    <div className="page-stack">
      <Hero eyebrow={t('upload')} title={t('uploadTitle')} copy={t('uploadCopy')} actionLabel="PDF only" icon={<FileUp size={22} />} />
      <section className={`dropzone ${state}`} onClick={simulateUpload}>
        <UploadCloud size={40} />
        <h2>{state === 'idle' ? 'Drop CV PDF here' : state}</h2>
        <p>cv-minh-anh.pdf · max 10MB · validation mirrors backend constraints</p>
      </section>
      {state === 'scored' ? (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{t('score')}</p>
            <h2>Ranking results</h2>
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
  return (
    <div className="page-stack">
      <section className="panel form-panel">
        <div className="section-heading">
          <p className="eyebrow">{candidate.name}</p>
          <h2>{t('profileTitle')}</h2>
        </div>
        <div className="settings-grid">
          <label>
            Desired title
            <input defaultValue={preference.desiredTitle} />
          </label>
          <label>
            Skills
            <input defaultValue={preference.skills.join(', ')} />
          </label>
          <label>
            Location
            <input defaultValue={preference.location} />
          </label>
          <label>
            Seniority
            <select defaultValue={preference.seniority}>
              <option>Senior</option>
              <option>Mid-Senior</option>
              <option>Lead</option>
            </select>
          </label>
          <label>
            {t('threshold')}
            <input type="range" defaultValue={preference.autoApplyThreshold} min="50" max="100" />
          </label>
        </div>
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

function RecruiterHomePage() {
  const { t } = useLanguage();
  return (
    <div className="page-stack">
      <Hero eyebrow={t('recruiter')} title={t('recruiterHomeTitle')} copy={t('recruiterHomeCopy')} actionLabel={t('jobs')} icon={<ShieldCheck size={22} />} />
      <section className="stats-grid">
        <StatCard label={t('activeJobs')} value={recruiterSummary.activeJobs} detail="4 closing this week" />
        <StatCard label={t('pendingApprovals')} value={recruiterSummary.pendingApprovals} detail="HITL queue" />
        <StatCard label={t('highMatches')} value={recruiterSummary.highMatches} detail="score >= 85%" />
        <StatCard label={t('invitesSent')} value={recruiterSummary.invitesSent} detail="last 7 days" />
      </section>
      <RecruiterJobsPage />
    </div>
  );
}

function RecruiterJobsPage() {
  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Recruiter</p>
        <h2>Ranking, applicants, and potential pool</h2>
      </div>
      <div className="ranking-table">
        <div className="table-row table-head">
          <span>Job</span>
          <span>Top score</span>
          <span>Applicants</span>
          <span>Potential</span>
          <span>Status</span>
        </div>
        {jobs.map((job, index) => (
          <div className="table-row" key={job.id}>
            <span>{job.title}<small>{job.company}</small></span>
            <span>{job.normalizedScore}%</span>
            <span>{8 + index * 3}</span>
            <span>{job.isPotential ? 'Yes' : 'No'}</span>
            <span>{index % 2 === 0 ? 'Approval ready' : 'Collecting signals'}</span>
          </div>
        ))}
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
        <h1>Action processed</h1>
        <p>Audit log updated, application state changed, and the next AutoFit scan remains governed by candidate policy.</p>
      </section>
    </main>
  );
}

function Hero({
  eyebrow,
  title,
  copy,
  actionLabel,
  icon,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  actionLabel: string;
  icon: ReactNode;
}) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <button className="primary-action">
        {icon}
        {actionLabel}
      </button>
    </section>
  );
}

function useMockQuery<T>(key: string, data: T) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => {
      await delay(200);
      return data;
    },
    refetchInterval: 60_000,
  });
}
