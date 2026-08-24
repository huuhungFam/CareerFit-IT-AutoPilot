import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import type { MatchLabel } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

export function MatchingBadge({ score, label }: { score: number; label: MatchLabel }) {
  const { t } = useLanguage();
  const badgeStyle = getScoreBadgeStyle(score);
  const labelText = label === 'High' ? t('matchHigh') : t('matchMedium');

  return (
    <span className={`match-badge ${label.toLowerCase()}`} style={badgeStyle}>
      {score}% · {labelText}
    </span>
  );
}

function getScoreBadgeStyle(score: number): CSSProperties {
  if (score >= 90) {
    return { '--badge-bg': '#16d98a', '--badge-color': '#063526' } as CSSProperties;
  }
  if (score >= 80) {
    return { '--badge-bg': '#00b2a4', '--badge-color': '#042f2c' } as CSSProperties;
  }
  if (score >= 70) {
    return { '--badge-bg': '#b9d84a', '--badge-color': '#2c3106' } as CSSProperties;
  }
  if (score >= 60) {
    return { '--badge-bg': '#f5c542', '--badge-color': '#3d2b03' } as CSSProperties;
  }
  if (score >= 50) {
    return { '--badge-bg': '#f08a24', '--badge-color': '#ffffff' } as CSSProperties;
  }
  return { '--badge-bg': '#d93d32', '--badge-color': '#ffffff' } as CSSProperties;
}

export function PotentialBadge({ jobTitle, candidateName }: { jobTitle?: string; candidateName?: string }) {
  const { language, t } = useLanguage();
  const subject = candidateName
    ? (language === 'vi' ? `hồ sơ ${candidateName}` : `${candidateName}'s profile`)
    : (language === 'vi' ? 'hồ sơ đang xem' : 'the current profile');
  const context = jobTitle
    ? (language === 'vi' ? `${subject} có tín hiệu tiềm năng với JD “${jobTitle}”.` : `${subject} shows potential for “${jobTitle}”.`)
    : (language === 'vi' ? `${subject} có tín hiệu tiềm năng với JD đang xem.` : `${subject} shows potential for the selected job.`);
  return <span className="potential-badge" tabIndex={0} title={context} aria-label={`${t('potential')}: ${context}`}><Sparkles size={14} aria-hidden="true" />{t('potential')}</span>;
}

export function ReasonChips({ reasons }: { reasons: string[] }) {
  return (
    <div className="chips">
      {[...new Set(reasons)].map((reason) => (
        <span key={reason}>{reason}</span>
      ))}
    </div>
  );
}
