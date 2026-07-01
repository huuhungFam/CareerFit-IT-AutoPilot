import type { CSSProperties } from 'react';
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

export function PotentialBadge() {
  const { t } = useLanguage();
  return <span className="potential-badge">{t('potential')}</span>;
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
