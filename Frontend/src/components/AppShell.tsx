import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Home,
  Languages,
  Search,
  Settings2,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

const candidateLinks = [
  { to: '/candidate', key: 'dashboard', icon: Home },
  { to: '/candidate/jobs', key: 'jobs', icon: Search },
  { to: '/candidate/upload', key: 'upload', icon: UploadCloud },
  { to: '/candidate/profile', key: 'profile', icon: UserRound },
  { to: '/candidate/recommendations', key: 'recommendations', icon: Gauge },
  { to: '/candidate/applications', key: 'applications', icon: FileText },
  { to: '/candidate/automation', key: 'automation', icon: Settings2 },
];

const recruiterLinks = [
  { to: '/recruiter', key: 'dashboard', icon: Home },
  { to: '/recruiter/jobs', key: 'jobs', icon: BriefcaseBusiness },
  { to: '/recruiter/analytics', key: 'analytics', icon: BarChart3 },
  { to: '/recruiter/automation', key: 'automation', icon: Settings2 },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const role: Role = location.pathname.startsWith('/recruiter') ? 'recruiter' : 'candidate';
  const links = role === 'candidate' ? candidateLinks : recruiterLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate(role === 'candidate' ? '/candidate' : '/recruiter')}>
          <span className="brand-mark">CF</span>
          <span>
            <strong>CareerFit IT</strong>
            <small>AutoPilot</small>
          </span>
        </button>

        <nav className="side-nav" aria-label="Primary">
          {links.map(({ to, key, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/candidate' || to === '/recruiter'}>
              <Icon size={18} />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="role-switch">
          <button className={role === 'candidate' ? 'active' : ''} onClick={() => navigate('/candidate')}>
            {t('candidate')}
          </button>
          <button className={role === 'recruiter' ? 'active' : ''} onClick={() => navigate('/recruiter')}>
            {t('recruiter')}
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === 'candidate' ? t('candidate') : t('recruiter')}</p>
            <h1>{t('brand')}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-pill" aria-label={t('notifications')}>
              <Bell size={18} />
              <span className="pulse" />
            </button>
            <button
              className="language-switch"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              aria-label={t('language')}
            >
              <Languages size={17} />
              {language.toUpperCase()}
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
