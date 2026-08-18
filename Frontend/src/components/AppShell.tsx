import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Home,
  Languages,
  LogIn,
  Search,
  Settings,
  SlidersHorizontal,
  UploadCloud,
  UserRound,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { Role } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

type ShellRole = Role | 'guest';

const candidateLinks = [
  { to: '/candidate', key: 'dashboard', icon: Home },
  { to: '/candidate/jobs', key: 'jobs', icon: Search },
  { to: '/candidate/upload', key: 'upload', icon: UploadCloud },
  { to: '/candidate/profile', key: 'profile', icon: UserRound },
  { to: '/candidate/recommendations', key: 'recommendations', icon: Gauge },
  { to: '/candidate/advanced-analytics', key: 'advancedAnalytics', icon: BarChart3 },
  { to: '/candidate/applications', key: 'applications', icon: FileText },
  { to: '/candidate/automation', key: 'automation', icon: SlidersHorizontal },
];

const guestLinks = [
  { to: '/', key: 'dashboard', icon: Home },
  { to: '/jobs', key: 'jobs', icon: Search },
  { to: '/candidate/upload', key: 'upload', icon: UploadCloud },
  { to: '/candidate/profile', key: 'profile', icon: UserRound },
  { to: '/candidate/recommendations', key: 'recommendations', icon: Gauge },
  { to: '/candidate/applications', key: 'applications', icon: FileText },
  { to: '/candidate/automation', key: 'automation', icon: SlidersHorizontal },
];

const recruiterLinks = [
  { to: '/recruiter', key: 'dashboard', icon: Home },
  { to: '/recruiter/jobs', key: 'jobs', icon: BriefcaseBusiness },
  { to: '/recruiter/talent-pool', key: 'talentPool', icon: Users },
  { to: '/recruiter/analytics', key: 'analytics', icon: BarChart3 },
  { to: '/recruiter/advanced-analytics', key: 'advancedAnalytics', icon: Gauge },
  { to: '/recruiter/automation', key: 'automation', icon: SlidersHorizontal },
];

const adminLinks = [
  { to: '/admin', key: 'dashboard', icon: Home },
  { to: '/admin/users', key: 'users', icon: UserRound },
  { to: '/admin/jobs', key: 'jobs', icon: BriefcaseBusiness },
  { to: '/admin/audit-logs', key: 'auditLogs', icon: FileText },
  { to: '/admin/email-monitor', key: 'emailMonitor', icon: Bell },
];

export function AppShell({ role }: { role: ShellRole }) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const links = role === 'guest' ? guestLinks : role === 'admin' ? adminLinks : role === 'candidate' ? candidateLinks : recruiterLinks;
  const homePath = role === 'guest' ? '/' : role === 'admin' ? '/admin' : role === 'candidate' ? '/candidate' : '/recruiter';

  return (
    <div className={role === 'guest' ? 'app-shell guest-shell' : 'app-shell signed-shell'}>
      <header className={role === 'guest' ? 'site-header guest-header' : 'site-header signed-header'}>
        <div className="header-inner">
          <button className="brand" onClick={() => navigate(homePath)}>
            <span className="brand-mark">CF</span>
            <span>
              <strong>CareerFit IT</strong>
              <small>{role === 'guest' ? t('guestAccess') : 'AutoPilot'}</small>
            </span>
          </button>

          <nav className="top-nav" aria-label={language === 'vi' ? 'Điều hướng chính' : 'Primary navigation'}>
            {links.map(({ to, key, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/' || to === '/candidate' || to === '/recruiter'}>
                <Icon size={17} />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            {role === 'guest' ? (
              <>
                <span className="guest-chip">{t('guest')}</span>
                <button className="login-link" onClick={() => navigate('/login')}>
                  <LogIn size={17} />
                  {t('login')}
                </button>
              </>
            ) : (
              <>
                <div className="role-switch single" aria-label={t('role')}>
                  <span className="active">{role === 'admin' ? t('admin') : role === 'candidate' ? t('candidate') : t('recruiter')}</span>
                </div>
                <button
                  className="icon-pill"
                  aria-label={t('notifications')}
                  title={t('notifications')}
                  onClick={() => navigate(role === 'admin' ? '/admin/email-monitor' : role === 'candidate' ? '/candidate/settings' : '/recruiter/settings')}
                >
                  <Bell size={18} />
                  <span className="pulse" />
                </button>
                <button
                  className="icon-pill settings-shortcut"
                  onClick={() => navigate(role === 'admin' ? '/admin' : role === 'candidate' ? '/candidate/settings' : '/recruiter/settings')}
                  aria-label={t('settings')}
                  title={t('settings')}
                >
                  <Settings size={18} />
                </button>
              </>
            )}
            <button
              className="language-switch"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              aria-label={t('language')}
            >
              <Languages size={17} />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
